const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const swaggerUi = require("swagger-ui-express");
const multer = require("multer");

const { swaggerSpec, swaggerUiOptions } = require("./config/swagger");
const { BANK_NAME, BANK_CODE } = require("./config/bankConfig");

// Import routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const accountRoutes = require("./routes/accountRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const activityLogRoutes = require("./routes/activityLogRoutes");
const activityRoutes = require("./routes/activityRoutes");
const transferRequestRoutes = require("./routes/transferRequestRoutes");
const supportMessageRoutes = require("./routes/supportMessageRoutes");
const cardRoutes = require("./routes/cardRoutes");
const requestCardRoutes = require("./routes/requestCardRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const adminLoanRoutes = require("./routes/admin/loanRoutes");
const loanRoutes = require("./routes/loan/loanRoutes");
const adminDashboardRoutes = require("./routes/admin/dashboardRoutes");
const adminUserRoutes = require("./routes/admin/userRoutes");
const adminCardRoutes = require("./routes/admin/cardRoutes");
const beneficiaryRoutes = require("./routes/beneficiaryRoutes");
const cardPinRoutes = require("./routes/cardPinRoutes");
const apiEnvelopeMiddleware = require("./middleware/apiEnvelopeMiddleware");
const correlationMiddleware = require("./middleware/correlationMiddleware");

const app = express();

// Trust proxy - Add this before any middleware
app.set("trust proxy", 1);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:4200"];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    console.log(
      "CORS Check - Origin:",
      origin,
      "Allowed Origins:",
      allowedOrigins,
    );
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      console.log("CORS Rejected - Origin not in allowed list");
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: [
    "Authorization",
    "Content-Type",
    "Origin",
    "Accept",
    "X-Card-Pin-Token",
  ],
  exposedHeaders: ["Content-Length", "X-Requested-With", "X-Correlation-ID"],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400, // 24 hours
};

// Rate limiting with proxy configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs (SPAs make many parallel calls)
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  skipSuccessfulRequests: false,
});

// Apply CORS middleware before other middleware
app.use(cors(corsOptions));

// Apply security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  }),
);

// Apply other middleware
app.use(compression());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Local multer config removed - using GridFS instead

// Body parser configuration with security enhancements
app.use(
  bodyParser.json({
    limit: "10mb",
    strict: true,
  }),
);
app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "10mb",
  }),
);

// Apply rate limiting to all requests
app.use(limiter);

// Apply correlation ID middleware for request tracing
app.use(correlationMiddleware);

// Swagger documentation
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerUiOptions),
);

// API Info endpoint
app.get("/", (req, res) => {
  res.json({
    name: "Banking System API",
    frontendUrl: "https://banking.spanexx.com",
    adminUrl: "https://spanexx.com",
    version: "1.0.0",
    description:
      "A comprehensive banking system API with real-time notifications",
    status: "online",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    features: [
      "JWT Authentication",
      "Role-based Access Control",
      "Real-time Notifications via WebSocket",
      "Rate Limiting",
      "CORS Security",
      "File Upload Support",
      "MongoDB Integration",
      "Activity Logging",
    ],
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
  });
});

const v1Routes = require("./routes/v1Routes");

// Routes
app.use("/api", apiEnvelopeMiddleware);

// Public app config — exposes BANK_NAME and BANK_CODE from the .env file
app.get("/api/config", (req, res) => {
  res.json({ bankName: BANK_NAME, bankCode: BANK_CODE });
});
app.use("/api/v1", v1Routes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/transfer-requests", transferRequestRoutes);
app.use("/api/support", supportMessageRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/card-requests", requestCardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/admin", adminLoanRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/cards", adminCardRoutes);
app.use("/api/beneficiaries", beneficiaryRoutes);
app.use("/api/auth/card-pin", cardPinRoutes);

// Serve files from GridFS (persistent storage)
app.get("/uploads/:filename", async (req, res) => {
  try {
    const { getBucket } = require("./config/gridfs");
    const bucket = getBucket();

    const filename = req.params.filename;
    console.log("[Uploads] Request for file:", filename);

    const files = await bucket.find({ filename }).toArray();

    if (!files || files.length === 0) {
      console.log("[Uploads] File not found:", filename);
      return res.status(404).json({ message: "File not found" });
    }

    console.log("[Uploads] File found:", {
      filename,
      contentType: files[0].contentType,
      length: files[0].length,
      uploadDate: files[0].uploadDate,
    });

    // Set appropriate content type if known, or let browser decide
    res.set("Content-Type", files[0].contentType || "image/jpeg");
    res.set("Cache-Control", "public, max-age=31536000"); // Cache for 1 year

    const downloadStream = bucket.openDownloadStreamByName(filename);
    downloadStream.on("error", (err) => {
      console.error("[Uploads] Download stream error:", err);
    });
    downloadStream.pipe(res);
  } catch (error) {
    console.error("[Uploads] GridFS Error:", error);
    res.status(500).json({ message: "Error retrieving file" });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  const code =
    err.code ||
    err.errorCode ||
    (statusCode === 401
      ? "AUTH_UNAUTHORIZED"
      : statusCode === 403
        ? "AUTH_FORBIDDEN"
        : statusCode === 404
          ? "RESOURCE_NOT_FOUND"
          : statusCode === 400
            ? "VALIDATION_ERROR"
            : "INTERNAL_ERROR");
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : err.message;
  res.status(statusCode).json({
    message,
    code,
    details:
      process.env.NODE_ENV !== "production" ? { stack: err.stack } : undefined,
  });
});

module.exports = {
  app,
  corsOptions,
};
