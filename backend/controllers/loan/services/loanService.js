const LoanApplication = require('../../../models/loan/loanApplication');
const User = require('../../../models/user');
const { logActivity } = require('../../../services/activityLogService');
const { createNotification } = require('../../notificationController');
const { encryptPII } = require('../../../utils/encryption');

// Submit a new loan application
const submitLoanApplication = async (userId, applicationData, files) => {
  try {
    // Get user's credit score (in a real app, this would come from a credit bureau)
    const user = await User.findById(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Create the loan application
    const loanApplication = new LoanApplication({
      user: userId,
      amount: applicationData.amount,
      term: applicationData.term,
      purpose: applicationData.purpose,
      creditScore: user.creditScore || 0, // Use user's credit score or default to 0
      documents: files.map(file => ({
        name: file.originalname,
        url: `/uploads/${file.filename}`, // Construction the URL for the GridFS stream
        encrypted: false // Will be updated after encryption
      }))
    });

    // Calculate interest rate and monthly payment
    const interestRate = calculateInterestRate(loanApplication.creditScore);
    loanApplication.interestRate = interestRate;
    loanApplication.monthlyPayment = calculateMonthlyPayment(
      loanApplication.amount,
      interestRate,
      loanApplication.term
    );
    loanApplication.remainingAmount = loanApplication.amount;

    // Encrypt PII in documents
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('Missing ENCRYPTION_KEY');
    }
    for (const document of loanApplication.documents) {
      try {
        const encryptedData = encryptPII(document.name, encryptionKey);
        document.name = encryptedData.encryptedData;
        document.iv = encryptedData.iv;
        document.authTag = encryptedData.authTag;
        document.encrypted = true;
      } catch (encryptError) {
        console.error('Error encrypting document name:', encryptError);
        // Continue with encryption for other documents
      }
    }

    await loanApplication.save();

    // Log activity
    await logActivity({
      userId,
      action: 'Submit Loan Application',
      metadata: {
        loanApplicationId: loanApplication._id,
        amount: loanApplication.amount,
        term: loanApplication.term
      }
    });

    // Create notification
    await createNotification(
      userId,
      'info',
      `Your loan application for $${loanApplication.amount} has been submitted.`
    );

    return {
      success: true,
      loanApplication
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error submitting loan application',
      error: error.message
    };
  }
};

// Get personalized loan offers based on credit score
const getLoanOffers = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Generate personalized offers based on credit score
    const offers = generateLoanOffers(user.creditScore);

    return {
      success: true,
      offers
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error retrieving loan offers',
      error: error.message
    };
  }
};

// Get repayment schedule for a loan
const getRepaymentSchedule = async (loanId, userId) => {
  try {
    const loanApplication = await LoanApplication.findOne({
      _id: loanId,
      user: userId
    });

    if (!loanApplication) {
      return {
        success: false,
        message: 'Loan application not found'
      };
    }

    // Generate repayment schedule
    const schedule = generateRepaymentSchedule(
      loanApplication.amount,
      loanApplication.interestRate,
      loanApplication.term,
      loanApplication.createdAt
    );

    return {
      success: true,
      schedule,
      outstandingBalance: loanApplication.amount // In a real app, this would be calculated based on payments made
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error retrieving repayment schedule',
      error: error.message
    };
  }
};

// Helper function to calculate interest rate based on credit score
const calculateInterestRate = (creditScore) => {
  // Simple model: higher credit score = lower interest rate
  if (creditScore >= 750) return 3.5;
  if (creditScore >= 700) return 4.5;
  if (creditScore >= 650) return 6.0;
  if (creditScore >= 600) return 8.0;
  return 12.0; // Default high rate for lower credit scores
};

// Helper function to calculate monthly payment
const calculateMonthlyPayment = (principal, annualRate, termMonths) => {
  const monthlyRate = annualRate / 100 / 12;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));
};

// Helper function to generate personalized loan offers
const generateLoanOffers = (creditScore) => {
  const offers = [];
  
  // Different offer amounts based on credit score
  const maxAmount = creditScore >= 700 ? 50000 : 
                   creditScore >= 650 ? 30000 : 
                   creditScore >= 600 ? 15000 : 5000;
  
  // Terms: 12, 24, 36, 48, 60 months
  const terms = [12, 24, 36, 48, 60];
  
  for (const term of terms) {
    const amount = Math.min(maxAmount, term * 500); // Adjust amount based on term
    const interestRate = calculateInterestRate(creditScore);
    const monthlyPayment = calculateMonthlyPayment(amount, interestRate, term);
    
    offers.push({
      amount,
      term,
      interestRate,
      monthlyPayment
    });
  }
  
  return offers;
};

// Helper function to generate repayment schedule
const generateRepaymentSchedule = (principal, annualRate, termMonths, startDate) => {
  const schedule = [];
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termMonths);
  
  let remainingBalance = principal;
  const start = new Date(startDate);
  
  for (let i = 1; i <= termMonths; i++) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    remainingBalance -= principalPayment;
    
    // Ensure we don't go below zero due to floating point precision
    if (remainingBalance < 0) remainingBalance = 0;
    
    const paymentDate = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
    
    schedule.push({
      paymentNumber: i,
      paymentDate,
      paymentAmount: monthlyPayment,
      principalPayment,
      interestPayment,
      remainingBalance
    });
  }
  
  return schedule;
};

const getUserLoanApplications = async (userId) => {
  try {
    const applications = await LoanApplication.find({ user: userId }).sort({ createdAt: -1 });
    return { success: true, applications };
  } catch (error) {
    return { success: false, message: 'Error retrieving loan applications', error: error.message };
  }
};

const makePayment = async (loanId, userId, amount) => {
  try {
    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return { success: false, message: 'Payment amount must be a positive number' };
    }
    const loan = await LoanApplication.findOne({ _id: loanId, user: userId });
    if (!loan) {
      return { success: false, message: 'Loan not found' };
    }
    if (loan.status !== 'approved') {
      return { success: false, message: 'Loan is not in approved state' };
    }
    if (typeof loan.remainingAmount !== 'number' || Number.isNaN(loan.remainingAmount)) {
      loan.remainingAmount = loan.amount;
    }
    loan.remainingAmount = Math.max(0, loan.remainingAmount - normalizedAmount);
    await loan.save();
    await logActivity({ userId, action: 'Loan Payment', metadata: { loanId, amount: normalizedAmount, remaining: loan.remainingAmount } });
    return { success: true, remainingAmount: loan.remainingAmount };
  } catch (error) {
    return { success: false, message: 'Error processing payment', error: error.message };
  }
};

module.exports = {
  submitLoanApplication,
  getLoanOffers,
  getRepaymentSchedule,
  getUserLoanApplications,
  makePayment
};
