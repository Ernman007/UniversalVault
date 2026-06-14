const { submitLoanApplication, getLoanOffers, getRepaymentSchedule, getUserLoanApplications, makePayment } = require('../services/loanService');
const { createNotification } = require('../../notificationController');

// Submit loan application handler
const submitApplication = async (req, res) => {
  try {
    const files = req.files || [];
    
    const result = await submitLoanApplication(req.user._id, req.body, files);
    
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }
    
    res.status(201).json(result.loanApplication);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting loan application', error: error.message });
  }
};

// Get loan offers handler
const getOffers = async (req, res) => {
  try {
    const result = await getLoanOffers(req.user._id);
    
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }
    
    res.json(result.offers);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving loan offers', error: error.message });
  }
};

const getUserApplications = async (req, res) => {
  try {
    const result = await getUserLoanApplications(req.user._id);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json(result.applications);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving loan applications', error: error.message });
  }
};

// Get repayment schedule handler
const getRepaymentScheduleHandler = async (req, res) => {
  try {
    const { id: loanId } = req.params;
    const result = await getRepaymentSchedule(loanId, req.user._id);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json({
      schedule: result.schedule,
      outstandingBalance: result.outstandingBalance
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving repayment schedule', error: error.message });
  }
};

// Make loan payment handler
const makePaymentHandler = async (req, res) => {
  try {
    const { id: loanId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid payment amount is required' });
    }

    const result = await makePayment(loanId, req.user._id, amount);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    await createNotification(req.user._id, 'info', `Loan payment of $${amount} processed. Remaining balance: $${result.remainingAmount}`);

    res.json({ message: 'Payment processed successfully', remainingAmount: result.remainingAmount });
  } catch (error) {
    res.status(500).json({ message: 'Error processing payment', error: error.message });
  }
};

module.exports = {
  submitApplication,
  getOffers,
  getUserApplications,
  getRepaymentSchedule: getRepaymentScheduleHandler,
  makePaymentHandler
};
