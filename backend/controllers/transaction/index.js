const {
  handleCreateTransaction,
  handleGetTransactions,
  handleGetAllTransactions,
  handleGetTransactionsByUserId,
  handleUpdateTransactionStatus,
  handleGetTransactionByRequestId,
  handleGetTransactionById,
  handleCreateCardTransaction,
  handleCancelTransactionRequestAndReturnFunds,
  handleGetAllAccounts
} = require('./handlers');

// Export all handler functions
module.exports = {
  createTransaction: handleCreateTransaction,
  getTransactions: handleGetTransactions,
  getAllTransactions: handleGetAllTransactions,
  getTransactionsByUserId: handleGetTransactionsByUserId,
  updateTransactionStatus: handleUpdateTransactionStatus,
  getTransactionByRequestId: handleGetTransactionByRequestId,
  getTransactionById: handleGetTransactionById,
  createCardTransaction: handleCreateCardTransaction,
  cancelTransactionRequestAndReturnFunds: handleCancelTransactionRequestAndReturnFunds,
  getAllAccounts: handleGetAllAccounts
};