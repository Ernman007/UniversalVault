const Beneficiary = require('../models/beneficiary');

const normalizePayload = (payload) => ({
  nickname: typeof payload.nickname === 'string' ? payload.nickname.trim() : undefined,
  accountNumber: typeof payload.accountNumber === 'string' ? payload.accountNumber.trim() : undefined,
  bankName: typeof payload.bankName === 'string' ? payload.bankName.trim() : undefined,
  swiftCode: typeof payload.swiftCode === 'string' ? payload.swiftCode.trim().toUpperCase() : undefined,
  accountHolderName:
    typeof payload.accountHolderName === 'string' ? payload.accountHolderName.trim() : undefined
});

const pickDefined = (payload) => Object.fromEntries(
  Object.entries(payload).filter(([, value]) => value !== undefined)
);

const listByUser = async (userId) => Beneficiary.find({ userId }).sort({ createdAt: -1 }).lean();

const createForUser = async (userId, payload) => {
  const normalized = pickDefined(normalizePayload(payload));
  const duplicate = await Beneficiary.findOne({
    userId,
    accountNumber: normalized.accountNumber,
    swiftCode: normalized.swiftCode || { $in: [null, ''] }
  }).lean();
  if (duplicate) {
    const error = new Error('Beneficiary already exists');
    error.statusCode = 409;
    throw error;
  }
  return Beneficiary.create({ userId, ...normalized });
};

const updateForUser = async (userId, beneficiaryId, payload) => {
  const normalized = pickDefined(normalizePayload(payload));
  if (!Object.keys(normalized).length) {
    const error = new Error('No valid fields to update');
    error.statusCode = 400;
    throw error;
  }
  const current = await Beneficiary.findOne({ _id: beneficiaryId, userId }).lean();
  if (!current) {
    return null;
  }
  const nextAccountNumber = normalized.accountNumber || current.accountNumber;
  const nextSwiftCode = normalized.swiftCode !== undefined ? normalized.swiftCode : current.swiftCode;
  if (nextAccountNumber) {
    const existing = await Beneficiary.findOne({
      _id: { $ne: beneficiaryId },
      userId,
      accountNumber: nextAccountNumber,
      swiftCode: nextSwiftCode || { $in: [null, ''] }
    }).lean();
    if (existing) {
      const error = new Error('Beneficiary already exists');
      error.statusCode = 409;
      throw error;
    }
  }
  return Beneficiary.findOneAndUpdate(
    { _id: beneficiaryId, userId },
    normalized,
    { new: true, runValidators: true }
  );
};

const deleteForUser = async (userId, beneficiaryId) => Beneficiary.findOneAndDelete({
  _id: beneficiaryId,
  userId
});

module.exports = {
  listByUser,
  createForUser,
  updateForUser,
  deleteForUser
};
