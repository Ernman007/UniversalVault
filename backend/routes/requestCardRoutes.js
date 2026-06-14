const express = require('express');
const router = express.Router();
const { createCardRequest, getPendingCardRequests, updateCardRequestStatus } = require('../controllers/requestCardController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

// Regular user routes
router.post('/', protect, createCardRequest);

// Admin routes - apply both protect and admin middleware
router.get('/pending', protect, admin, getPendingCardRequests);
router.put('/:id', protect, admin, updateCardRequestStatus);

module.exports = router;