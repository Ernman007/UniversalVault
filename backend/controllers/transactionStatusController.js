const Transaction = require('../models/transaction');
const { createNotification } = require('./notificationController');
const { logActivity } = require('../services/activityLogService');

exports.updateTransactionStatus = async (req, res) => {
  const { transactionId } = req.params;
  const { status, reason } = req.body;

  if (!['Pending', 'Confirmed', 'Cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status provided' });
  }

  try {
    const transaction = await Transaction.findById(transactionId).populate('userId');
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const previousStatus = transaction.status;
    transaction.status = status;
    await transaction.save();

    await logActivity({
      userId: req.user?._id || transaction.userId?._id,
      action: 'Update Transaction Status',
      metadata: {
        transaction: transaction._id,
        previousStatus,
        newStatus: status,
        reason: reason || null
      }
    });

    if (transaction.userId?._id) {
      await createNotification(
        transaction.userId._id,
        status === 'Cancelled' ? 'warning' : 'info',
        `Your transaction ${transaction.transactionId} status changed to ${status}${reason ? `: ${reason}` : ''}`
      );
    }

    res.json({
      message: 'Transaction status updated successfully',
      transaction
    });
  } catch (error) {
    console.warn(`Failed to update transaction status for ${transactionId}: ${error.message}`);
    res.status(500).json({
      message: 'Error updating transaction status',
      error: error.message
    });
  }
};
