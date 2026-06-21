const { createNotification } = require("../../notificationController");
const { logActivity } = require("../../../services/activityLogService");
const {
  manageTransfer,
} = require("../../transfer-request/services/transferRequestService");
const { invalidateByPrefix } = require("../../../services/cacheService");
const {
  createTransactionService,
  createCardTransactionService,
  getTransactionsByUserIdService,
  updateTransactionStatusService,
  getTransactionByRequestIdService,
  getTransactionByIdService,
  cancelTransactionRequestAndReturnFundsService,
  getUserTransactions,
} = require("../services/transactionService");
const mongoose = require("mongoose");
const { generateRandomId } = require("../utils/helpers");
const Account = require("../../../models/account");
const User = require("../../../models/user");

const isTransactionDebugEnabled = process.env.TRANSACTION_DEBUG === "true";
const transactionDebug = (...args) =>
  isTransactionDebugEnabled && console.log(...args);

const handleCreateTransaction = async (req, res) => {
  transactionDebug("[TRANSACTION] Create transaction request", {
    userId: req.user?._id,
    role: req.user?.role,
    type: req.body?.type,
    amount: req.body?.amount,
    correlationId: req.correlationId,
  });
  try {
    const {
      accountId,
      receiverIdentifier,
      fromAccountId,
      toAccountId,
      type,
      amount,
      swiftCode,
      date,
      description,
      bankName,
      receiverName,
      depositorName,
      depositorId,
      // Payment external source fields
      isExternalSource,
      externalSource,
      accountHolderName,
    } = req.body;

    // Debug: Log extracted values for deposit transactions
    if (type === "deposit") {
      transactionDebug("[TRANSACTION] Deposit debug", {
        accountId,
        toAccountId,
        fromAccountId,
        receiverIdentifier,
      });
    }

    // For payment with external source, we don't need accountId
    let resolvedAccountId = accountId || fromAccountId;
    const resolvedReceiverIdentifier = receiverIdentifier || toAccountId;

    // Handle external source for payment transactions
    let externalSourceData = null;
    if (type === "payment" && isExternalSource && externalSource) {
      externalSourceData = {
        account: externalSource.account,
        bank: externalSource.bank,
        holder: externalSource.holder,
      };
      transactionDebug("[TRANSACTION] Payment with external source");
      // For external source, accountId is not required
      if (!resolvedAccountId) {
        resolvedAccountId = null; // Will be handled in service
      }
    }

    // Auto-assign depositorId for deposits if not provided
    // Generate a unique reference ID based on timestamp and random string
    let resolvedDepositorId = depositorId;
    let resolvedDepositorName = depositorName;
    if (type === "deposit") {
      // If depositor name provided but no ID, generate a reference
      if (depositorName && !depositorId) {
        const generateDepositorRef = () => {
          const timestamp = Date.now().toString(36).toUpperCase();
          const random = Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();
          return `DEP-${timestamp}-${random}`;
        };
        resolvedDepositorId = generateDepositorRef();
      }
      // If no depositor info at all, use "Cash Deposit" as default
      if (!depositorName) {
        resolvedDepositorName = "Cash Deposit";
        resolvedDepositorId =
          depositorId || `CASH-${Date.now().toString(36).toUpperCase()}`;
      }
    }

    const isAdmin = req.user.role === "admin";
    transactionDebug("[TRANSACTION] Is admin check", {
      isAdmin,
      role: req.user.role,
    });

    if (!isAdmin) {
      const Account = require("../../../models/account");
      const fromAccount = resolvedAccountId
        ? await Account.findById(resolvedAccountId)
        : null;
      const toAccount = resolvedReceiverIdentifier
        ? await (async () => {
            const isObjectId = mongoose.Types.ObjectId.isValid(
              resolvedReceiverIdentifier,
            );
            const query = {
              $or: [
                { accountNumber: resolvedReceiverIdentifier },
                { IBAN: resolvedReceiverIdentifier },
              ],
            };
            if (isObjectId) query.$or.push({ _id: resolvedReceiverIdentifier });
            return await Account.findOne(query);
          })()
        : null;

      if (fromAccount && toAccount && !fromAccount._id.equals(toAccount._id)) {
        if (
          fromAccount.user &&
          fromAccount.user.toString() !== req.user._id.toString()
        ) {
          return res.status(403).json({
            message:
              "Forbidden: source account is not owned by the authenticated user",
            code: "ACCOUNT_NOT_OWNED",
            canonicalPath: "/api/transfer-requests",
          });
        }
        if (
          toAccount.user &&
          toAccount.user.toString() !== req.user._id.toString()
        ) {
          return res.status(400).json({
            message:
              "Non-own-account transfers must use the transfer-request flow",
            code: "TRANSFER_REQUIRES_REQUEST",
            canonicalPath: "/api/transfer-requests",
          });
        }
      } else if (
        fromAccount &&
        (!toAccount || fromAccount._id.equals(toAccount._id))
      ) {
        if (
          fromAccount.user &&
          fromAccount.user.toString() !== req.user._id.toString()
        ) {
          return res.status(403).json({
            message:
              "Forbidden: source account is not owned by the authenticated user",
            code: "ACCOUNT_NOT_OWNED",
            canonicalPath: "/api/transfer-requests",
          });
        }
      }
    }

    transactionDebug("[TRANSACTION] Calling createTransactionService", {
      resolvedAccountId,
      type,
      amount,
      isAdmin,
      userId: req.user._id,
    });

    const transaction = await createTransactionService({
      accountId: resolvedAccountId,
      receiverIdentifier: resolvedReceiverIdentifier,
      type,
      amount,
      swiftCode,
      date,
      description,
      userId: req.user._id,
      isAdmin,
      bankName,
      receiverName,
      depositorName: resolvedDepositorName,
      depositorId: resolvedDepositorId,
      externalSource: externalSourceData,
      accountHolderName,
    });

    transactionDebug("[TRANSACTION] Transaction created successfully", {
      transactionId: transaction?._id,
      transactionIdField: transaction?.transactionId,
      type: transaction?.type,
      amount: transaction?.amount,
      status: transaction?.status,
      fromAccount: transaction?.fromAccount,
      toAccount: transaction?.toAccount,
    });

    // Use the centralized notification creation function
    await createNotification(
      req.user._id,
      "success",
      `Transaction of ${amount} ${transaction.currency || "$"} to ${receiverName || receiverIdentifier} completed successfully.`,
    );

    // Notify the recipient if internal (only for deposits and transfers — NOT for withdrawals)
    if (transaction.toAccount && type !== "withdrawal") {
      try {
        const recipientAccount = await Account.findById(transaction.toAccount);
        if (recipientAccount && recipientAccount.user) {
          // Find sender's account suffix
          let senderSuffix = "";
          const senderAccount = await Account.findById(transaction.fromAccount);
          if (senderAccount && senderAccount.accountNumber) {
            senderSuffix = ` (****${senderAccount.accountNumber.slice(-4)})`;
          }

          await createNotification(
            recipientAccount.user,
            "success",
            `You have received ${amount} ${transaction.currency || "$"} from sender${senderSuffix}.`,
          );

          // Emit socket for recipient
          const io = req.app.get("io");
          if (io) {
            io.of("/notifications")
              .to(`user_${recipientAccount.user}`)
              .emit("new_notification", {
                type: "transfer_received",
                message: `You received a transfer of ${amount}.`,
              });
          }
        }
      } catch (e) {
        console.warn(
          "Could not notify recipient in handleCreateTransaction:",
          e.message,
        );
      }
    }

    // Notify the sender (account owner) for admin-initiated withdrawals
    // (user-initiated withdrawals are already covered by the generic notification above)
    if (isAdmin && transaction.fromAccount && type === "withdrawal") {
      try {
        const senderAccount = await Account.findById(
          transaction.fromAccount,
        ).populate("user");
        if (senderAccount && senderAccount.user) {
          await createNotification(
            senderAccount.user._id,
            "success",
            `Debit of ${amount} ${transaction.currency || "$"} from your account completed.`,
          );
        }
      } catch (e) {
        console.warn(
          "Could not notify sender in handleCreateTransaction:",
          e.message,
        );
      }
    }

    await logActivity({
      userId: transaction.userId,
      action: "Create Transaction",
      metadata: {
        transaction: transaction._id,
        type,
        amount,
        description: description || null,
        isAdmin,
        fromAccount: transaction.fromAccount?.toString() || null,
        toAccount: transaction.toAccount?.toString() || null,
      },
      correlationId: req.correlationId,
    });

    transactionDebug("[TRANSACTION] Transaction created", {
      transactionId: transaction._id,
      type,
      amount,
      correlationId: req.correlationId,
    });
    res
      .status(201)
      .json(transaction.toObject ? transaction.toObject() : transaction);
  } catch (error) {
    console.error("[TRANSACTION] Creation error:", {
      error: error.message,
      correlationId: req.correlationId,
    });

    // Notify admin of the error
    if (req.user.role === "admin") {
      try {
        await createNotification(
          req.user._id,
          "error",
          `Transaction failed: ${error.message}`,
        );
        transactionDebug("[TRANSACTION] Admin notified of error");
      } catch (notifError) {
        console.error(
          "[TRANSACTION] Failed to notify admin:",
          notifError.message,
        );
      }
    }

    res.status(400).json({ message: error.message });
  }
};

