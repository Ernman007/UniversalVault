const mongoose = require("mongoose");
const { BANK_NAME } = require("../config/bankConfig");

const transactionSchema = new mongoose.Schema(
  {
    toAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Account" }, // Not required for external recipients
    type: {
      type: String,
      enum: ["deposit", "withdrawal", "transfer", "payment"],
      required: true,
    },
    amount: { type: Number, required: true },
    IBAN: { type: String }, // Not required for all transactions
    accountNumber: { type: String }, // Not required for all transactions
    swiftCode: { type: String, default: "SPLYBN688" },
    transactionId: { type: String, unique: true, required: true },
    date: { type: Date, required: true },
    description: { type: String },
    fromAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bankName: { type: String },
    receiverName: { type: String },
    // Depositor info (for deposit transactions - records who made the deposit)
    depositorName: { type: String },
    depositorId: { type: String },
    // External source info (for payment transactions with external source)
    externalSource: {
      account: { type: String },
      bank: { type: String },
      holder: { type: String },
    },
    accountHolderName: { type: String }, // For external recipients
    status: {
      type: String,
      enum: [
        "initiated",
        "pending",
        "confirmed",
        "rejected",
        "cancelled",
        "failed",
        "reversed",
      ],
      default: "initiated",
      required: true,
    },
    requestTransferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RequestTransfer",
    },
    cardId: { type: mongoose.Schema.Types.ObjectId, ref: "Card" },
  },
  { timestamps: true },
);

const TRANSITIONS = {
  initiated: ["pending", "cancelled", "failed"],
  pending: ["confirmed", "rejected", "cancelled", "failed"],
  confirmed: ["reversed", "cancelled"],
  rejected: [],
  cancelled: [],
  failed: [],
  reversed: [],
};

const isTerminal = (status) => {
  const t = TRANSITIONS[status];
  return !t || t.length === 0;
};

transactionSchema.index({ userId: 1, date: -1, type: 1, status: 1 });
transactionSchema.index({ requestTransferId: 1 }, { sparse: true });
transactionSchema.index({ fromAccount: 1, date: -1 });
transactionSchema.index({ toAccount: 1, date: -1 });

transactionSchema.pre("save", function (next) {
  if (this.isNew) {
    this.transactionId = generateRandomId(12);
  }
  if (this.isModified("status") && !this.isNew) {
    const prev = this._previousStatus;
    if (!prev) {
      return next();
    }
    const allowed = TRANSITIONS[prev] || [];
    if (!allowed.includes(this.status)) {
      return next(
        new Error(
          `Invalid status transition from '${prev}' to '${this.status}'`,
        ),
      );
    }
    if (isTerminal(this.status)) {
      Object.defineProperty(this, "_isTerminal", {
        value: true,
        configurable: false,
      });
    }
  }
  next();
});

transactionSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update && update.status !== undefined) {
    const current = this.getQuery().status;
    if (current) {
      const allowed = TRANSITIONS[current] || [];
      if (!allowed.includes(update.status)) {
        return next(
          new Error(
            `Invalid status transition from '${current}' to '${update.status}'`,
          ),
        );
      }
    }
  }
  next();
});

