const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     LoanApplication:
 *       type: object
 *       required:
 *         - user
 *         - amount
 *         - term
 *         - purpose
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the loan application.
 *         user:
 *           type: string
 *           format: objectId
 *           description: Reference to the applying user.
 *         amount:
 *           type: number
 *           description: Requested loan amount.
 *         term:
 *           type: number
 *           description: Loan term in months.
 *         purpose:
 *           type: string
 *           description: Purpose of the loan.
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected, under_review]
 *           description: Current status of the application.
 *         creditScore:
 *           type: number
 *           description: Applicant's credit score.
 *         documents:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *               encrypted:
 *                 type: boolean
 *           description: Submitted documents.
 *         interestRate:
 *           type: number
 *           description: Assigned interest rate.
 *         monthlyPayment:
 *           type: number
 *           description: Calculated monthly payment.
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
const loanApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  term: { type: Number, required: true, min: 1 }, // Term in months
  purpose: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'under_review'], 
    default: 'pending' 
  },
  creditScore: { type: Number, min: 0, max: 850 },
  documents: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    iv: { type: String },
    authTag: { type: String },
    encrypted: { type: Boolean, default: false }
  }],
  interestRate: { type: Number, min: 0 },
  monthlyPayment: { type: Number, min: 0 },
  remainingAmount: {
    type: Number,
    min: 0,
    default: function defaultRemainingAmount() {
      return this.amount;
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('LoanApplication', loanApplicationSchema);
