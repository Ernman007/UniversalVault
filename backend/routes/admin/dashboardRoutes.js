const express = require('express');
const router = express.Router();
const { getDashboardMetrics } = require('../../controllers/admin/dashboardController');
const { protect, admin } = require('../../middleware/authMiddleware');

router.use(protect);
router.use(admin);

router.get('/metrics', getDashboardMetrics);

module.exports = router;
