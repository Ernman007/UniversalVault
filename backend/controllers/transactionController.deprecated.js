const Transaction = require('../models/transaction');
const Account = require('../models/account');
const { createNotification } = require('./notificationController');
const RequestTransfer = require('../models/requestTransfer');
const nodemailer = require('nodemailer');
const { logActivity } = require('../services/activityLogService');
const {
  getUserTransactions,
  getTransactionsByFilters,
  invalidateUserTransactions
} = require('../services/transactionCacheService');

// Configure mailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

const generateRandomId = (length = 12) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

exports.createTransaction = async (req, res) => {
  try {
    const { accountId, receiverIdentifier, type, amount, swiftCode, date, description, bankName, receiverName } = req.body;
    
    const transaction = await Transaction.createTransaction({
      accountId,
      receiverIdentifier,
      type,
      amount,
      swiftCode,
      date,
      description,
      bankName,
      receiverName,
      userId: req.user._id,
      isAdmin: req.user.role === 'admin'
    });

    // Use the centralized notification creation function
    await createNotification(
      req.user._id,
      'success',
      `Transaction of ${amount} ${transaction.currency} to ${receiverName || receiverIdentifier} completed successfully.`
    );

    await logActivity({
      userId: req.user._id,
      action: 'Create Transaction',
      metadata: {
        transaction: transaction._id,
        type,
        amount,
        description: description || null
      }
    });

    await invalidateUserTransactions(req.user._id);

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Transaction creation error:', error);
    res.status(400).json({ message: error.message });
  }
};

const getTransactions = async (req, res) => {
  const transactions = await getUserTransactions(req.user._id);
  res.json(transactions);
};

const getAllTransactions = async (req, res) => {
  const { type, startDate, endDate } = req.query;
  const filter = {};

  if (type) {
    filter.type = type;
  }

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      filter.date.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.date.$lte = new Date(endDate);
    }
  }

  const txns = await Transaction.find(filter).populate('toAccount', 'accountNumber').populate('fromAccount', 'accountNumber').sort('-date'); // Fetch all transactions and populate account numbers
  res.json(txns);
};

const getTransactionsByUserId = async (req, res) => {
  const { userId } = req.params; // Assuming userId is passed as a URL parameter
  const { startDate, endDate } = req.query; // Get startDate and endDate from query parameters

  try {
    const txns = await getTransactionsByFilters(userId, { startDate, endDate });

    // For international transfers where toAccount is not populated,
    // manually add the accountNumber to the toAccount field for frontend display
    const modifiedTxns = txns.map(txn => {
      const base = { ...txn };
      if (!base.toAccount && base.accountNumber) {
        base.toAccount = { accountNumber: base.accountNumber };
      }
      return base;
    });

    res.json(modifiedTxns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTransactionStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const validStatuses = ['Pending', 'Confirmed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status provided' });
    }

    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    transaction.status = status;
    await transaction.save();

    res.status(200).json({ message: 'Transaction status updated successfully', transaction });
  } catch (error) {
    res.status(500).json({ message: 'Error updating transaction status', error: error.message });
  }
};

const getAllAccounts = async (req, res) => {
  const accounts = await Account.find(); // Fetch all accounts
  res.json(accounts);
};

const getTransactionByRequestId = async (req, res) => {
  try {
    const { requestId } = req.params;
    const transaction = await Transaction.findOne({ requestTransferId: requestId })
      .populate('toAccount', 'accountNumber')
      .populate('fromAccount', 'accountNumber');
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ message: error.message });
  }
};

const CardTransaction = require('../models/cardTransaction'); // Require the new model
const Card = require('../models/card'); // Require Card model