const generateRandomId = (length) => {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Static method to create a transaction with all necessary validations and updates
transactionSchema.statics.createTransaction = async function ({
  accountId,
  receiverIdentifier,
  type, // This type is now less critical for card transactions, will be set internally
  amount,
  swiftCode,
  date,
  description,
  userId,
  isAdmin = false,
  bankName,
  receiverName,
  requestTransferId,
  cardId, // Use cardId to identify card transactions
  depositorName, // Name of person making the deposit
  depositorId, // ID of person making the deposit
  externalSource, // External source for payment transactions
  accountHolderName, // Account holder name for external recipients
}) {
  const Account = require("./account");
  const ActivityLog = require("./activityLog");
  const Card = require("./card"); // Require Card model here

  let fromAccount = null;
  let toAccount = null;
  let transactionType = type; // Use a local variable for transaction type
  let isCardTransaction = !!cardId; // Flag to identify card transactions

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  // Find the source account
  if (accountId && transactionType !== "deposit") {
    fromAccount = await Account.findById(accountId);
    if (!fromAccount && transactionType === "transfer") {
      throw new Error("Source account not found");
    }
  } else if (isCardTransaction) {
    const card = await Card.findById(cardId).populate("account"); // Populate 'account'
    if (!card) {
      throw new Error("Card not found");
    }
    fromAccount = card.account; // Use card.account
    if (!fromAccount) {
      throw new Error("Account linked to card not found");
    }
    transactionType = "withdrawal"; // Set type to withdrawal for card transactions
  }

  // Determine the destination account
  let isInternationalTransfer = false;
  if (isCardTransaction) {
    // For card transactions, create a temporary account for the merchant
    toAccount = {
      _id: new mongoose.Types.ObjectId(), // Generate temporary ID
      accountNumber: receiverIdentifier, // Use merchantDetails as account number
      IBAN: `MERCHANT${receiverIdentifier}`, // Create a simple IBAN for merchant
      swiftCode: "MERCH001", // Generic merchant SWIFT code
      bankName: "Merchant Account", // Generic bank name for merchant
      accountHolderName: receiverIdentifier, // Use merchantDetails as receiver name
      isTemporary: true,
    };
  } else if (receiverIdentifier) {
    const isObjectId = mongoose.Types.ObjectId.isValid(receiverIdentifier);
    const query = {
      $or: [
        { accountNumber: receiverIdentifier },
        { IBAN: receiverIdentifier },
      ],
    };
    if (isObjectId) {
      query.$or.push({ _id: receiverIdentifier });
    }
    toAccount = await Account.findOne(query);
    if (!toAccount && transactionType === "transfer") {
      // This is an international transfer
      isInternationalTransfer = true;
      // Create a temporary account object for the international transfer
      toAccount = {
        _id: new mongoose.Types.ObjectId(), // Generate temporary ID
        accountNumber: receiverIdentifier,
        IBAN: receiverIdentifier.startsWith("IBAN")
          ? receiverIdentifier
          : `IBAN${receiverIdentifier}`,
        swiftCode: swiftCode || "INTBAN001", // Default international SWIFT code
        bankName: swiftCode
          ? `International Bank (${swiftCode})`
          : "International Bank",
        accountHolderName: description
          ? description.split(" to ")[1]
          : "International Recipient", // Try to extract recipient name from description
        isTemporary: true,
      };
    } else if (!toAccount && transactionType !== "transfer") {
      throw new Error("Account not found");
    }
  } else if (accountId && transactionType === "deposit") {
    // For deposit: accountId is the receiving account (toAccount)
    toAccount = await Account.findById(accountId);
    if (!toAccount) {
      throw new Error("Account not found");
    }
    fromAccount = null;
  } else if (accountId && transactionType === "withdrawal") {
    // For withdrawal: accountId is the source account (fromAccount)
    // Withdrawals have no destination account.
    fromAccount = await Account.findById(accountId);
    if (!fromAccount) {
      throw new Error("Account not found");
    }
    toAccount = null;
  } else if (transactionType === "payment") {
    // Payment: flexible source and recipient
    // Handle source (from)
    if (externalSource) {
      // External source - create temporary account object
      fromAccount = {
        _id: new mongoose.Types.ObjectId(),
        accountNumber: externalSource.account,
        IBAN: `EXT${externalSource.account}`,
        swiftCode: "EXTSRC01",
        bankName: externalSource.bank || "External Bank",
        accountHolderName: externalSource.holder || "External Source",
        isTemporary: true,
        isExternal: true,
      };
    } else if (accountId) {
      // Internal source
      fromAccount = await Account.findById(accountId);
      if (!fromAccount) {
        throw new Error("Source account not found");
      }
    }

    // Handle recipient (to)
    if (receiverIdentifier) {
      const isObjectId = mongoose.Types.ObjectId.isValid(receiverIdentifier);
      const query = {
        $or: [
          { accountNumber: receiverIdentifier },
          { IBAN: receiverIdentifier },
        ],
      };
      if (isObjectId) {
        query.$or.push({ _id: receiverIdentifier });
      }
      toAccount = await Account.findOne(query);
      if (!toAccount) {
        // External recipient
        toAccount = {
          _id: new mongoose.Types.ObjectId(),
          accountNumber: receiverIdentifier,
          IBAN: receiverIdentifier.startsWith("IBAN")
            ? receiverIdentifier
            : `IBAN${receiverIdentifier}`,
          swiftCode: swiftCode || "EXTBANK1",
          bankName: bankName || "External Bank",
          accountHolderName:
            accountHolderName || receiverName || "External Recipient",
          isTemporary: true,
        };
      }
    }
  }

  if (!toAccount && transactionType !== "withdrawal") {
    throw new Error("Destination account not specified");
  }

  if (transactionType === "deposit" && fromAccount) {
    throw new Error("Invalid deposit source account mapping");
  }

  if (transactionType === "withdrawal" && toAccount) {
    throw new Error("Invalid withdrawal destination account mapping");
  }

  // Determine if this is an internal transfer between accounts owned by the SAME user
  const isInternalOwnTransfer =
    fromAccount &&
    toAccount &&
    fromAccount.user &&
    toAccount.user &&
    fromAccount.user.toString() === toAccount.user.toString() &&
    !toAccount.isTemporary;

  // Perform balance updates based on transaction type
  if (transactionType === "deposit") {
    if (!isInternationalTransfer && !isCardTransaction) {
      toAccount.balance += amount;
    }
  } else if (transactionType === "withdrawal") {
    if (fromAccount.balance < amount) {
      // Check fromAccount balance for withdrawal
      throw new Error("Insufficient funds");
    }
    fromAccount.balance -= amount; // Decrease fromAccount balance for withdrawal
  } else if (transactionType === "transfer") {
    if (!fromAccount) {
      throw new Error("Source account not specified for transfer");
    }
    if (!isInternationalTransfer && fromAccount._id.equals(toAccount._id)) {
      throw new Error("Cannot transfer money to the same account");
    }
    if (fromAccount.balance < amount) {
      throw new Error("Insufficient funds");
    }

    console.log(
      "[TRANSACTION-MODEL] Transfer - fromAccount balance before:",
      fromAccount.balance,
    );
    console.log(
      "[TRANSACTION-MODEL] Transfer - toAccount balance before:",
      toAccount.balance,
    );
    console.log("[TRANSACTION-MODEL] Transfer - isAdmin:", isAdmin);
    console.log(
      "[TRANSACTION-MODEL] Transfer - isInternalOwnTransfer:",
      isInternalOwnTransfer,
    );
    console.log(
      "[TRANSACTION-MODEL] Transfer - toAccount.isTemporary:",
      toAccount.isTemporary,
    );

    // Money always leaves the source account immediately
    fromAccount.balance -= amount;
    await fromAccount.save();

    // Credit the destination account:
    // - For admin-initiated transfers: credit immediately (admin authorizes it)
    // - For internal own-account transfers: credit immediately
    // - For regular user transfers to others: they go through transfer-request flow
    if (isAdmin || isInternalOwnTransfer) {
      if (!toAccount.isTemporary) {
        toAccount.balance += amount;
        await toAccount.save();
        console.log(
          "[TRANSACTION-MODEL] Transfer - toAccount balance after:",
          toAccount.balance,
        );
      }
    }
  } else if (transactionType === "payment") {
    // Payment: deduct from source if internal, credit to recipient if internal
    if (fromAccount && !fromAccount.isExternal) {
      if (fromAccount.balance < amount) {
        throw new Error("Insufficient funds");
      }
      fromAccount.balance -= amount;
      if (!fromAccount.isTemporary) {
        await fromAccount.save();
      }
    }
    if (toAccount && !toAccount.isTemporary) {
      toAccount.balance += amount;
      await toAccount.save();
    }
  }

  // Save account changes for withdrawals and card transactions
  if (
    transactionType === "withdrawal" &&
    fromAccount &&
    !fromAccount.isTemporary
  ) {
    await fromAccount.save();
  }

  if (
    !isInternationalTransfer &&
    !isCardTransaction &&
    toAccount &&
    !toAccount.isTemporary &&
    transactionType !== "transfer"
  ) {
    await toAccount.save();
  }

  let transactionUserId = userId;

  // If user is admin and fromAccount is specified, use fromAccount's user ID
  if (isAdmin && fromAccount) {
    const fromAccountWithUser = await Account.findById(
      fromAccount._id,
    ).populate("user");
    if (fromAccountWithUser && fromAccountWithUser.user) {
      transactionUserId = fromAccountWithUser.user._id;
    }
  }

  // Determine initial status
  let initialStatus = "confirmed";
  if (isInternationalTransfer) {
    initialStatus = "pending";
  } else if (
    transactionType === "transfer" &&
    !isInternalOwnTransfer &&
    !isAdmin
  ) {
    // Non-own transfers by regular users start as pending and require admin approval
    // Admin-initiated transfers are confirmed immediately
    initialStatus = "pending";
  }

  // Create and save the transaction
  const accountContext = toAccount || fromAccount;

  const transaction = new this({
    userId: transactionUserId,
    transactionId: generateRandomId(12),
    toAccount: toAccount?._id || null,
    type: transactionType, // Use the determined transaction type
    amount,
    IBAN: accountContext?.IBAN || null,
    accountNumber: accountContext?.accountNumber || null,
    swiftCode: swiftCode || accountContext?.swiftCode,
    date: date ? new Date(date) : new Date(),
    description:
      isInternationalTransfer && !isInternalOwnTransfer
        ? `${description || ""} (International transfer - Processing time: 3-7 business days)`
        : description,
    fromAccount:
      fromAccount && !fromAccount.isExternal ? fromAccount._id : null,
    bankName:
      bankName ||
      accountContext?.bankName ||
      (isInternationalTransfer ? "International Bank" : BANK_NAME),
    receiverName:
      receiverName ||
      accountContext?.accountHolderName ||
      (isInternationalTransfer ? "International Recipient" : ""),
    status: initialStatus,
    requestTransferId,
    cardId: cardId || null,
    // Depositor info (for deposit transactions)
    depositorName: depositorName || null,
    depositorId: depositorId || null,
    // External source for payment transactions
    externalSource: externalSource || null,
    accountHolderName: accountHolderName || accountContext?.accountHolderName || null,
  });

  await transaction.save();

  // Update card's transaction history if it's a card transaction
  if (isCardTransaction && cardId) {
    const card = await Card.findById(cardId);
    if (card) {
      card.transactionHistory.push(transaction._id);
      await card.save();
    }
  }

  // Create activity log with international transfer note if applicable
  // Use transactionUserId so admin-initiated transactions are logged for the affected user
  await ActivityLog.create({
    user: transactionUserId,
    action: isInternationalTransfer
      ? "Create International Transaction"
      : isCardTransaction
        ? "Create Card Transaction"
        : "Create Transaction",
    metadata: {
      transaction: transaction._id,
      isInternational: isInternationalTransfer,
      isCardTransaction: isCardTransaction,
      type: transactionType,
      amount,
      fromAccount: fromAccount?._id?.toString() || null,
      toAccount: toAccount?._id?.toString() || null,
    },
  });

  // If it's an international transfer, add a message to the response
  if (isInternationalTransfer) {
    transaction._doc.message =
      "International transfer initiated. Processing time: 3-7 business days.";
  }

  return transaction;
};

// Static method to confirm a pending transaction and credit the recipient
transactionSchema.statics.confirmPendingTransaction = async function (
  transactionId,
) {
  const Account = require("./account");
  const transaction = await this.findById(transactionId);

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  if (transaction.status !== "pending") {
    throw new Error(
      `Cannot confirm transaction with status: ${transaction.status}`,
    );
  }

  // Credit the recipient account
  if (transaction.toAccount) {
    const toAccount = await Account.findById(transaction.toAccount);
    if (toAccount && !toAccount.isTemporary) {
      toAccount.balance += transaction.amount;
      await toAccount.save();
    }
  }

  transaction.status = "confirmed";
  await transaction.save();
  return transaction;
};

// Static method to reject a pending transaction and refund the sender
transactionSchema.statics.rejectPendingTransaction = async function (
  transactionId,
  reason,
) {
  const Account = require("./account");
  const transaction = await this.findById(transactionId);

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  if (transaction.status !== "pending") {
    throw new Error(
      `Cannot reject transaction with status: ${transaction.status}`,
    );
  }

  // Refund the sender account
  if (transaction.fromAccount) {
    const fromAccount = await Account.findById(transaction.fromAccount);
    if (fromAccount) {
      fromAccount.balance += transaction.amount;
      await fromAccount.save();
    }
  }

  transaction.status = "rejected";
  if (reason) {
    transaction.description =
      `${transaction.description || ""} (Rejected: ${reason})`.trim();
  }
  await transaction.save();
  return transaction;
};

module.exports = mongoose.model("Transaction", transactionSchema);
