const express = require("express");
const router = express.Router();
const { protect, admin } = require("../../middleware/authMiddleware");
const User = require("../../models/user");
const { createAccount: createAccountService } = require("../../controllers/account/services/accountService");
const {
  createNotification,
} = require("../../controllers/notificationController");
const { logActivity } = require("../../services/activityLogService");
const { invalidateAllUsers } = require("../../services/userCacheService");
const { BANK_NAME } = require("../../config/bankConfig");

router.use(protect);
router.use(admin);

router.post("/user-account", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      address,
      dateOfBirth,
      accountType,
      initialDeposit,
    } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: password || undefined,
      phone,
      address,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      role: "user",
    });

    const accountResult = await createAccountService(
      user._id,
      accountType || "checking",
      initialDeposit || 0,
      BANK_NAME,
      name,
      req.user._id,
    );
    if (!accountResult.success) {
      await User.findByIdAndDelete(user._id);
      return res.status(400).json({ message: accountResult.error || accountResult.message });
    }
    const account = accountResult.account;

    await createNotification(
      user._id,
      "info",
      `Welcome to ${BANK_NAME}, ${name}! Your ${accountType || "checking"} account has been created successfully.`,
    );

    await logActivity({
      userId: req.user._id,
      action: "Create User and Account",
      metadata: { createdUser: user._id, createdAccount: account._id },
    });

    await invalidateAllUsers();

    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      account: {
        _id: account._id,
        type: account.type,
        accountNumber: account.accountNumber,
      },
    });
  } catch (error) {
    console.error("Admin create user+account error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