const createCardTransaction = async (req, res) => {
  try {
    const { cardNumber, expiryDate, cvv, amount, merchantDetails, transactionType } = req.body;

    // Basic validation
    if (!cardNumber || !expiryDate || !cvv || !amount || !merchantDetails || !transactionType) {
      return res.status(400).json({ message: 'Missing required transaction details' });
    }

    // Find the card and its linked account
    // Parse expiryDate (MM/YY)
    const [month, year] = expiryDate.split('/').map(Number);
    // Construct the full year (assuming 2000s)
    const fullYear = 2000 + year;

    // Create a date range for the expiry month and year
    const startDate = new Date(fullYear, month - 1, 1); // Month is 0-indexed
    const endDate = new Date(fullYear, month, 0); // Last day of the month

    const card = await Card.findOne({
      cardNumber,
      cvv,
      expiryDate: {
        $gte: startDate,
        $lte: endDate
      }
    }).populate('account'); // Corrected populate path

    if (!card) {
      return res.status(404).json({ message: 'Invalid card details or expired card' });
    }

    if (!card.account) { // Corrected check for populated account
      return res.status(404).json({ message: 'Account linked to card not found' });
    }

    // Check for sufficient funds in the linked account
    if (card.account.balance < amount) {
      return res.status(400).json({ message: 'Insufficient funds in linked account' });
    }

    // Create the new card transaction
    const cardTransaction = new CardTransaction({
      card: card._id,
      account: card.account._id,
      amount,
      merchantDetails,
      transactionType,
      date: new Date(), // Use current date for the transaction
      transactionId: generateRandomId(), // Generate and assign transactionId
    });

    await cardTransaction.save();

    // Update the linked account balance
    card.account.balance -= amount;
    await card.account.save();

    // Update the card's transaction history
    card.transactionHistory.push(cardTransaction._id); // Push the CardTransaction ID
    await card.save();

    // Respond with the created card transaction
    res.status(201).json(cardTransaction);

  } catch (error) {
    console.error('Card transaction creation error:', error);
    // Handle specific errors (e.g., Insufficient funds)
    if (error.message === 'Insufficient funds in linked account') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error creating card transaction', error: error.message });
  }
};


const cancelTransactionRequestAndReturnFunds = async (req, res) => {
  try {
    const { _id, description } = req.body;

    // Find the transfer request
    const transferRequest = await RequestTransfer.findById(_id);

    if (!transferRequest) {
      return res.status(404).json({ message: 'Transfer request not found' });
    }

    // Get the source account and amount from the transfer request
    const fromAccountId = transferRequest.fromAccount;
    const amount = transferRequest.amount;

    // Find the user's account
    const fromAccount = await Account.findById(fromAccountId);

    if (!fromAccount) {
      return res.status(404).json({ message: 'Source account not found' });
    }

    // Create a deposit transaction to return funds
    const returnTransaction = await Transaction.createTransaction({
      accountId: fromAccount._id,
      receiverIdentifier: fromAccount.accountNumber, // Returning to the same account
      type: 'deposit', // Changed from 'Deposit' to 'deposit'
      amount: amount,
      swiftCode: null, // Or appropriate default
      date: new Date(),
      description: description || 'Funds returned due to cancelled transfer request',
      bankName: null, // Or appropriate default
      receiverName: fromAccount.accountHolderName, // Or appropriate default
      userId: fromAccount.user, // User ID associated with the account
      isAdmin: true // This action is performed by an admin
    });

    // Update the status of the transfer request to Cancelled
    // transferRequest.status = 'Cancelled';
    await transferRequest.save();

    await logActivity({
      userId: fromAccount.user,
      action: 'Cancelled Transfer Request',
      metadata: {
        transferRequest: transferRequest._id,
        amount,
        fromAccount: fromAccount._id
      }
    });

    await invalidateUserTransactions(fromAccount.user);

    res.status(200).json({
      message: 'Transfer request cancelled and funds returned successfully',
      returnTransaction,
      cancelledRequest: transferRequest
    });
  } catch (error) {
    console.error('Error cancelling transfer request and returning funds:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTransactions,
  getAllTransactions,
  getTransactionsByUserId,
  updateTransactionStatus,
  getTransactionByRequestId,
  createCardTransaction, // Export the new function
  getAllAccounts, // Assuming this was intended to be exported
  cancelTransactionRequestAndReturnFunds // Export the new function
};
