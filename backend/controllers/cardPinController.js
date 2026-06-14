const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { createNotification } = require('./notificationController');
const { logActivity } = require('../services/activityLogService');

// PIN session token generation (short-lived, 10 minutes)
const generatePinSessionToken = (userId) => {
  return jwt.sign(
    { id: userId, pinVerified: true, type: 'card_pin_session' },
    process.env.JWT_SECRET,
    { expiresIn: '10m', issuer: 'BankingSystem', audience: 'BankingSystemUsers' }
  );
};

// Validate PIN format (4-6 digits, no sequential patterns)
const validatePinFormat = (pin) => {
  if (!pin || typeof pin !== 'string') {
    return { isValid: false, message: 'PIN is required' };
  }
  
  if (!/^\d{4,6}$/.test(pin)) {
    return { isValid: false, message: 'PIN must be 4-6 digits' };
  }
  
  // Block common weak patterns
  const weakPatterns = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123', '3210'];
  if (weakPatterns.includes(pin)) {
    return { isValid: false, message: 'PIN is too weak. Choose a different PIN' };
  }
  
  return { isValid: true };
};

// Calculate lockout duration based on failed attempts
const getLockoutDuration = (attempts) => {
  if (attempts <= 3) return 0;
  if (attempts <= 5) return 5 * 60 * 1000; // 5 minutes
  if (attempts <= 7) return 15 * 60 * 1000; // 15 minutes
  return 60 * 60 * 1000; // 1 hour
};

const shouldExposeResetToken = () => process.env.NODE_ENV !== 'production'
  && process.env.CARD_PIN_INCLUDE_RESET_TOKEN === 'true';

// @desc    Setup card PIN (first time)
// @route   POST /api/auth/card-pin/setup
// @access  Private
exports.setupCardPin = async (req, res) => {
  const { pin, confirmPin } = req.body;
  const userId = req.user._id;

  console.log('[CARD-PIN] Setup request:', { userId, correlationId: req.correlationId });

  try {
    // Validate PIN format
    const validation = validatePinFormat(pin);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message });
    }

    // Check PIN confirmation
    if (pin !== confirmPin) {
      return res.status(400).json({ message: 'PINs do not match' });
    }

    // Get user with cardPin field
    const user = await User.findById(userId).select('+cardPin');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if PIN already set
    if (user.cardPin) {
      return res.status(400).json({ message: 'Card PIN already set. Use change PIN endpoint instead.' });
    }

    // Set PIN (will be hashed by pre-save hook)
    user.cardPin = pin;
    user.failedPinAttempts = 0;
    user.pinLockedUntil = undefined;
    await user.save();

    // Generate PIN session token
    const pinSessionToken = generatePinSessionToken(userId);

    // Log activity
    await logActivity({
      userId,
      action: 'Card PIN Setup',
      metadata: { method: 'initial_setup' },
      correlationId: req.correlationId
    });

    // Create notification
    await createNotification(userId, 'success', 'Your card PIN has been set successfully.');

    console.log('[CARD-PIN] Setup successful:', { userId, correlationId: req.correlationId });

    res.status(200).json({
      success: true,
      message: 'Card PIN set successfully',
      pinSessionToken
    });
  } catch (error) {
    console.error('[CARD-PIN] Setup error:', error);
    res.status(500).json({ message: 'Error setting card PIN' });
  }
};

