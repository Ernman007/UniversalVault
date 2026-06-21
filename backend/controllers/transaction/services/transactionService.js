const Transaction = require("../../../models/transaction");
const Account = require("../../../models/account");
const RequestTransfer = require("../../../models/requestTransfer");
const CardTransaction = require("../../../models/cardTransaction");
const Card = require("../../../models/card");
const mongoose = require("mongoose");
const { generateRandomId } = require("../utils/helpers");
const {
  getUserTransactions,
  getTransactionsByFilters,
  invalidateUserTransactions,
} = require("../../../services/transactionCacheService");

const isTransactionDebugEnabled = process.env.TRANSACTION_DEBUG === "true";
const transactionDebug = (...args) =>
  isTransactionDebugEnabled && console.log(...args);

const createTransactionService = async ({
  accountId,
  receiverIdentifier,
  type,
  amount,
  swiftCode,
  date,
  description,
  userId,
  isAdmin,
  bankName,
  receiverName,
  depositorName,
  depositorId,
  externalSource,
  accountHolderName,
}) => {
  transactionDebug("[TRANSACTION-SERVICE] createTransactionService called", {
    accountId,
    type,
    amount,
    userId,
    isAdmin,
  });
  const transaction = await Transaction.createTransaction({
    accountId,
    receiverIdentifier,
    type,
    amount,
    swiftCode,
    date,
    description,
    userId,
    isAdmin,
    bankName,
    receiverName,
    depositorName,
    depositorId,
    externalSource,
    accountHolderName,
  });

  transactionDebug("[TRANSACTION-SERVICE] Transaction created", {
    _id: transaction?._id,
    transactionId: transaction?.transactionId,
    type: transaction?.type,
    amount: transaction?.amount,
    status: transaction?.status,
    fromAccount: transaction?.fromAccount?.toString(),
    toAccount: transaction?.toAccount?.toString(),
  });

  await invalidateUserTransactions(userId);

  transactionDebug("[TRANSACTION-SERVICE] Cache invalidated for user", {
    userId,
  });

  return transaction;
};

const createCardTransactionService = async ({
  cardNumber,
  expiryDate,
  cvv,
  amount,
  merchantDetails,
  transactionType,
}) => {
  // Basic validation
  if (
    !cardNumber ||
    !expiryDate ||
    !cvv ||
    !amount ||
    !merchantDetails ||
    !transactionType
  ) {
    throw new Error("Missing required transaction details");
  }

  // Find the card and its linked account
  // Parse expiryDate (MM/YY)
  const [month, year] = expiryDate.split("/").map(Number);
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
      $lte: endDate,
    },
  }).populate("account"); // Corrected populate path

  if (!card) {
    throw new Error("Invalid card details or expired card");
  }

  if (!card.account) {
    // Corrected check for populated account
    throw new Error("Account linked to card not found");
  }

  // Check for sufficient funds in the linked account
  if (card.account.balance < amount) {
    throw new Error("Insufficient funds in linked account");
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

  const { createNotification } = require("../../notificationController");
  const cardOwnerId = card.account.user;
  if (cardOwnerId) {
    const masked = `****${cardNumber.slice(-4)}`;
    try {
      await createNotification(
        cardOwnerId,
        "success",
        `Card transaction of ${amount} ${cardTransaction.currency || "$"} at ${merchantDetails} (card ${masked}) has been processed.`,
      );
    } catch (e) {
      console.warn(
        "[TRANSACTION-SERVICE] Could not notify card owner:",
        e.message,
      );
    }
  }

  return cardTransaction;
};

const getTransactionsByUserIdService = async (userId, filters = {}) => {
  const { startDate, endDate, page, limit, sort } = filters;

  const result = await getTransactionsByFilters(userId, {
    startDate,
    endDate,
    page,
    limit,
    sort,
  });

  // Handle paginated response (object with data and meta)
  if (page || limit) {
    const modifiedTxns = result.data.map((txn) => {
      const base = { ...txn };
      if (!base.toAccount && base.accountNumber) {
        base.toAccount = { accountNumber: base.accountNumber };
      }
      return base;
    });
    return { data: modifiedTxns, meta: result.meta };
  }

  // Legacy array response
  const modifiedTxns = result.map((txn) => {
    const base = { ...txn };
    if (!base.toAccount && base.accountNumber) {
      base.toAccount = { accountNumber: base.accountNumber };
    }
    return base;
  });

  return modifiedTxns;
};

const updateTransactionStatusService = async (transactionId, status) => {
  const validStatuses = [
    "initiated",
    "pending",
    "confirmed",
    "rejected",
    "cancelled",
    "failed",
    "reversed",
  ];
  if (!validStatuses.includes(status)) {
    throw new Error("Invalid status provided");
  }

  const transaction = await Transaction.findById(transactionId);

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  transaction.status = status;
  await transaction.save();

  return transaction;
};

const getTransactionByRequestIdService = async (requestId) => {
  const transaction = await Transaction.findOne({
    requestTransferId: requestId,
  })
    .populate("toAccount", "accountNumber")
    .populate("fromAccount", "accountNumber");

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  return transaction;
};

