const Account = require("../../../models/account");
const User = require("../../../models/user");
const Transaction = require("../../../models/transaction");
const mongoose = require("mongoose");
const { BANK_NAME } = require("../../../config/bankConfig");
const { createNotification } = require("../../notificationController");
const { 
  sendAccountRequestEmail, 
  sendAccountApprovalEmail 
} = require("../../transfer-request/providers/emailProvider");
const { logActivity } = require("../../../services/activityLogService");
const {
  getUserAccounts,
  getAllAccountsCached,
  getAccountCountByDateRangeCached,
  getActiveAccountCountCached,
  invalidateUserAccounts,
  invalidateAccountSummaries,
} = require("../../../services/accountCacheService");
const { invalidateUserTransactions } = require("../../../services/transactionCacheService");

// Create a new account
const createAccount = async (
  userId,
  type,
  initialDeposit,
  bankName,
  accountHolderName,
  requestingUserId,
  sourceAccountId,
) => {
  console.log("[ACCOUNT_SERVICE] createAccount called with:", {
    userId,
    type,
    initialDeposit,
    bankName,
    accountHolderName,
    requestingUserId,
    sourceAccountId,
  });

  try {
    const normalizedInitialDeposit = Number(initialDeposit) || 0;
    const generateId = (length) => {
      let result = "";
      const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      for (let i = 0; i < length; i++) {
        result += characters.charAt(
          Math.floor(Math.random() * characters.length),
        );
      }
      return result;
    };

    let account;
    let transferredFromSource = false;
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        console.log("[ACCOUNT_SERVICE] Creating account document...");
        account = new Account({
          user: userId,
          type,
          balance: 0,
          bankName: bankName || BANK_NAME,
          accountHolderName: accountHolderName || undefined,
        });

        const user = await User.findById(userId).session(session);
        if (!user) {
          throw new Error("User not found");
        }

        if (!accountHolderName) {
          account.accountHolderName = user.name;
        }

        if (sourceAccountId && normalizedInitialDeposit > 0) {
          const sourceAccount = await Account.findOneAndUpdate(
            {
              _id: sourceAccountId,
              user: userId,
              balance: { $gte: normalizedInitialDeposit },
            },
            { $inc: { balance: -normalizedInitialDeposit } },
            { new: true, session },
          );

          if (!sourceAccount) {
            const sourceExists = await Account.findOne({
              _id: sourceAccountId,
              user: userId,
            }).session(session);
            if (!sourceExists) {
              throw new Error("Source account not found or does not belong to user");
            }
            throw new Error(
              "Insufficient balance in source account for initial deposit transfer",
            );
          }

          account.balance = normalizedInitialDeposit;
          await account.save({ session });
          user.accounts.push(account._id);
          await user.save({ session });

          await Transaction.create(
            [
              {
                transactionId: generateId(12),
                fromAccount: sourceAccountId,
                toAccount: account._id,
                type: "withdrawal",
                amount: normalizedInitialDeposit,
                description: `Initial deposit funding for new ${type} account`,
                status: "confirmed",
                userId: userId,
                date: new Date(),
              },
              {
                transactionId: generateId(12),
                fromAccount: sourceAccountId,
                toAccount: account._id,
                type: "deposit",
                amount: normalizedInitialDeposit,
                description: `Initial deposit to new ${type} account`,
                status: "confirmed",
                userId: userId,
                date: new Date(),
              },
            ],
            { session },
          );
          transferredFromSource = true;
          return;
        }

        if (normalizedInitialDeposit > 0) {
          account.balance = normalizedInitialDeposit;
        }

        await account.save({ session });
        user.accounts.push(account._id);
        await user.save({ session });

        // Send email AFTER account.save() so accountNumber is generated (via pre-save hook)
        if (account.isActive) {
          sendAccountApprovalEmail(user, account).catch(err => 
            console.error("[ACCOUNT_SERVICE] Approval email failed:", err.message)
          );
        } else {
          sendAccountRequestEmail(user, type).catch(err => 
            console.error("[ACCOUNT_SERVICE] Request email failed:", err.message)
          );
        }

        if (normalizedInitialDeposit > 0) {
          await Transaction.create(
            [
              {
                transactionId: generateId(12),
                toAccount: account._id,
                type: "deposit",
                amount: normalizedInitialDeposit,
                description: `Initial deposit to new ${type} account`,
                status: "confirmed",
                userId: userId,
                date: new Date(),
              },
            ],
            { session },
          );
        }
      });
    } finally {
      await session.endSession();
    }

    if (transferredFromSource) {
      await logActivity({
        userId: requestingUserId,
        action: "Transfer Initial Deposit",
        metadata: {
          fromAccount: sourceAccountId,
          toAccount: account._id,
          amount: normalizedInitialDeposit,
        },
      });
      console.log("[ACCOUNT_SERVICE] Transfer completed successfully");
    }

    await logActivity({
      userId: requestingUserId,
      action: "Create Account",
      metadata: {
        account: account._id,
        bankName: account.bankName,
        accountHolderName: account.accountHolderName,
      },
    });

    await invalidateUserAccounts(userId);
    await invalidateAccountSummaries();
    await invalidateUserTransactions(userId);

    // Create a notification using the centralized function
    await createNotification(
      userId,
      "success",
      `A new ${type} account has been created for you.`,
    );

    return {
      success: true,
      account,
    };
  } catch (error) {
    console.error("[ACCOUNT_SERVICE] ERROR creating account:", error);
    console.error("[ACCOUNT_SERVICE] Error stack:", error.stack);
    return {
      success: false,
      message: "Error creating account",
      error: error.message,
    };
  }
};

