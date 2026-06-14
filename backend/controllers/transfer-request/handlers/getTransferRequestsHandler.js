const { getAllTransferRequests } = require('../services/transferRequestService');

// @desc    Get transfer requests for logged in user
// @route   GET /api/transfer-requests
// @access  Private
exports.getTransferRequests = async (req, res) => {
  console.log('[TRANSFER-REQUEST] Get all transfer requests (admin):', { adminId: req.user?._id, correlationId: req.correlationId });
  try {
    const transferRequests = await getAllTransferRequests();
    res.json(transferRequests.map(t => t.toObject ? t.toObject() : t));
  } catch (error) {
    console.error('Error fetching transfer requests:', error);
    res.status(500).json({ message: 'Error fetching transfer requests', error: error.message });
  }
};