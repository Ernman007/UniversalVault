const jwt = require('jsonwebtoken');
const User = require('../models/user');

/**
 * PIN Session Middleware
 * Verifies the X-Card-Pin-Token header and attaches pinSession to request
 * 
 * Use this middleware on routes that require PIN verification
 * for accessing sensitive card data
 */

// Verify PIN session token
const verifyPinSession = async (req, res, next) => {
  const pinToken = req.headers['x-card-pin-token'];

  if (!pinToken) {
    return res.status(403).json({
      message: 'PIN verification required. Please verify your PIN to access this resource.',
      code: 'PIN_SESSION_REQUIRED'
    });
  }

  try {
    // Verify the JWT
    const decoded = jwt.verify(pinToken, process.env.JWT_SECRET, {
      issuer: 'BankingSystem',
      audience: 'BankingSystemUsers'
    });

    // Check if it's a PIN session token
    if (decoded.type !== 'card_pin_session' || !decoded.pinVerified) {
      return res.status(403).json({
        message: 'Invalid PIN session token',
        code: 'INVALID_PIN_SESSION'
      });
    }

    // Verify user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Attach PIN session info to request
    req.pinSession = {
      userId: decoded.id,
      pinVerified: true,
      verifiedAt: decoded.iat * 1000, // Convert from seconds to milliseconds
      expiresAt: decoded.exp * 1000
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({
        message: 'PIN session has expired. Please verify your PIN again.',
        code: 'PIN_SESSION_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        message: 'Invalid PIN session token',
        code: 'INVALID_PIN_SESSION'
      });
    }

    console.error('[PIN-SESSION] Verification error:', error);
    return res.status(500).json({
      message: 'Error verifying PIN session',
      code: 'PIN_SESSION_ERROR'
    });
  }
};

// Optional: Check PIN session but don't require it
// Useful for routes that return different data based on PIN verification
const optionalPinSession = async (req, res, next) => {
  const pinToken = req.headers['x-card-pin-token'];

  if (!pinToken) {
    req.pinSession = null;
    return next();
  }

  try {
    const decoded = jwt.verify(pinToken, process.env.JWT_SECRET, {
      issuer: 'BankingSystem',
      audience: 'BankingSystemUsers'
    });

    if (decoded.type !== 'card_pin_session' || !decoded.pinVerified) {
      req.pinSession = null;
      return next();
    }

    req.pinSession = {
      userId: decoded.id,
      pinVerified: true,
      verifiedAt: decoded.iat * 1000,
      expiresAt: decoded.exp * 1000
    };

    next();
  } catch (error) {
    // For optional, just set to null on error
    req.pinSession = null;
    next();
  }
};

// Check if PIN session is still valid (for frontend polling)
const checkPinSessionStatus = async (req, res) => {
  const pinToken = req.headers['x-card-pin-token'];

  if (!pinToken) {
    return res.status(200).json({
      valid: false,
      message: 'No PIN session token provided'
    });
  }

  try {
    const decoded = jwt.verify(pinToken, process.env.JWT_SECRET, {
      issuer: 'BankingSystem',
      audience: 'BankingSystemUsers'
    });

    if (decoded.type !== 'card_pin_session' || !decoded.pinVerified) {
      return res.status(200).json({
        valid: false,
        message: 'Invalid PIN session token'
      });
    }

    const expiresInSeconds = decoded.exp - Math.floor(Date.now() / 1000);

    return res.status(200).json({
      valid: true,
      expiresInSeconds: Math.max(0, expiresInSeconds),
      expiresAt: new Date(decoded.exp * 1000).toISOString()
    });
  } catch (error) {
    return res.status(200).json({
      valid: false,
      message: error.name === 'TokenExpiredError' ? 'PIN session expired' : 'Invalid PIN session token'
    });
  }
};

module.exports = {
  verifyPinSession,
  optionalPinSession,
  checkPinSessionStatus
};
