const RequestTransfer = require("../../../models/requestTransfer");
const Transaction = require("../../../models/transaction");
const Account = require("../../../models/account");
const { BANK_NAME, BANK_CODE } = require("../../../config/bankConfig");

exports.createRequest = async ({
  fromAccountId,
  toAccount,
  amount,
  description,
  bankName,
  accountHolderName,
  userId,
  idempotencyKey,
}) => {
  if (idempotencyKey) {
    const existing = await RequestTransfer.findOne({
      idempotencyKey,
      requestedBy: userId,
    }).populate("transactionId");
    if (existing) {
      const fromAccount = await Account.findById(existing.fromAccount).lean();
      return { transferRequest: existing, fromAccount, duplicate: true };
    }
  }

  const fromAccount = await Account.findOne({
    _id: fromAccountId,
    user: userId,
  });

  if (!fromAccount) {
    throw new Error("Source account not found or unauthorized");
  }

  if (fromAccount.balance < amount) {
    throw new Error("Insufficient funds");
  }

  const isIBAN = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,}$/.test(toAccount);
  const toAccountDoc = await Account.findOne({
    $or: [{ accountNumber: toAccount }, { IBAN: toAccount }],
  });
  const isExternal = isIBAN || (bankName && bankName !== BANK_NAME);

  let transferType = "own_account";
  if (isExternal) {
    transferType = isIBAN ? "interbank" : "international";
  } else if (toAccountDoc) {
    if (
      toAccountDoc.user &&
      toAccountDoc.user.toString() !== userId.toString()
    ) {
      transferType = "in_bank_other_user";
    }
  }

  // Create the transaction first - it handles deduction and internal/external logic
  const transaction = await Transaction.createTransaction({
    accountId: fromAccountId,
    receiverIdentifier: toAccount,
    type: "transfer",
    amount,
    description,
    swiftCode: fromAccount.swiftCode || "SPLYBN688",
    date: new Date(),
    userId: userId,
    bankName: bankName || (toAccountDoc ? toAccountDoc.bankName : BANK_NAME),
    receiverName:
      accountHolderName ||
      (toAccountDoc ? toAccountDoc.accountHolderName : "Internal Recipient"),
  });

  const transferRequest = await RequestTransfer.create({
    requestedBy: userId,
    fromAccount: fromAccountId,
    toAccount: toAccount,
    amount,
    description,
    idempotencyKey,
    date: new Date(),
    swiftCode: fromAccount.swiftCode || "SPLYBN688",
    bankName: bankName || BANK_NAME,
    accountHolderName: accountHolderName || "Recipient",
    transferType,
    status: transaction.status === "confirmed" ? "approved" : "pending",
    transactionId: transaction._id,
  });

  // Two-way link: Update transaction with the transfer request ID
  transaction.requestTransferId = transferRequest._id;
  await transaction.save();

  console.log(
    "[TransferRequestService] Created transfer request and linked transaction:",
    {
      id: transferRequest._id,
      transactionId: transaction._id,
      status: transferRequest.status,
    },
  );

  return { transferRequest, fromAccount, transaction };
};

exports.verifyTransfer = async ({ requestId, code, userId }) => {
  const transfer = await RequestTransfer.findOne({
    _id: requestId,
    requestedBy: userId,
    status: "pending",
    codeExpires: { $gt: new Date() },
  });

  if (!transfer) {
    return {
      success: false,
      message: "No pending transfer request found or verification code expired",
      statusCode: 404,
    };
  }

  if (transfer.code !== code) {
    return {
      success: false,
      message: "Invalid verification code",
      statusCode: 400,
    };
  }

  // If it was already confirmed (internal), we're done (though normally internal bypasses this)
  if (transfer.transferType === "own_account") {
    transfer.status = "approved";
    await transfer.save();
    return { success: true, transfer };
  } else {
    transfer.status = "pending_admin";
    await transfer.save();
    console.log(
      "[TransferRequestService] Transfer verified, escalated to pending_admin:",
      transfer._id,
    );
    return { success: true, transfer, requiresAdminApproval: true };
  }
};

exports.getAllTransferRequests = async () => {
  console.log("[TransferRequestService] Fetching all transfer requests...");
  const requests = await RequestTransfer.find({})
    .populate("fromAccount", "accountNumber")
    .sort({ date: -1 });
  console.log(`[TransferRequestService] Found ${requests.length} requests`);
  return requests;
};

