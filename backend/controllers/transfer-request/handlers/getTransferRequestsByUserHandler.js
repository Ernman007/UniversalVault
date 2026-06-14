const { getTransferRequestsByUserId } = require('../services/transferRequestService');

// @desc    Get transfer requests for a specific user
// @route   GET /api/transfer-requests/user/:userId
// @access  Private/Admin
exports.getTransferRequestsByUserId = async (req, res) => {
  try {
    const transferRequests = await getTransferRequestsByUserId(req.params.userId);
    res.json(transferRequests.map(t => t.toObject ? t.toObject() : t));
  } catch (error) {
    console.error('Error fetching user transfer requests:', error);
    res.status(500).json({ message: 'Error fetching user transfer requests', error: error.message });
  }
};