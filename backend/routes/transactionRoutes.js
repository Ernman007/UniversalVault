const express = require('express');
const router = express.Router();
const { createTransaction, getTransactions, getAllTransactions, getTransactionsByUserId, updateTransactionStatus, getTransactionByRequestId, getTransactionById, createCardTransaction, cancelTransactionRequestAndReturnFunds, getAllAccounts } = require('../controllers/transaction');
const { protect } = require('../middleware/authMiddleware');
router.use(protect);
router.post('/', createTransaction);
router.get('/', getTransactions);
router.get('/all', getAllTransactions);
router.get('/user/:userId', getTransactionsByUserId);
router.get('/by-request/:requestId', getTransactionByRequestId);
router.get('/:id', getTransactionById);
router.put('/:transactionId/status', updateTransactionStatus);
router.post('/card', createCardTransaction);
router.post('/cancel-transfer', cancelTransactionRequestAndReturnFunds);
router.get('/accounts', getAllAccounts);

module.exports = router;
