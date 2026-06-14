const { login, register, me, logout, forgotPassword, resetPassword } = require('./auth/handlers/authHandler');

// Export all auth controller functions
module.exports = {
  login,
  register,
  me,
  logout,
  forgotPassword,
  resetPassword
};