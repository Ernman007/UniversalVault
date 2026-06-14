const User = require("../models/user");
const { createNotification } = require("./notificationController");
const { logActivity } = require("../services/activityLogService");
const { BANK_NAME } = require("../config/bankConfig");
const {
  getAllUsersCached,
  getUserCountByDateRangeCached,
  getActiveUserCountCached,
  invalidateAllUsers,
} = require("../services/userCacheService");

exports.createUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  const userExists = await User.findOne({ email });
  if (userExists)
    return res.status(400).json({ message: "User already exists" });
  const user = await User.create({ name, email, password, role });

  // Create a notification using the centralized function
  await createNotification(
    user._id,
    "info",
    `Welcome to ${BANK_NAME}, ${name}! Your account has been created successfully.`,
  );

  await logActivity({
    userId: req.user._id,
    action: "Create User",
    metadata: { createdUser: user._id },
  });
  await invalidateAllUsers();
  res.status(201).json(user);
};

exports.getUsers = async (req, res) => {
  const users = await getAllUsersCached();
  res.json(users);
};

exports.getUserById = async (req, res) => {
  console.log("[USER] getUserById request:", {
    paramsId: req.params.id,
    userId: req.user?._id,
    userRole: req.user?.role,
  });

  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      console.log("[USER] getUserById - User not found:", req.params.id);
      return res.status(404).json({ message: "User not found" });
    }
    // Convert Mongoose document to plain object to avoid $__ and _doc wrapper issues
    const userObj = user.toObject();
    console.log("[USER] getUserById - Found user:", {
      id: userObj._id,
      name: userObj.name,
      email: userObj.email,
      role: userObj.role,
      status: userObj.status,
    });
    res.json(userObj);
  } catch (error) {
    console.error("[USER] getUserById error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  await user.deleteOne();
  await logActivity({
    userId: req.user._id,
    action: "Delete User",
    metadata: { deletedUser: req.params.id },
  });
  await invalidateAllUsers();
  res.json({ message: "User removed" });
};

exports.getUserCountByDateRange = async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const count = await getUserCountByDateRangeCached({ startDate, endDate });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getActiveUserCount = async (req, res) => {
  try {
    const count = await getActiveUserCountCached();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  // Admin-only operation - middleware should have already checked, but verify again
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Not authorized. Admin access required." });
  }

  const { name, email, role, status, password } = req.body;
  const userId = req.params.id;

  console.log("[USER] Update user request:", {
    userId,
    adminId: req.user._id,
    updates: { name, email, role, status, hasPassword: !!password },
  });

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if email is being changed to one that already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (status) user.status = status;
    if (password) user.password = password; // Will be hashed by pre-save middleware

    await user.save();
    await invalidateAllUsers();

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: "Update User",
      metadata: { updatedUser: userId, updates: { name, email, role, status } },
    });

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    console.log("[USER] User updated successfully:", { userId });
    res.json(userResponse);
  } catch (error) {
    console.error("[USER] Update error:", error.message);
    res.status(500).json({ message: error.message });
  }
};
