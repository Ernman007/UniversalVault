const express = require('express');
const router = express.Router();
const adminLoanController = require('../../controllers/admin/loanController');
const { protect } = require('../../middleware/authMiddleware');
const { admin } = require('../../middleware/adminMiddleware');

/**
 * @swagger
 * /api/admin/loans:
 *   get:
 *     summary: Get all loan applications (admin only)
 *     tags: [Admin Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, under_review]
 *     responses:
 *       200:
 *         description: List of loan applications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 applications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LoanApplication'
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get('/', protect, admin, adminLoanController.getAllLoanApplications);

/**
 * @swagger
 * /api/admin/loans/{id}/status:
 *   put:
 *     summary: Update loan application status (admin only)
 *     tags: [Admin Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Loan application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected, under_review]
 *     responses:
 *       200:
 *         description: Updated loan application
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoanApplication'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Loan application not found
 *       500:
 *         description: Server error
 */
router.put('/:id/status', protect, admin, adminLoanController.updateLoanApplicationStatus);

module.exports = router;