const User = require('../../../models/user');

// Validate login input
const validateLoginInput = (email, password) => {
  if (!email || !password) {
    return {
      isValid: false,
      message: 'Please provide email and password'
    };
  }
  return {
    isValid: true
  };
};

// Validate password reset input
const validatePasswordResetInput = (email) => {
  if (!email) {
    return {
      isValid: false,
      message: 'Please provide email'
    };
  }
  return {
    isValid: true
  };
};

// Validate new password input
const validateNewPasswordInput = (password) => {
  if (!password) {
    return {
      isValid: false,
      message: 'Please provide new password'
    };
  }
  return {
    isValid: true
  };
};

module.exports = {
  validateLoginInput,
  validatePasswordResetInput,
  validateNewPasswordInput
};