const getTransactionByIdService = async (transactionId, userId) => {
  transactionDebug("[TRANSACTION-SERVICE] getTransactionById", {
    transactionId,
    userId,
  });

  // Check if it's a card transaction ID (starts with 'card-')
  const isCardTransaction = transactionId.startsWith("card-");

  let transaction;
  if (isCardTransaction) {
    const cardTransactionKey = transactionId.slice(5);
    const isObjectIdKey = mongoose.Types.ObjectId.isValid(cardTransactionKey);
    const transactionIdCandidates = [transactionId, cardTransactionKey].filter(
      Boolean,
    );

    if (isObjectIdKey) {
      transaction = await CardTransaction.findById(cardTransactionKey)
        .populate("account", "accountNumber accountHolderName IBAN")
        .populate("card", "cardNumber cardType");
    }

    if (!transaction) {
      transaction = await CardTransaction.findOne({
        transactionId: { $in: transactionIdCandidates },
      })
        .populate("account", "accountNumber accountHolderName IBAN")
        .populate("card", "cardNumber cardType");
    }

    if (!transaction) {
      transaction = await CardTransaction.findById(transactionId)
        .populate("account", "accountNumber accountHolderName IBAN")
        .populate("card", "cardNumber cardType");
    }

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    // Verify user owns the account linked to this card transaction
    const accountId = transaction.account?._id || transaction.account;
    const account = await Account.findById(accountId);
    if (!account || account.user.toString() !== userId.toString()) {
      throw new Error("Access denied");
    }

    // Convert to plain object and normalize fields for frontend
    const txObj = transaction.toObject();
    return {
      ...txObj,
      type: "card",
      amount: txObj.amount,
      status: txObj.status || "confirmed",
      description: txObj.merchantDetails || "Card Transaction",
      createdAt: txObj.date || txObj.createdAt,
      accountNumber: account.accountNumber,
    };
  } else {
    // Query by _id for regular transactions
    transaction = await Transaction.findById(transactionId)
      .populate("toAccount", "accountNumber accountHolderName IBAN user")
      .populate("fromAccount", "accountNumber accountHolderName IBAN user")
      .populate("userId", "name email")
      .populate("requestTransferId", "status");

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    // Verify user has access to this transaction:
    // 1. User is the transaction owner (userId), OR
    // 2. User's account is the source (fromAccount), OR
    // 3. User's account is the destination (toAccount)
    const isOwner = transaction.userId._id.toString() === userId.toString();
    const isFromAccountOwner =
      transaction.fromAccount &&
      transaction.fromAccount.user &&
      transaction.fromAccount.user.toString() === userId.toString();
    const isToAccountOwner =
      transaction.toAccount &&
      transaction.toAccount.user &&
      transaction.toAccount.user.toString() === userId.toString();

    transactionDebug("[TRANSACTION-SERVICE] Access check", {
      isOwner,
      isFromAccountOwner,
      isToAccountOwner,
    });

    if (!isOwner && !isFromAccountOwner && !isToAccountOwner) {
      throw new Error("Access denied");
    }

    const txObj = transaction.toObject();

    // Add flag to indicate if current user is the sender (for proper +/- display)
    txObj.isUserSender = isFromAccountOwner;
    txObj.isUserReceiver = isToAccountOwner;

    // Derive transferStatus for sender's pending transactions
    let transferStatus = null;
    if (isFromAccountOwner && txObj.requestTransferId) {
      const reqStatus = txObj.requestTransferId?.status;
      if (reqStatus === "pending") transferStatus = "awaiting_verification";
      else if (reqStatus === "pending_admin")
        transferStatus = "awaiting_bank_approval";
    }
    txObj.transferStatus = transferStatus;

    return txObj;
  }
};

const cancelTransactionRequestAndReturnFundsService = async ({
  _id,
  description,
  userId,
}) => {
  // Find the transfer request
  const transferRequest = await RequestTransfer.findById(_id);

  if (!transferRequest) {
    throw new Error("Transfer request not found");
  }

  // Get the source account and amount from the transfer request
  const fromAccountId = transferRequest.fromAccount;
  const amount = transferRequest.amount;

  // Find the user's account
  const fromAccount = await Account.findById(fromAccountId);

  if (!fromAccount) {
    throw new Error("Source account not found");
  }

  // Create a deposit transaction to return funds
  const returnTransaction = await Transaction.createTransaction({
    accountId: fromAccount._id,
    receiverIdentifier: fromAccount.accountNumber, // Returning to the same account
    type: "deposit", // Changed from 'Deposit' to 'deposit'
    amount: amount,
    swiftCode: null, // Or appropriate default
    date: new Date(),
    description:
      description || "Funds returned due to cancelled transfer request",
    bankName: null, // Or appropriate default
    receiverName: fromAccount.accountHolderName, // Or appropriate default
    userId: fromAccount.user, // User ID associated with the account
    isAdmin: true, // This action is performed by an admin
  });

  // Update the status of the transfer request to Cancelled
  transferRequest.status = "cancelled";
  await transferRequest.save();

  await invalidateUserTransactions(fromAccount.user);

  return {
    returnTransaction,
    cancelledRequest: transferRequest,
  };
};

module.exports = {
  createTransactionService,
  createCardTransactionService,
  getTransactionsByUserIdService,
  updateTransactionStatusService,
  getTransactionByRequestIdService,
  getTransactionByIdService,
  cancelTransactionRequestAndReturnFundsService,
  getUserTransactions,
  getAllTransactions: getTransactionsByFilters,
};
