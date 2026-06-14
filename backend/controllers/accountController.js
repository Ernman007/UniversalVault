const { 
  createAccount,
  getAccounts,
  getAccountById,
  getAccountsByUserId,
  getCurrentlyActiveAccountCount,
  getAllAccounts,
  getAccountCountByDateRange,
  getBalanceChange,
  searchAccounts
} = require('./account/handlers/accountHandler');

// Export all account controller functions
module.exports = {
  createAccount,
  getAccounts,
  getAccountById,
  getAccountsByUserId,
  getCurrentlyActiveAccountCount,
  getAllAccounts,
  getAccountCountByDateRange,
  getBalanceChange,
  searchAccounts
};