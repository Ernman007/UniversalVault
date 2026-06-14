const express = require('express');
const router = express.Router();
const loanController = require('../../controllers/loan/handlers/loanHandler');
const { protect } = require('../../middleware/authMiddleware');

// Protect all routes
router.use(protect);

/**
 * @swagger
 * /api/loans/applications:
 *   post:
 *     summary: Submit a loan application with documents
 *     tags: [Loans]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               term:
 *                 type: number
 *               purpose:
 *                 type: string
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Loan application submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoanApplication'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
const { upload } = require('../../config/gridfs');
router.post('/applications', upload.array('documents', 5), loanController.submitApplication);
router.get('/applications', loanController.getUserApplications);

/**
 * @swagger
 * /api/loans/offers:
 *   get:
 *     summary: Get personalized loan offers based on credit score
 *     tags: [Loans]
 *     responses:
 *       200:
 *         description: List of personalized loan offers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   amount:
 *                     type: number
 *                   term:
 *                     type: number
 *                   interestRate:
 *                     type: number
 *                   monthlyPayment:
 *                     type: number
 *       500:
 *         description: Server error
 */
router.get('/offers', loanController.getOffers);

/**
 * @swagger
 * /api/loans/{id}/repayments:
 *   get:
 *     summary: Get repayment schedule with outstanding balance
 *     tags: [Loans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Loan application ID
 *     responses:
 *       200:
 *         description: Repayment schedule and outstanding balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 schedule:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       paymentNumber:
 *                         type: number
 *                       paymentDate:
 *                         type: string
 *                         format: date-time
 *                       paymentAmount:
 *                         type: number
 *                       principalPayment:
 *                         type: number
 *                       interestPayment:
 *                         type: number
 *                       remainingBalance:
 *                         type: number
 *                 outstandingBalance:
 *                   type: number
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.get('/:id/repayments', loanController.getRepaymentSchedule);
router.post('/:id/pay', loanController.makePaymentHandler);

module.exports = router;
