const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { protect } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

/**
 * @swagger
 * /api/accounts:
 *   post:
 *     summary: Create a new account for a user
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, type]
 *             properties:
 *               userId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [savings, checking, investment]
 *               initialDeposit:
 *                 type: number
 *               bankName:
 *                 type: string
 *               accountHolderName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       500:
 *         description: Error creating account
 *   get:
 *     summary: Get accounts for the authenticated user
 *     tags: [Accounts]
 *     responses:
 *       200:
 *         description: List of accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Account'
 */
// Place specific routes before parameter routes
router.post('/', accountController.createAccount);
router.get('/', accountController.getAccounts);
router.get('/search', accountController.searchAccounts);

/**
 * @swagger
 * /api/accounts/all:
 *   get:
 *     summary: Get all accounts (admin)
 *     tags: [Accounts]
 *     responses:
 *       200:
 *         description: List of all accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Account'
 */
router.get('/all', accountController.getAllAccounts);

/**
 * @swagger
 * /api/accounts/count:
 *   get:
 *     summary: Get account count within an optional date range
 *     tags: [Accounts]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Account count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 */
router.get('/count', accountController.getAccountCountByDateRange);

/**
 * @swagger
 * /api/accounts/active/count:
 *   get:
 *     summary: Get count of active accounts
 *     tags: [Accounts]
 *     responses:
 *       200:
 *         description: Active account count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 */
router.get('/active/count', accountController.getCurrentlyActiveAccountCount);
router.get('/balance-change', accountController.getBalanceChange);

// Parameter routes should come last
router.get('/user/:userId', accountController.getAccountsByUserId);
router.get('/:id', accountController.getAccountById);

module.exports = router;