// Get accounts by user ID
const getAccountsByUserId = async (userId) => {
  try {
    const accounts = await getUserAccounts(userId);
    return {
      success: true,
      accounts,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// Get account by ID with authorization check
const getAccountById = async (accountId, userId) => {
  try {
    const account = await Account.findById(accountId);

    if (!account) {
      return {
        success: false,
        status: 404,
        message: "Account not found",
      };
    }

    if (account.user.toString() !== userId.toString()) {
      return {
        success: false,
        status: 403,
        message: "Not authorized to access this account",
      };
    }

    return {
      success: true,
      account,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// Get currently active account count
const getCurrentlyActiveAccountCount = async () => {
  try {
    const activeCount = await getActiveAccountCountCached();
    return {
      success: true,
      count: activeCount,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// Get all accounts
const getAllAccounts = async () => {
  try {
    console.log("[getAllAccounts] Starting...");
    const accounts = await Account.find()
      .populate("user", "name email")
      .select("_id type balance accountNumber status user accountHolderName");

    console.log("[getAllAccounts] Found accounts:", accounts.length);

    // Add user info to each account for display
    const accountsWithUserInfo = accounts.map((acc) => {
      // Handle orphaned accounts where user is null
      const userName = acc.user?.name || acc.accountHolderName || "Unknown";
      const userEmail = acc.user?.email || "Unknown";

      const mapped = {
        _id: acc._id,
        type: acc.type,
        balance: acc.balance,
        accountNumber: acc.accountNumber,
        status: acc.status,
        userName,
        userEmail,
      };
      console.log(
        "[getAllAccounts] Account:",
        acc._id,
        "user field:",
        acc.user,
        "accountHolderName:",
        acc.accountHolderName,
        "-> userName:",
        mapped.userName,
        "userEmail:",
        mapped.userEmail,
      );
      return mapped;
    });

    return {
      success: true,
      accounts: accountsWithUserInfo,
    };
  } catch (error) {
    console.error("[getAllAccounts] Error:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Search accounts by user name or email (for admin dropdowns)
const searchAccounts = async (searchTerm) => {
  try {
    console.log("[searchAccounts] Search term:", searchTerm);

    if (!searchTerm || searchTerm.trim().length < 2) {
      // Return empty if search term too short
      return {
        success: true,
        accounts: [],
      };
    }

    const term = searchTerm.trim();
    const fullRegex = new RegExp(escapeRegex(term), "i");
    const tokens = Array.from(
      new Set(
        term
          .split(/[\s()\-_,]+/)
          .map((part) => part.trim())
          .filter((part) => part.length >= 2),
      ),
    );
    const tokenRegexes = tokens.map((token) => new RegExp(escapeRegex(token), "i"));
    const userRegexes = [fullRegex, ...tokenRegexes];

    // Find users matching name or email (case-insensitive)
    const users = await User.find({
      $or: userRegexes.flatMap((regex) => [
        { name: { $regex: regex } },
        { email: { $regex: regex } },
      ]),
    }).select("_id name email");

    console.log(
      "[searchAccounts] Found users:",
      users.length,
      users.map((u) => ({ _id: u._id, name: u.name, email: u.email })),
    );

    const userIds = users.map((u) => u._id);

    // Find accounts:
    // 1. Belonging to matched users
    // 2. OR matching account holder / account number by safe regex tokens
    const accountRegexes = [fullRegex, ...tokenRegexes];
    const numericRegexes = tokens
      .filter((token) => /^\d+$/.test(token))
      .map((token) => new RegExp(escapeRegex(token), "i"));

    const accountOrFilters = [];
    if (userIds.length > 0) {
      accountOrFilters.push({ user: { $in: userIds } });
    }
    accountRegexes.forEach((regex) => {
      accountOrFilters.push({ accountHolderName: { $regex: regex } });
    });
    numericRegexes.forEach((regex) => {
      accountOrFilters.push({ accountNumber: { $regex: regex } });
    });

    const accounts = await Account.find({
      $or: accountOrFilters,
    })
      .populate("user", "name email")
      .select("_id type balance accountNumber status user accountHolderName");

    console.log("[searchAccounts] Found accounts:", accounts.length);

    // Add user info to each account for display
    const accountsWithUserInfo = accounts.map((acc) => {
      // Handle orphaned accounts where user is null
      const userName = acc.user?.name || acc.accountHolderName || "Unknown";
      const userEmail = acc.user?.email || "Unknown";

      const mapped = {
        _id: acc._id,
        type: acc.type,
        balance: acc.balance,
        accountNumber: acc.accountNumber,
        status: acc.status,
        userName,
        userEmail,
      };
      console.log(
        "[searchAccounts] Mapping account:",
        acc._id,
        "user field:",
        acc.user,
        "accountHolderName:",
        acc.accountHolderName,
        "-> userName:",
        mapped.userName,
        "userEmail:",
        mapped.userEmail,
      );
      return mapped;
    });

    return {
      success: true,
      accounts: accountsWithUserInfo,
    };
  } catch (error) {
    console.error("[searchAccounts] Error:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

// Get account count by date range
const getAccountCountByDateRange = async (startDate, endDate) => {
  try {
    const count = await getAccountCountByDateRangeCached({
      startDate,
      endDate,
    });
    return {
      success: true,
      count,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// Get balance change percentage for an account
const getBalanceChange = async (userId) => {
  try {
    // Get current date and previous month's date
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get user's accounts
    const accounts = await Account.find({ user: userId });
    const accountIds = accounts.map((account) => account._id);

    // Get transactions for the current and previous month
    const currentMonthTransactions = await Transaction.find({
      $or: [
        { fromAccount: { $in: accountIds } },
        { accountId: { $in: accountIds } },
      ],
      date: { $gte: currentMonth },
    });

    const previousMonthTransactions = await Transaction.find({
      $or: [
        { fromAccount: { $in: accountIds } },
        { accountId: { $in: accountIds } },
      ],
      date: {
        $gte: previousMonth,
        $lte: previousMonthEnd,
      },
    });

    // Calculate current total balance for this user
    const currentBalance = await Account.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: "$balance" } } },
    ]).then((res) => (res.length > 0 ? res[0].total : 0));

    // Calculate previous month's end balance
    let previousBalance = currentBalance;

    // Apply all current month's transactions in reverse to get previous month's balance
    currentMonthTransactions.forEach((transaction) => {
      if (transaction.type === "deposit") {
        previousBalance -= transaction.amount;
      } else if (
        transaction.type === "withdrawal" ||
        transaction.type === "transfer"
      ) {
        previousBalance += transaction.amount;
      }
    });

    // Calculate percentage change
    const percentageChange =
      previousBalance === 0
        ? 100 // If previous balance was 0, treat it as 100% increase
        : ((currentBalance - previousBalance) / Math.abs(previousBalance)) *
          100;

    return {
      success: true,
      percentageChange: Number(percentageChange.toFixed(2)),
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

module.exports = {
  createAccount,
  getAccountsByUserId,
  getAccountById,
  getCurrentlyActiveAccountCount,
  getAllAccounts,
  getAccountCountByDateRange,
  getBalanceChange,
  searchAccounts,
};
