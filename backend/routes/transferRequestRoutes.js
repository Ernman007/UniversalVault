const express = require('express');
const router = express.Router();
const { createRequest } = require('../controllers/transfer-request/handlers/createRequestHandler');
const { verifyTransferRequest } = require('../controllers/transfer-request/handlers/verifyTransferHandler');
const { getTransferRequests } = require('../controllers/transfer-request/handlers/getTransferRequestsHandler');
const { getTransferRequestById } = require('../controllers/transfer-request/handlers/getTransferRequestByIdHandler');
const { getTransferRequestsByUserId } = require('../controllers/transfer-request/handlers/getTransferRequestsByUserHandler');
const { manageTransferRequest } = require('../controllers/transfer-request/handlers/manageTransferHandler');
const { deleteTransferRequest } = require('../controllers/transfer-request/handlers/deleteTransferHandler');
const { protect } = require('../middleware/authMiddleware');
const {admin} = require('../middleware/adminMiddleware');

router.use(protect); // Protect all routes below this middleware

router.post('/', createRequest);
router.post('/verify', verifyTransferRequest); // Verification endpoint
router.get('/verify/:requestId', verifyTransferRequest); // GET endpoint for verification

// User-accessible transfer status endpoint
router.get('/:id', getTransferRequestById);

// Admin routes - apply adminProtect middleware
router.put('/:id/manage', admin, manageTransferRequest);
router.delete('/:id', admin, deleteTransferRequest);
router.get('/', admin, getTransferRequests);
router.get('/user/:userId', admin, getTransferRequestsByUserId);

module.exports = router;