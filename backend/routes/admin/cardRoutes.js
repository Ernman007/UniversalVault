const express = require('express');
const router = express.Router();
const { protect, admin } = require('../../middleware/authMiddleware');
const cardController = require('../../controllers/cardController');

router.use(protect);
router.use(admin);

router.post('/card-transactions', cardController.createCardTransaction);

module.exports = router;