// @desc    Verify card PIN
// @route   POST /api/auth/card-pin/verify
// @access  Private
exports.verifyCardPin = async (req, res) => {
  const { pin } = req.body;
  const userId = req.user._id;

  console.log('[CARD-PIN] Verify request:', { userId, correlationId: req.correlationId });

  try {
    // Get user with PIN fields
    const user = await User.findById(userId).select('+cardPin +failedPinAttempts +pinLockedUntil');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if PIN is set
    if (!user.cardPin) {
      return res.status(400).json({ 
        message: 'Card PIN not set. Please set up your PIN first.',
        pinNotSet: true
      });
    }

    // Check if locked out
    if (user.isPinLocked()) {
      const remainingTime = Math.ceil(user.getRemainingLockTime() / 1000 / 60);
      console.log('[CARD-PIN] Account locked:', { userId, remainingTime, correlationId: req.correlationId });
      
      return res.status(429).json({
        message: `Too many failed attempts. Try again in ${remainingTime} minute(s).`,
        locked: true,
        remainingMinutes: remainingTime
      });
    }

    // Verify PIN
    const isMatch = await user.matchCardPin(pin);

    if (!isMatch) {
      // Increment failed attempts
      user.failedPinAttempts += 1;
      
      // Check if should lock
      const lockoutDuration = getLockoutDuration(user.failedPinAttempts);
      if (lockoutDuration > 0) {
        user.pinLockedUntil = Date.now() + lockoutDuration;
        
        // Notify user of lockout
        await createNotification(userId, 'warning', 'Your card PIN has been locked due to too many failed attempts. Try again later.');
        
        // Log security event
        await logActivity({
          userId,
          action: 'Card PIN Locked',
          metadata: { 
            failedAttempts: user.failedPinAttempts,
            lockoutDuration: lockoutDuration / 1000 / 60 + ' minutes'
          },
          correlationId: req.correlationId
        });
      }
      
      await user.save();

      console.log('[CARD-PIN] Verification failed:', { 
        userId, 
        attempts: user.failedPinAttempts, 
        correlationId: req.correlationId 
      });

      return res.status(401).json({
        message: 'Incorrect PIN',
        attemptsRemaining: Math.max(0, 5 - user.failedPinAttempts)
      });
    }

    // Reset failed attempts on success
    user.failedPinAttempts = 0;
    user.pinLockedUntil = undefined;
    await user.save();

    // Generate PIN session token
    const pinSessionToken = generatePinSessionToken(userId);

    // Log activity
    await logActivity({
      userId,
      action: 'Card PIN Verified',
      metadata: { method: 'verification' },
      correlationId: req.correlationId
    });

    console.log('[CARD-PIN] Verification successful:', { userId, correlationId: req.correlationId });

    res.status(200).json({
      success: true,
      message: 'PIN verified successfully',
      pinSessionToken
    });
  } catch (error) {
    console.error('[CARD-PIN] Verify error:', error);
    res.status(500).json({ message: 'Error verifying PIN' });
  }
};

// @desc    Change card PIN
// @route   PUT /api/auth/card-pin/change
// @access  Private
exports.changeCardPin = async (req, res) => {
  const { currentPin, newPin, confirmNewPin } = req.body;
  const userId = req.user._id;

  console.log('[CARD-PIN] Change request:', { userId, correlationId: req.correlationId });

  try {
    // Validate new PIN format
    const validation = validatePinFormat(newPin);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message });
    }

    // Check new PIN confirmation
    if (newPin !== confirmNewPin) {
      return res.status(400).json({ message: 'New PINs do not match' });
    }

    // Get user with PIN fields
    const user = await User.findById(userId).select('+cardPin +failedPinAttempts +pinLockedUntil');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if PIN is set
    if (!user.cardPin) {
      return res.status(400).json({ 
        message: 'Card PIN not set. Please set up your PIN first.',
        pinNotSet: true
      });
    }

    // Check if locked out
    if (user.isPinLocked()) {
      const remainingTime = Math.ceil(user.getRemainingLockTime() / 1000 / 60);
      return res.status(429).json({
        message: `Account locked. Try again in ${remainingTime} minute(s).`,
        locked: true
      });
    }

    // Verify current PIN
    const isMatch = await user.matchCardPin(currentPin);
    if (!isMatch) {
      user.failedPinAttempts += 1;
      const lockoutDuration = getLockoutDuration(user.failedPinAttempts);
      if (lockoutDuration > 0) {
        user.pinLockedUntil = Date.now() + lockoutDuration;
      }
      await user.save();

      return res.status(401).json({
        message: 'Current PIN is incorrect',
        attemptsRemaining: Math.max(0, 5 - user.failedPinAttempts)
      });
    }

    // Set new PIN (will be hashed by pre-save hook)
    user.cardPin = newPin;
    user.failedPinAttempts = 0;
    user.pinLockedUntil = undefined;
    await user.save();

    // Generate new PIN session token
    const pinSessionToken = generatePinSessionToken(userId);

    // Log activity
    await logActivity({
      userId,
      action: 'Card PIN Changed',
      metadata: { method: 'change' },
      correlationId: req.correlationId
    });

    // Create notification
    await createNotification(userId, 'success', 'Your card PIN has been changed successfully.');

    console.log('[CARD-PIN] Change successful:', { userId, correlationId: req.correlationId });

    res.status(200).json({
      success: true,
      message: 'Card PIN changed successfully',
      pinSessionToken
    });
  } catch (error) {
    console.error('[CARD-PIN] Change error:', error);
    res.status(500).json({ message: 'Error changing card PIN' });
  }
};

