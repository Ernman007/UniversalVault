const { deleteTransfer } = require('../services/transferRequestService');
const { logActivity } = require('../../../services/activityLogService');

// @desc    Delete transfer request
// @route   DELETE /api/transfer-requests/:id
// @access  Private/Admin
exports.deleteTransferRequest = async (req, res) => {
  console.log('[TRANSFER-REQUEST] Delete:', { requestId: req.params?.id, adminId: req.user?._id, correlationId: req.correlationId });
  try {
    const { id } = req.params;
    const adminUserId = req.user._id;

    const result = await deleteTransfer({ requestId: id });

    if (!result.success) {
      return res.status(result.statusCode).json({ message: result.message });
    }

    const { transferRequest } = result;

    await logActivity({
      userId: adminUserId,
      action: 'Deleted Transfer Request',
      metadata: {
        transferRequest: transferRequest._id,
        deletedBy: adminUserId
      }
    });

    res.json({ message: 'Transfer request deleted successfully' });
  } catch (error) {
    console.error('Error deleting transfer request:', error);
    res.status(500).json({ message: 'Error deleting transfer request', error: error.message });
  }
};