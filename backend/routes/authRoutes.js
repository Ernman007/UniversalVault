const express = require('express');
const router = express.Router();
const { login, register, me, logout, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Rate limiting for auth routes
const rateLimit = require('express-rate-limit');

// Login rate limiting (stricter limits)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: {
    message: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Registration rate limiting
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 registration requests per hour
  message: {
    message: 'Too many account creation attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Password reset rate limiting
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per windowMs
  message: {
    message: 'Too many password reset requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.get('/me', protect, me);
router.get('/logout', protect, logout);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.put('/reset-password/:token', resetPassword);

module.exports = router;
