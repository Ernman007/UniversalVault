const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
  setupCardPin,
  verifyCardPin,
  changeCardPin,
  requestPinReset,
  resetCardPin,
  getPinStatus
} = require('../controllers/cardPinController');
const { protect } = require('../middleware/authMiddleware');

// Rate limiter for PIN verification (5 attempts per 15 minutes)
const pinVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    message: 'Too many PIN verification attempts. Please try again later.',
    code: 'PIN_RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for PIN setup/change (10 per hour)
const pinSetupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  skipSuccessfulRequests: true,
  message: {
    message: 'Too many PIN setup attempts. Please try again later.',
    code: 'PIN_SETUP_RATE_LIMITED'
  }
});

// Rate limiter for PIN reset requests (3 per hour)
const pinResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    message: 'Too many PIN reset requests. Please try again later.',
    code: 'PIN_RESET_RATE_LIMITED'
  }
});

// @route   POST /api/auth/card-pin/reset
// @desc    Reset PIN with token from email
// @access  Public (uses reset token, not auth)
router.post('/reset', resetCardPin);

// All remaining routes require authentication
router.use(protect);

// @route   GET /api/auth/card-pin/status
// @desc    Check if user has PIN set and its status
// @access  Private
router.get('/status', getPinStatus);

// @route   POST /api/auth/card-pin/setup
// @desc    Setup card PIN for the first time
// @access  Private
router.post('/setup', pinSetupLimiter, setupCardPin);

// @route   POST /api/auth/card-pin/verify
// @desc    Verify card PIN and get session token
// @access  Private
router.post('/verify', pinVerifyLimiter, verifyCardPin);

// @route   PUT /api/auth/card-pin/change
// @desc    Change existing card PIN
// @access  Private
router.put('/change', pinVerifyLimiter, changeCardPin);

// @route   POST /api/auth/card-pin/reset-request
// @desc    Request PIN reset via email
// @access  Private
router.post('/reset-request', pinResetLimiter, requestPinReset);

module.exports = router;
