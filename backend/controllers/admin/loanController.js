const LoanApplication = require('../../models/loan/loanApplication');
const { decryptPII } = require('../../utils/encryption');

const getEncryptionKey = () => {
  const key = typeof process.env.ENCRYPTION_KEY === 'string'
    ? process.env.ENCRYPTION_KEY.trim()
    : '';
  if (!key) {
    return null;
  }
  if (process.env.NODE_ENV === 'production' && key.toLowerCase() === 'default-key') {
    throw new Error('ENCRYPTION_KEY is using an insecure default value');
  }
  return key;
};

// Get all loan applications for admin dashboard
const getAllLoanApplications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }
    
    // Get loan applications with pagination
    const loanApplications = await LoanApplication.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    // Get total count
    const total = await LoanApplication.countDocuments(query);
    
    // Decrypt document names for display
    const encryptionKey = getEncryptionKey();
    const applicationsWithDecryptedDocs = loanApplications.map(app => {
      const decryptedApp = app.toObject();
      decryptedApp.documents = decryptedApp.documents.map(doc => {
        if (doc.encrypted) {
          if (!encryptionKey) {
            return doc;
          }
          try {
            const decryptedName = decryptPII(
              doc.name,
              doc.iv,
              doc.authTag,
              encryptionKey
            );
            doc.name = decryptedName;
          } catch (decryptError) {
            console.error('Error decrypting document name:', decryptError);
            // Keep encrypted name if decryption fails
          }
        }
        return doc;
      });
      return decryptedApp;
    });
    
    res.json({
      applications: applicationsWithDecryptedDocs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving loan applications', 
      error: error.message 
    });
  }
};

// Update loan application status
const updateLoanApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'under_review'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      });
    }
    
    // Update loan application
    const loanApplication = await LoanApplication.findByIdAndUpdate(
      id, 
      { status },
      { new: true }
    ).populate('user', 'name email');
    
    if (!loanApplication) {
      return res.status(404).json({ message: 'Loan application not found' });
    }
    
    res.json(loanApplication);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating loan application status', 
      error: error.message 
    });
  }
};

module.exports = {
  getAllLoanApplications,
  updateLoanApplicationStatus
};
