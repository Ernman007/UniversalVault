const User = require("../../../models/user");
const { createAccount } = require("../../account/services/accountService");
const { sendWelcomeEmail } = require("../../transfer-request/providers/emailProvider");
const { BANK_NAME } = require("../../../config/bankConfig");
const logger = require("../../../utils/logger");

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const buildCaseInsensitiveEmailQuery = (email) => ({
  email: { $regex: new RegExp(`^${escapeRegex(normalizeEmail(email))}$`, "i") },
});

// Handle user registration
const handleRegister = async (userData, accountData) => {
  const { name, email, password, phone, address, dateOfBirth, ssn } = userData;
  const { type, initialDeposit } = accountData;
  const normalizedEmail = normalizeEmail(email);

  // Check if user already exists
  const userExists = await User.findOne(buildCaseInsensitiveEmailQuery(normalizedEmail));
  if (userExists) {
    return {
      success: false,
      message: "User already exists with this email",
    };
  }

  // Create user
  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    phone,
    address,
    dateOfBirth,
    ssn,
  });

  if (!user) {
    return {
      success: false,
      message: "Invalid user data",
    };
  }

  // Create initial account(s)
  if (type === "both") {
    await createAccount(
      user._id,
      "checking",
      initialDeposit || 0,
      BANK_NAME,
      name,
      user._id,
    );
    await createAccount(user._id, "savings", 0, BANK_NAME, name, user._id);
  } else {
    await createAccount(
      user._id,
      type || "checking",
      initialDeposit || 0,
      BANK_NAME,
      name,
      user._id,
    );
  }

  // Reload user to get accounts populated
  const populatedUser = await User.findById(user._id).populate("accounts");
// Send welcome email (asynchronous, don't block registration)
  sendWelcomeEmail(populatedUser).catch(err => {
    logger.error("auth.handle_register.welcome_email_failed", {
      userId: populatedUser._id,
      error: err.message
    });
  });

  
  return {
    success: true,
    user: {
      _id: populatedUser._id,
      name: populatedUser.name,
      email: populatedUser.email,
      role: populatedUser.role,
      accounts: populatedUser.accounts,
    },
  };
};

// Handle user login
const handleLogin = async (email, password, ip) => {
  const normalizedEmail = normalizeEmail(email);
  // Find user and populate accounts, excluding password from selection
  const user = await User.findOne(buildCaseInsensitiveEmailQuery(normalizedEmail))
    .select("+password")
    .populate("accounts");

  // Check if user exists and password is correct
  if (!user || !(await user.matchPassword(password))) {
    logger.warn("auth.handle_login.failed", {
      hasIp: Boolean(ip),
    });
    return {
      success: false,
      message: "Invalid email or password",
    };
  }

  // Check if user account is active
  if (user.status === "inactive") {
    logger.warn("auth.handle_login.inactive_account", {
      userId: user._id,
    });
    return {
      success: false,
      message: "Account is inactive. Please contact support.",
    };
  }

  // Remove password from output
  user.password = undefined;
  return {
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accounts: user.accounts,
    },
  };
};

// Handle password reset request
const handlePasswordResetRequest = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne(buildCaseInsensitiveEmailQuery(normalizedEmail));

  if (!user) {
    return {
      success: false,
      message: "No user found with that email",
    };
  }

  // Generate reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  return {
    success: true,
    message: "Password reset token sent to email",
    resetToken,
  };
};

// Handle password reset
const handlePasswordReset = async (hashedToken, password) => {
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return {
      success: false,
      message: "Token is invalid or has expired",
    };
  }

  // Set new password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return {
    success: true,
    message: "Password reset successful",
  };
};

module.exports = {
  handleRegister,
  handleLogin,
  handlePasswordResetRequest,
  handlePasswordReset,
};