const handleGetTransactions = async (req, res) => {
  transactionDebug("[TRANSACTION] Get transactions", {
    userId: req.user?._id,
    correlationId: req.correlationId,
  });
  try {
    const { page, limit, sort, type, startDate, endDate, accountId } =
      req.query;
    const options = { page, limit, sort, type, startDate, endDate, accountId };
    const result = await getUserTransactions(req.user._id, options);

    // Return paginated response with meta or legacy array format
    if (page || limit) {
      res.json(result);
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error(
      "[TRANSACTION] handleGetTransactions error:",
      error.message,
      error.stack,
    );
    res.status(500).json({ message: error.message });
  }
};

const requireAdmin = (req, res) => {
  if (req.user.role !== "admin") {
    res
      .status(403)
      .json({ message: "Admin access required", code: "ADMIN_REQUIRED" });
    return false;
  }
  return true;
};

const handleGetAllTransactions = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  transactionDebug("[TRANSACTION] Get all transactions", {
    adminId: req.user?._id,
    correlationId: req.correlationId,
  });
  try {
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

    const Transaction = require("../../../models/transaction");
    const txns = await Transaction.find(filter)
      .populate("toAccount", "accountNumber")
      .populate("fromAccount", "accountNumber")
      .sort("-date");
    res.json(txns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const handleGetTransactionsByUserId = async (req, res) => {
  if (
    req.user.role !== "admin" &&
    req.user._id.toString() !== req.params.userId
  ) {
    return res
      .status(403)
      .json({ message: "Access denied", code: "ACCESS_DENIED" });
  }
  try {
    const { userId } = req.params;
    const { startDate, endDate, page, limit, sort } = req.query;

    const result = await getTransactionsByUserIdService(userId, {
      startDate,
      endDate,
      page,
      limit,
      sort,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const handleUpdateTransactionStatus = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  transactionDebug("[TRANSACTION] Update status", {
    transactionId: req.params?.transactionId,
    status: req.body?.status,
    adminId: req.user?._id,
    correlationId: req.correlationId,
  });
  try {
    const { transactionId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const Transaction = require("../../../models/transaction");
    const transaction =
      await Transaction.findById(transactionId).populate("requestTransferId");

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const requestTransferId =
      transaction.requestTransferId?._id || transaction.requestTransferId;
    if (requestTransferId) {
      const targetStatus =
        status === "Confirmed" || status === "confirmed"
          ? "approved"
          : "rejected";
      const rejectionReason =
        status === "Cancelled" || status === "cancelled"
          ? req.body.rejectionReason || "Cancelled via legacy admin flow"
          : undefined;

      const result = await manageTransfer({
        requestId: requestTransferId.toString(),
        status: targetStatus,
        adminUserId: req.user._id,
        rejectionReason,
      });

      if (!result.success) {
        if (result.statusCode === 410) {
          return res
            .status(410)
            .json({ message: result.message, status: "expired" });
        }
        return res.status(result.statusCode).json({ message: result.message });
      }

      const { transferRequest, transaction: canonicalTransaction } = result;

      if (targetStatus === "approved") {
        await createNotification(
          transferRequest.requestedBy,
          "success",
          `Your transfer request to ${transferRequest.accountHolderName || transferRequest.toAccount} for ${transferRequest.amount} has been approved.`,
        );
        await logActivity({
          userId: req.user._id,
          action: "Managed Transfer (Approved) [Legacy Status Flow]",
          metadata: {
            transferRequest: transferRequest._id,
            transaction: canonicalTransaction._id,
          },
        });
        await invalidateByPrefix("admin_dashboard");
        await invalidateByPrefix(`accounts:${transferRequest.requestedBy}`);
        const io = req.app.get("io");
        if (io) {
          io.of("/notifications")
            .to(`user_${transferRequest.requestedBy}`)
            .emit("new_notification", {
              type: "transfer_approved",
              message: `Your transfer of ${transferRequest.amount} has been approved.`,
            });
        }
      } else {
        await createNotification(
          transferRequest.requestedBy,
          "error",
          `Your transfer request to ${transferRequest.accountHolderName || transferRequest.toAccount} for ${transferRequest.amount} has been rejected. Reason: ${rejectionReason}`,
        );

        // Notify the recipient in this flow as well
        if (canonicalTransaction.toAccount) {
          try {
            const recipientAccount = await Account.findById(
              canonicalTransaction.toAccount,
            );
            if (recipientAccount && recipientAccount.user) {
              const senderAccount = await Account.findById(
                canonicalTransaction.fromAccount,
              );
              const suffix = senderAccount
                ? ` (****${senderAccount.accountNumber.slice(-4)})`
                : "";

              await createNotification(
                recipientAccount.user,
                "success",
                `You have received ${transferRequest.amount} from sender${suffix}.`,
              );

              const io = req.app.get("io");
              if (io) {
                io.of("/notifications")
                  .to(`user_${recipientAccount.user}`)
                  .emit("new_notification", {
                    type: "transfer_received",
                    message: `You received a transfer of ${transferRequest.amount}.`,
                  });
              }
            }
          } catch (e) {
            console.warn("Could not notify recipient in legacy approval flow");
          }
        }

        await logActivity({
          userId: req.user._id,
          action: "Managed Transfer (Rejected) [Legacy Status Flow]",
          metadata: { transferRequest: transferRequest._id, rejectionReason },
        });
        await invalidateByPrefix("admin_dashboard");
        const io = req.app.get("io");
        if (io) {
          io.of("/notifications")
            .to(`user_${transferRequest.requestedBy}`)
            .emit("new_notification", {
              type: "transfer_rejected",
              message: `Your transfer of ${transferRequest.amount} has been rejected.`,
            });
        }
      }

      return res.status(200).json({
        message: "Transfer request " + targetStatus,
        transaction: canonicalTransaction,
        legacy: true,
        deprecation: {
          route: "PUT /api/transactions/:transactionId/status",
          replacement: "PUT /api/transfer-requests/:id/manage",
          migration:
            "Please update your client to use PUT /api/transfer-requests/:id/manage",
        },
      });
    }

    const updated = await updateTransactionStatusService(transactionId, status);
    res.status(200).json({
      message: "Transaction status updated successfully",
      transaction: updated,
    });
  } catch (error) {
    if (error.message === "Transaction not found") {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === "Invalid status provided") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({
      message: "Error updating transaction status",
      error: error.message,
    });
  }
};

const handleGetAllAccounts = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const Account = require("../../../models/account");
    const accounts = await Account.find();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const handleGetTransactionByRequestId = async (req, res) => {
  try {
    const { requestId } = req.params;
    const transaction = await getTransactionByRequestIdService(requestId);

    res.json(transaction);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    if (error.message === "Transaction not found") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

const handleGetTransactionById = async (req, res) => {
  transactionDebug("[TRANSACTION] Get transaction by ID", {
    transactionId: req.params.id,
    userId: req.user?._id,
  });

  try {
    const { id } = req.params;
    const userId = req.user._id;

    const transaction = await getTransactionByIdService(id, userId);
    res.json(transaction);
  } catch (error) {
    console.error("[TRANSACTION] Error fetching transaction by ID:", error);
    if (error.message === "Transaction not found") {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === "Access denied") {
      return res.status(403).json({ message: "Access denied" });
    }
    res.status(500).json({ message: error.message });
  }
};

const handleCreateCardTransaction = async (req, res) => {
  const {
    cardNumber,
    expiryDate,
    cvv,
    amount,
    merchantDetails,
    transactionType,
  } = req.body;

  transactionDebug("[TRANSACTION] Create card transaction", {
    hasCardNumber: !!cardNumber,
    hasExpiryDate: !!expiryDate,
    hasCvv: !!cvv,
    amount,
    hasMerchantDetails: !!merchantDetails,
    transactionType,
    correlationId: req.correlationId,
  });

  // Validate required fields with specific error messages
  const missingFields = [];
  if (!cardNumber) missingFields.push("cardNumber");
  if (!expiryDate) missingFields.push("expiryDate");
  if (!cvv) missingFields.push("cvv");
  if (!amount) missingFields.push("amount");
  if (!merchantDetails) missingFields.push("merchantDetails");
  if (!transactionType) missingFields.push("transactionType");

  if (missingFields.length > 0) {
    transactionDebug("[TRANSACTION] Card transaction validation failed");
    return res.status(400).json({
      message: "Missing required transaction details",
      missingFields,
      required: [
        "cardNumber",
        "expiryDate",
        "cvv",
        "amount",
        "merchantDetails",
        "transactionType",
      ],
    });
  }

  try {
    const cardTransaction = await createCardTransactionService({
      cardNumber,
      expiryDate,
      cvv,
      amount,
      merchantDetails,
      transactionType,
    });

    // Respond with the created card transaction
    res.status(201).json(cardTransaction);
  } catch (error) {
    console.error("Card transaction creation error:", error);
    // Handle specific errors (e.g., Insufficient funds)
    if (
      error.message === "Insufficient funds in linked account" ||
      error.message === "Missing required transaction details"
    ) {
      return res.status(400).json({ message: error.message });
    }
    if (
      error.message === "Invalid card details or expired card" ||
      error.message === "Account linked to card not found"
    ) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({
      message: "Error creating card transaction",
      error: error.message,
    });
  }
};

const handleCancelTransactionRequestAndReturnFunds = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { _id, description } = req.body;

    const { returnTransaction, cancelledRequest } =
      await cancelTransactionRequestAndReturnFundsService({
        _id,
        description,
        userId: req.user._id,
      });

    await logActivity({
      userId: req.user._id,
      action: "Cancelled Transfer Request [Admin Action]",
      metadata: {
        transferRequest: cancelledRequest._id,
        amount: returnTransaction.amount,
        fromAccount: returnTransaction.fromAccount,
        affectedUser: cancelledRequest.requestedBy?.toString(),
        isAdmin: true,
      },
    });

    await logActivity({
      userId: cancelledRequest.requestedBy,
      action: "Transfer Request Cancelled by Admin",
      metadata: {
        transferRequest: cancelledRequest._id,
        amount: returnTransaction.amount,
        fromAccount: returnTransaction.fromAccount,
        cancelledByAdmin: req.user._id.toString(),
      },
    });

    await createNotification(
      cancelledRequest.requestedBy,
      "error",
      `Your transfer request of ${returnTransaction.amount} was cancelled and funds have been returned. Reason: ${description || "No reason provided"}`,
    );

    const io = req.app.get("io");
    if (io) {
      io.of("/notifications")
        .to(`user_${cancelledRequest.requestedBy}`)
        .emit("new_notification", {
          type: "transfer_cancelled",
          message: `Your transfer request was cancelled and funds returned.`,
        });
    }

    res.status(200).json({
      message: "Transfer request cancelled and funds returned successfully",
      returnTransaction,
      cancelledRequest,
    });
  } catch (error) {
    console.error(
      "Error cancelling transfer request and returning funds:",
      error,
    );
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  handleCreateTransaction,
  handleGetTransactions,
  handleGetAllTransactions,
  handleGetTransactionsByUserId,
  handleUpdateTransactionStatus,
  handleGetTransactionByRequestId,
  handleGetTransactionById,
  handleCreateCardTransaction,
  handleCancelTransactionRequestAndReturnFunds,
  handleGetAllAccounts,
};
