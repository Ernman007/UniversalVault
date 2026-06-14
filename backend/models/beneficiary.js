const mongoose = require('mongoose');

const beneficiarySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nickname: { type: String, required: true, maxlength: 100 },
  accountNumber: { type: String, required: true },
  bankName: { type: String },
  swiftCode: { type: String },
  accountHolderName: { type: String }
}, { timestamps: true });

beneficiarySchema.index({ userId: 1 });
beneficiarySchema.index({ userId: 1, accountNumber: 1, swiftCode: 1 });

module.exports = mongoose.model('Beneficiary', beneficiarySchema);
