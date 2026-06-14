const beneficiaryService = require('../services/beneficiaryService');

const sendError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : error.message;
  return res.status(statusCode).json({ success: false, message });
};

const getBeneficiaries = async (req, res) => {
  try {
    const beneficiaries = await beneficiaryService.listByUser(req.user._id);
    return res.json({ success: true, data: beneficiaries });
  } catch (error) {
    return sendError(res, error);
  }
};

const createBeneficiary = async (req, res) => {
  try {
    const beneficiary = await beneficiaryService.createForUser(req.user._id, req.body);
    return res.status(201).json({ success: true, data: beneficiary });
  } catch (error) {
    return sendError(res, error);
  }
};

const updateBeneficiary = async (req, res) => {
  try {
    const beneficiary = await beneficiaryService.updateForUser(req.user._id, req.params.id, req.body);
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Beneficiary not found' });
    }
    return res.json({ success: true, data: beneficiary });
  } catch (error) {
    return sendError(res, error);
  }
};

const deleteBeneficiary = async (req, res) => {
  try {
    const deleted = await beneficiaryService.deleteForUser(req.user._id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Beneficiary not found' });
    }
    return res.json({ success: true, message: 'Beneficiary deleted' });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  getBeneficiaries,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary
};
