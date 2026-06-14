const express = require('express');
const router = express.Router();
const { createUser, getUsers, getUserById, updateUser, deleteUser, getUserCountByDateRange, getActiveUserCount } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

router.use(protect);

// Admin-only routes
router.post('/', admin, createUser);
router.get('/', admin, getUsers);
router.get('/count', admin, getUserCountByDateRange);
router.get('/active/count', admin, getActiveUserCount);
router.put('/:id', admin, updateUser);
router.delete('/:id', admin, deleteUser);

// User can view their own profile, admin can view any
router.get('/:id', getUserById);

module.exports = router;