exports.getTransferRequestById = async (id) => {
  console.log(`[TransferRequestService] Fetching request by ID: ${id}`);
  return await RequestTransfer.findById(id).populate(
    "fromAccount",
    "accountNumber",
  );
};

exports.getTransferRequestByIdForUser = async (id, userId) => {
  return await RequestTransfer.findOne({ _id: id, requestedBy: userId });
};

exports.getTransferRequestsByUserId = async (userId) => {
  return await RequestTransfer.find({ requestedBy: userId }).sort({ date: -1 });
};

const resolveLinkedTransactionId = async (transferRequest) => {
  let transactionId = transferRequest.transactionId;
  if (transactionId) {
    return transactionId;
  }

  console.warn(
    `[TransferRequestService] Request ${transferRequest._id} is missing transactionId. Attempting fallback lookup...`,
  );

  const linkedByRequestId = await Transaction.findOne({
    requestTransferId: transferRequest._id,
  }).select("_id");

  if (linkedByRequestId) {
    transactionId = linkedByRequestId._id;
  } else {
    const onset = new Date(transferRequest.createdAt);
    const start = new Date(onset.getTime() - 1000 * 60 * 10);
    const end = new Date(onset.getTime() + 1000 * 60 * 10);

    const candidate = await Transaction.findOne({
      userId: transferRequest.requestedBy,
      amount: transferRequest.amount,
      status: "pending",
      createdAt: { $gte: start, $lte: end },
    }).select("_id");

    if (candidate) {
      transactionId = candidate._id;
    }
  }

  if (!transactionId) {
    return null;
  }

  transferRequest.transactionId = transactionId;
  await transferRequest.save();
  return transactionId;
};

exports.manageTransfer = async ({
  requestId,
  status,
  adminUserId,
  rejectionReason,
}) => {
  const transferRequest = await RequestTransfer.findById(requestId);
  if (!transferRequest) {
    return {
      success: false,
      message: "Transfer request not found",
      statusCode: 404,
    };
  }

  if (transferRequest.isExpired()) {
    transferRequest.status = "expired";
    await transferRequest.save();
    return {
      success: false,
      message: "Transfer request has expired",
      statusCode: 410,
    };
  }

  try {
    if (status === "approved") {
      const transactionId = await resolveLinkedTransactionId(transferRequest);
      if (!transactionId) {
        return {
          success: false,
          message: "Linked transaction not found for this transfer request",
          statusCode: 404,
        };
      }

      const transaction =
        await Transaction.confirmPendingTransaction(transactionId);

      transferRequest.status = "approved";
      await transferRequest.save();

      return { success: true, transferRequest, transaction };
    } else if (status === "rejected") {
      const transactionId = await resolveLinkedTransactionId(transferRequest);
      if (!transactionId) {
        return {
          success: false,
          message: "Linked transaction not found for this transfer request",
          statusCode: 404,
        };
      }

      // Use the new consolidated rejection logic (handles refund)
      const transaction = await Transaction.rejectPendingTransaction(
        transactionId,
        rejectionReason,
      );

      transferRequest.status = "rejected";
      transferRequest.rejectionReason = rejectionReason || null;
      await transferRequest.save();

      return { success: true, transferRequest, transaction };
    } else {
      return {
        success: false,
        message: "Invalid status provided",
        statusCode: 400,
      };
    }
  } catch (error) {
    console.error("Error managing transfer:", error);
    return {
      success: false,
      message: error.message,
      statusCode: 500,
    };
  }
};

exports.deleteTransfer = async ({ requestId }) => {
  const transferRequest = await RequestTransfer.findById(requestId);

  if (!transferRequest) {
    return {
      success: false,
      message: "Transfer request not found",
      statusCode: 404,
    };
  }

  // Optional: Add checks if the request can be deleted based on its status
  // if (transferRequest.status !== 'pending' && transferRequest.status !== 'failed') {
  //   return {
  //     success: false,
  //     message: `Cannot delete transfer request with status ${transferRequest.status}`,
  //     statusCode: 400
  //   };
  // }

  await transferRequest.deleteOne();

  return { success: true, transferRequest };
};
