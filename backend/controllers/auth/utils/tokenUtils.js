const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Enhanced token generation with security improvements
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
    issuer: 'BankingSystem',
    audience: 'BankingSystemUsers'
  });
};

// Hash token for password reset
const hashToken = (token) => {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
};

module.exports = {
  generateToken,
  hashToken
};