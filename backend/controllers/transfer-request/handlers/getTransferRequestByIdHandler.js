const { getTransferRequestByIdForUser } = require('../services/transferRequestService');

exports.getTransferRequestById = async (req, res) => {
  console.log('[TRANSFER-REQUEST] Get by ID:', { requestId: req.params?.id, userId: req.user?._id, correlationId: req.correlationId });
  try {
    const transferRequest = await getTransferRequestByIdForUser(req.params.id, req.user._id);
    if (!transferRequest) {
      return res.status(404).json({ message: 'Transfer request not found' });
    }
    res.json({ success: true, data: transferRequest.toObject ? transferRequest.toObject() : transferRequest });
  } catch (error) {
    console.error('Error fetching transfer request:', error);
    res.status(500).json({ message: 'Error fetching transfer request', error: error.message });
  }
};