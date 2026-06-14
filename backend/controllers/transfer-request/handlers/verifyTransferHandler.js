const { verifyTransfer } = require('../services/transferRequestService');
const { createNotification } = require('../../notificationController');
const { logActivity } = require('../../../services/activityLogService');
const { emitDashboardMetricsUpdate } = require('../../admin/dashboardController');

// @desc    Verify transfer code and execute transaction
// @route   POST /api/transfer-requests/verify
// @access  Private
exports.verifyTransferRequest = async (req, res) => {
  console.log('[TRANSFER-VERIFY] Verify request:', { requestId: req.body?.requestId, userId: req.user?._id, correlationId: req.correlationId });
  try {
    const { requestId, code } = req.body;

    const result = await verifyTransfer({
      requestId,
      code,
      userId: req.user._id
    });

    if (!result.success) {
      console.log('[TRANSFER-VERIFY] Verification failed:', { requestId, error: result.message, correlationId: req.correlationId });
      return res.status(result.statusCode).json({ message: result.message });
    }

    const { transfer, transaction, requiresAdminApproval } = result;

    if (requiresAdminApproval) {
      console.log('[TRANSFER-VERIFY] Requires admin approval:', { requestId, transferId: transfer._id, correlationId: req.correlationId });
      await createNotification(
        req.user._id,
        'info',
        `Your transfer of ${transfer.amount} to ${transfer.toAccount} has been verified and is awaiting bank approval.`
      );

      await logActivity({
        userId: req.user._id,
        action: 'Verified Transfer (Pending Admin)',
        metadata: {
          transferRequest: transfer._id,
          transferType: transfer.transferType,
          bankName: transfer.bankName,
          receiverName: transfer.accountHolderName
        }
      });

      // Real-time update for admin dashboard
      emitDashboardMetricsUpdate(req.app.get('io'));

      return res.json({
        message: 'Transfer verified. Awaiting bank approval.',
        transferRequest: transfer,
        status: 'pending_admin'
      });
    }

    await createNotification(
      req.user._id,
      'success',
      `Your transfer of ${transfer.amount} to ${transfer.toAccount} has been completed successfully.`
    );

    await logActivity({
      userId: req.user._id,
      action: 'Verified Transfer',
      metadata: {
        transferRequest: transfer._id,
        transaction: transaction._id,
        isInternational: !!transaction._doc?.message,
        bankName: transfer.bankName,
        receiverName: transfer.accountHolderName
      }
    });

    console.log('[TRANSFER-VERIFY] Transfer completed:', { requestId, transactionId: transaction._id, correlationId: req.correlationId });
    
    // Real-time update for admin dashboard
    emitDashboardMetricsUpdate(req.app.get('io'));

    res.json({
      message: transaction._doc?.message || 'Transfer completed successfully',
      transaction: transaction.toObject ? transaction.toObject() : transaction,
      isInternational: !!transaction._doc?.message
    });

  } catch (error) {
    console.error('Error verifying transfer:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Error processing transfer', error: error.message });
  }
};