// @desc    Request PIN reset (email)
// @route   POST /api/auth/card-pin/reset-request
// @access  Private
exports.requestPinReset = async (req, res) => {
  const userId = req.user._id;

  console.log('[CARD-PIN] Reset request:', { userId, correlationId: req.correlationId });

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token
    const resetToken = user.createCardPinResetToken();
    await user.save();

    // TODO: Send email with reset link
    // For now, return token in development
    const resetUrl = `${process.env.CLIENT_URL}/reset-card-pin/${resetToken}`;

    // Log activity
    await logActivity({
      userId,
      action: 'Card PIN Reset Requested',
      metadata: { email: user.email },
      correlationId: req.correlationId
    });

    console.log('[CARD-PIN] Reset token generated:', { userId, correlationId: req.correlationId });

    res.status(200).json({
      success: true,
      message: 'PIN reset email sent. Check your email for instructions.',
      ...(shouldExposeResetToken() && { resetToken, resetUrl })
    });
  } catch (error) {
    console.error('[CARD-PIN] Reset request error:', error);
    res.status(500).json({ message: 'Error requesting PIN reset' });
  }
};

// @desc    Reset PIN with token
// @route   POST /api/auth/card-pin/reset
// @access  Public (uses reset token)
exports.resetCardPin = async (req, res) => {
  const { resetToken, newPin, confirmNewPin } = req.body;

  console.log('[CARD-PIN] Reset with token:', { correlationId: req.correlationId });

  try {
    // Validate new PIN format
    const validation = validatePinFormat(newPin);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message });
    }

    // Check PIN confirmation
    if (newPin !== confirmNewPin) {
      return res.status(400).json({ message: 'PINs do not match' });
    }

    // Hash token for comparison
    const crypto = require('crypto');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Find user by reset token
    const user = await User.findOne({
      cardPinResetToken: hashedToken,
      cardPinResetExpires: { $gt: Date.now() }
    }).select('+cardPinResetToken +cardPinResetExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Set new PIN
    user.cardPin = newPin;
    user.cardPinResetToken = undefined;
    user.cardPinResetExpires = undefined;
    user.failedPinAttempts = 0;
    user.pinLockedUntil = undefined;
    await user.save();

    // Log activity
    await logActivity({
      userId: user._id,
      action: 'Card PIN Reset',
      metadata: { method: 'token_reset' },
      correlationId: req.correlationId
    });

    // Create notification
    await createNotification(user._id, 'success', 'Your card PIN has been reset successfully.');

    console.log('[CARD-PIN] Reset successful:', { userId: user._id, correlationId: req.correlationId });

    res.status(200).json({
      success: true,
      message: 'Card PIN reset successfully'
    });
  } catch (error) {
    console.error('[CARD-PIN] Reset error:', error);
    res.status(500).json({ message: 'Error resetting card PIN' });
  }
};

// @desc    Check PIN status
// @route   GET /api/auth/card-pin/status
// @access  Private
exports.getPinStatus = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId).select('+cardPin +failedPinAttempts +pinLockedUntil');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const status = {
      hasPin: !!user.cardPin,
      isLocked: user.isPinLocked(),
      failedAttempts: user.failedPinAttempts || 0
    };

    if (status.isLocked) {
      status.remainingLockMinutes = Math.ceil(user.getRemainingLockTime() / 1000 / 60);
    }

    res.status(200).json(status);
  } catch (error) {
    console.error('[CARD-PIN] Status error:', error);
    res.status(500).json({ message: 'Error checking PIN status' });
  }
};
