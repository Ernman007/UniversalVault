require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const { app, corsOptions } = require("./app");
const User = require("./models/user");
const SupportTicket = require("./models/supportTicket");

const server = http.createServer(app);

// Socket.IO setup with security
const io = new Server(server, {
  cors: corsOptions,
  path: "/socket.io",
  serveClient: false,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

// Create notifications namespace
const notificationsNamespace = io.of("/notifications");
const supportNamespace = io.of("/support");

// WebSocket connection handling for notifications
notificationsNamespace.on("connection", (socket) => {
  console.log("Client connected to notifications namespace");

  socket.on("authenticate", async (token) => {
    try {
      if (typeof token !== "string" || !token.trim()) {
        return socket.emit("auth_error", { message: "Invalid token payload" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("_id role");
      if (!user) {
        return socket.emit("auth_error", { message: "User not found" });
      }

      const userId = user._id.toString();
      socket.userData = { userId, role: user.role };
      socket.join(`user_${userId}`);
      console.log(`User ${userId} authenticated and joined room`);
    } catch (error) {
      console.error("WebSocket auth error:", error.message);
      socket.emit("auth_error", { message: "Invalid token" });
    }
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });

  socket.on("disconnect", (reason) => {
    console.log("Client disconnected, reason:", reason);
  });
});

supportNamespace.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || !token.trim()) {
      return next(new Error("Unauthorized"));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id role");
    if (!user) {
      return next(new Error("Unauthorized"));
    }
    socket.data.userId = user._id.toString();
    socket.data.role = user.role;
    next();
  } catch (error) {
    next(new Error("Unauthorized"));
  }
});

// WebSocket handling for support ticket conversations
supportNamespace.on("connection", (socket) => {
  console.log("Client connected to support namespace");

  socket.on("joinTicket", async ({ ticketId }) => {
    if (!ticketId) {
      return;
    }
    const ticket =
      await SupportTicket.findById(ticketId).select("createdBy assignee");
    if (!ticket) {
      return;
    }
    const isAdmin = socket.data.role === "admin";
    const isParticipant = [
      ticket.createdBy?.toString(),
      ticket.assignee?.toString(),
    ].includes(socket.data.userId);
    if (!isAdmin && !isParticipant) {
      return;
    }
    socket.join(`ticket_${ticketId}`);
    console.log(`Socket joined support ticket room ticket_${ticketId}`);
  });

  socket.on("leaveTicket", ({ ticketId }) => {
    if (ticketId) {
      socket.leave(`ticket_${ticketId}`);
      console.log(`Socket left support ticket room ticket_${ticketId}`);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("Support namespace client disconnected:", reason);
  });

  socket.on("error", (error) => {
    console.error("Support namespace error:", error);
  });
});

// Make io instance accessible to the rest of the app
global.app = app;
app.set("io", io);

// Start background jobs
const startAutoCloseJob = require("./jobs/ticketAutoClose");
const startTransferExpiryJob = require("./jobs/transferRequestExpiry");
startAutoCloseJob(io);
startTransferExpiryJob(io);

// Database connection with retry mechanism
const connectWithRetry = async () => {
  const maxRetries = 5;
  let retries = 0;

  const configuredMongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  const mongoUri =
    configuredMongoUri || "mongodb://127.0.0.1:27017/universalvault";

  if (!configuredMongoUri) {
    console.warn(
      "[startup] MONGO_URI is not set. Falling back to mongodb://127.0.0.1:27017/universalvault",
    );
  }

  while (retries < maxRetries) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log("MongoDB connected successfully");

      // Check/create admin user after successful connection
      const adminUser = await User.findOne({ role: "admin" });
      if (!adminUser && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
        await User.create({
          name: "Super Admin",
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD,
          role: "admin",
        });
        console.log("Admin user created successfully");
      } else if (
        adminUser &&
        process.env.ADMIN_EMAIL &&
        adminUser.email !== process.env.ADMIN_EMAIL
      ) {
        await User.updateOne(
          { _id: adminUser._id },
          { email: process.env.ADMIN_EMAIL },
        );
        console.log(
          "Admin user email updated from existing value to environment value",
        );
      }

      break;
    } catch (error) {
      retries += 1;
      console.error(
        `MongoDB connection attempt ${retries} failed:`,
        error.message,
      );
      if (retries === maxRetries) {
        console.error(
          "Max retries reached. Could not connect to MongoDB. " +
            "The server will keep running but database-dependent routes will fail.",
        );
        // Do not exit — non-DB routes like /api/config and /health stay alive
        return;
      }
      // Wait for 5 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

// Start the HTTP server immediately so /health and /api/config work
// even before (or if) MongoDB becomes available.
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Connect to MongoDB in the background
connectWithRetry();
