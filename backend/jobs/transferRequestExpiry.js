const cron = require("node-cron");
const RequestTransfer = require("../models/requestTransfer");
const Transaction = require("../models/transaction");
const {
  invalidateUserTransactions,
} = require("../services/transactionCacheService");

/**
 * Automatically expires TransferRequests that have passed their timeout windows.
 *
 * Two expiry windows exist per request:
 *  - codeExpires (now + 10 min): OTP window. A 'pending' request past this
 *    point can never be verified — cancel it and refund the sender.
 *  - expiresAt (now + 20 min): Admin window. A 'pending_admin' request past
 *    this point will never be actioned — cancel it and refund the sender.
 */
const expireOneRequest = async (request, io) => {
  const tx = request.transactionId;

  if (tx && tx.status === "pending") {
    await Transaction.cancelPendingTransaction(
      tx._id,
      "Transfer request expired",
    );
    await invalidateUserTransactions(request.requestedBy);
  }

  request.status = "expired"; // eslint-disable-line no-param-reassign
  await request.save();

  if (io) {
    io.of("/notifications")
      .to(`user_${request.requestedBy}`)
      .emit("new_notification", {
        type: "transfer_expired",
        message: `Your transfer request of $${request.amount} has expired and your funds have been returned.`,
      });
  }
};

const startTransferExpiryJob = (io) => {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();

      const [expiredOtp, expiredAdmin] = await Promise.all([
        RequestTransfer.find({
          status: "pending",
          codeExpires: { $lt: now },
        }).populate("transactionId"),
        RequestTransfer.find({
          status: "pending_admin",
          expiresAt: { $lt: now },
        }).populate("transactionId"),
      ]);

      const allExpired = [...expiredOtp, ...expiredAdmin];
      if (allExpired.length === 0) return;

      const results = await Promise.allSettled(
        allExpired.map((request) => expireOneRequest(request, io)),
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected");

      if (succeeded > 0) {
        console.log(
          `[TRANSFER-EXPIRY] Expired and refunded ${succeeded} transfer request(s)`,
        );
      }
      failed.forEach((r, i) => {
        console.error(
          `[TRANSFER-EXPIRY] Failed to expire request ${allExpired[i]._id}:`,
          r.reason?.message,
        );
      });
    } catch (error) {
      console.error("[TRANSFER-EXPIRY] Job error:", error.message);
    }
  });
};

module.exports = startTransferExpiryJob;
