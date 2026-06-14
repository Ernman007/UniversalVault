const { manageTransfer } = require('../services/transferRequestService');
const { createNotification } = require('../../notificationController');
const { logActivity } = require('../../../services/activityLogService');
const { invalidateByPrefix } = require('../../../services/cacheService');
const { emitDashboardMetricsUpdate } = require('../../admin/dashboardController');
const Account = require('../../../models/account');

const normalizeString = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
const isValidObjectId = (v) => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);

// @desc    Manage transfer request (approve/reject)
// @route   PUT /api/transfer-requests/:id/manage
// @access  Private/Admin
exports.manageTransferRequest = async (req, res) => {
  console.log('[TRANSFER-MANAGE] Admin managing transfer:', { requestId: req.params?.id, status: req.body?.status, adminId: req.user?._id, correlationId: req.correlationId });
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const adminUserId = req.user._id;
    const correlationId = req.headers['x-correlation-id'];
    const io = req.app.get('io');

    const result = await manageTransfer({
      requestId: id,
      status,
      adminUserId,
      rejectionReason
    });

    if (!result.success) {
      if (result.statusCode === 410) {
        return res.status(410).json({ message: result.message, status: 'expired' });
      }
      return res.status(result.statusCode).json({ message: result.message });
    }

    const { transferRequest, transaction } = result;

    if (status === 'approved') {
      // Create an approval notification for the sender
      await createNotification(
        transferRequest.requestedBy,
        'success',
        `Your transfer request to ${transferRequest.accountHolderName || transferRequest.toAccount} for ${transferRequest.amount} has been approved.`
      );

      // Notify the recipient if they are an internal user
      if (transaction.toAccount) {
        const recipientAccount = await Account.findById(transaction.toAccount);
        
        // Find the sender's account number suffix
        let senderSuffix = '';
        try {
          const senderAccount = await Account.findById(transferRequest.fromAccount);
          if (senderAccount && senderAccount.accountNumber) {
            senderSuffix = ` (****${senderAccount.accountNumber.slice(-4)})`;
          }
        } catch (e) {
          console.warn('Could not fetch sender account for notification label');
        }

        if (recipientAccount && recipientAccount.user && !recipientAccount.isTemporary) {
          await createNotification(
            recipientAccount.user,
            'success',
            `You have received ${transferRequest.amount} from sender${senderSuffix}.`
          );
          
          // Emit socket for recipient
          if (io) {
            io.of('/notifications').to(`user_${recipientAccount.user}`).emit('notification', {
              type: 'transfer_received',
              message: `You received a transfer of ${transferRequest.amount}.`
            });
          }
        }
      }

      await logActivity({
        userId: adminUserId,
        action: 'Managed Transfer (Approved)',
        metadata: {
          transferRequest: transferRequest._id,
          transaction: transaction._id,
          isInternational: !!transaction._doc?.message,
          bankName: transferRequest.bankName,
          receiverName: transferRequest.accountHolderName,
          managedBy: adminUserId,
          correlationId
        }
      });

      // Invalidate caches
      await invalidateByPrefix('admin_dashboard');
      await invalidateByPrefix(`accounts:${transferRequest.requestedBy}`);
      emitDashboardMetricsUpdate(req.app.get('io')).catch(() => {});

      // Emit real-time WebSocket event
      if (io) {
        io.of('/notifications').to(`user_${transferRequest.requestedBy}`).emit('notification', {
          type: 'transfer_approved',
          message: `Your transfer of ${transferRequest.amount} has been approved.`
        });
      }

      res.json({
        message: transaction._doc?.message || 'Transfer request approved and transaction completed successfully',
        transaction: transaction.toObject ? transaction.toObject() : transaction,
        isInternational: !!transaction._doc?.message
      });
    } else if (status === 'rejected') {
      // Create a rejection notification using the centralized function
      const rejectionMsg = rejectionReason
        ? `Your transfer request to ${transferRequest.accountHolderName || transferRequest.toAccount} for ${transferRequest.amount} has been rejected. Reason: ${rejectionReason}`
        : `Your transfer request to ${transferRequest.accountHolderName || transferRequest.toAccount} for ${transferRequest.amount} has been rejected.`;
      await createNotification(
        transferRequest.requestedBy,
        'error',
        rejectionMsg
      );

      await logActivity({
        userId: adminUserId,
        action: 'Managed Transfer (Rejected)',
        metadata: {
          transferRequest: transferRequest._id,
          rejectionReason,
          managedBy: adminUserId,
          correlationId
        }
      });

      // Invalidate dashboard cache
      await invalidateByPrefix('admin_dashboard');
      emitDashboardMetricsUpdate(req.app.get('io')).catch(() => {});

      // Emit real-time WebSocket event
      if (io) {
        io.of('/notifications').to(`user_${transferRequest.requestedBy}`).emit('notification', {
          type: 'transfer_rejected',
          message: `Your transfer of ${transferRequest.amount} has been rejected.`
        });
      }

      res.json({
        message: 'Transfer request rejected successfully',
        transferRequest: transferRequest.toObject ? transferRequest.toObject() : transferRequest
      });
    }
  } catch (error) {
    console.error('Error managing transfer request:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.manageTransferLegacyShim = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { status, description } = req.body;
    const adminUserId = req.user._id;

    if (!isValidObjectId(transactionId)) {
      return res.status(400).json({
        message: 'Invalid transaction ID',
        code: 'VALIDATION_ERROR',
        errors: { transactionId: 'Transaction ID must be a valid object ID' },
        legacy: true,
        deprecation: {
          route: 'PUT /api/transactions/:transactionId/status',
          replacement: 'PUT /api/transfer-requests/:id/manage',
          migration: 'Use /api/transfer-requests/:id/manage with { status: "approved"|"rejected", rejectionReason? }'
        }
      });
    }

    const allowedStatuses = new Set(['confirmed', 'cancelled']);
    const normalizedStatus = normalizeString(status);
    if (!allowedStatuses.has(normalizedStatus)) {
      return res.status(400).json({
        message: 'Invalid status for legacy shim',
        code: 'VALIDATION_ERROR',
        errors: {
          status: `Legacy transaction status endpoint only supports: confirmed, cancelled`
        },
        legacy: true,
        deprecation: {
          route: 'PUT /api/transactions/:transactionId/status',
          replacement: 'PUT /api/transfer-requests/:id/manage',
          migration: 'Use /api/transfer-requests/:id/manage with { status: "approved"|"rejected", rejectionReason? }'
        }
      });
    }

    const Transaction = require('../../../models/transaction');
    const transaction = await Transaction.findOne({ _id: transactionId }).populate('requestTransferId');
    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found',
        legacy: true,
        deprecation: { route: 'PUT /api/transactions/:transactionId/status', replacement: 'PUT /api/transfer-requests/:id/manage' }
      });
    }

    const requestTransferId = transaction.requestTransferId?._id || transaction.requestTransferId;
    if (!requestTransferId) {
      return res.status(400).json({
        message: 'Transaction is not linked to a transfer request; cannot use legacy admin flow',
        code: 'NOT_TRANSFER_REQUEST_LINKED',
        legacy: true,
        deprecation: {
          route: 'PUT /api/transactions/:transactionId/status',
          replacement: 'PUT /api/transfer-requests/:id/manage',
          migration: 'Direct transaction status mutations without a transfer request are not supported'
        }
      });
    }

    const targetStatus = normalizedStatus === 'confirmed' ? 'approved' : 'rejected';
    const rejectionReason = normalizedStatus === 'rejected' ? (description || 'Rejected via legacy admin flow') : undefined;

    const result = await manageTransfer({
      requestId: requestTransferId.toString(),
      status: targetStatus,
      adminUserId,
      rejectionReason
    });

    if (!result.success) {
      if (result.statusCode === 410) {
        return res.status(410).json({ message: result.message, status: 'expired', legacy: true });
      }
      return res.status(result.statusCode).json({ message: result.message, legacy: true });
    }

    const { transferRequest, transaction: canonicalTransaction } = result;

    if (normalizedStatus === 'confirmed') {
      await createNotification(
        transferRequest.requestedBy,
        'success',
        `Your transfer request to ${transferRequest.toAccount} for ${transferRequest.amount} has been approved.`
      );
      await logActivity({
        userId: adminUserId,
        action: 'Managed Transfer (Approved) [Legacy Shim]',
        metadata: { transferRequest: transferRequest._id, transaction: canonicalTransaction._id, legacyShim: true, correlationId: req.headers['x-correlation-id'] }
      });
      await invalidateByPrefix('admin_dashboard');
      await invalidateByPrefix(`accounts:${transferRequest.requestedBy}`);
      emitDashboardMetricsUpdate(req.app.get('io')).catch(() => {});
      const io = req.app.get('io');
      if (io) {
        io.of('/notifications').to(`user_${transferRequest.requestedBy}`).emit('notification', {
          type: 'transfer_approved',
          message: `Your transfer of $${transferRequest.amount} has been approved.`
        });
      }
    } else {
      const rejectionMsg = rejectionReason
        ? `Your transfer request to ${transferRequest.toAccount} for ${transferRequest.amount} has been rejected. Reason: ${rejectionReason}`
        : `Your transfer request to ${transferRequest.toAccount} for ${transferRequest.amount} has been rejected.`;
      await createNotification(transferRequest.requestedBy, 'error', rejectionMsg);
      await logActivity({
        userId: adminUserId,
        action: 'Managed Transfer (Rejected) [Legacy Shim]',
        metadata: { transferRequest: transferRequest._id, rejectionReason, legacyShim: true, correlationId: req.headers['x-correlation-id'] }
      });
      await invalidateByPrefix('admin_dashboard');
      emitDashboardMetricsUpdate(req.app.get('io')).catch(() => {});
      const io = req.app.get('io');
      if (io) {
        io.of('/notifications').to(`user_${transferRequest.requestedBy}`).emit('notification', {
          type: 'transfer_rejected',
          message: `Your transfer of $${transferRequest.amount} has been rejected.`
        });
      }
    }

    res.status(200).json({
      message: normalizedStatus === 'confirmed'
        ? 'Transaction confirmed and transfer request approved'
        : 'Transaction cancelled and transfer request rejected',
      legacy: true,
      deprecation: {
        route: 'PUT /api/transactions/:transactionId/status',
        replacement: 'PUT /api/transfer-requests/:id/manage',
        migration: 'Please update your client to use PUT /api/transfer-requests/:id/manage'
      },
      transferRequest,
      transaction: canonicalTransaction
    });
  } catch (error) {
    console.error('Error in legacy transaction-status shim:', error);
    res.status(500).json({
      message: error.message,
      legacy: true,
      deprecation: { route: 'PUT /api/transactions/:transactionId/status', replacement: 'PUT /api/transfer-requests/:id/manage' }
    });
  }
};