const mongoose = require('mongoose');
const crypto = require('crypto');

const requestTransferSchema = new mongoose.Schema({
  fromAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  toAccount: { type: String, required: true }, // Can be account number or IBAN
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  description: { type: String },
  swiftCode: { type: String, default: 'SPLYBN688' },
  status: { type: String, enum: ['pending', 'pending_admin', 'approved', 'rejected', 'expired'], default: 'pending' },
  transferType: { type: String, enum: ['own_account', 'in_bank_other_user', 'external', 'interbank', 'international'], required: true },
  code: { type: String, required: true },
  codeExpires: { type: Date, required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bankName: { type: String },
  accountHolderName: { type: String },
  idempotencyKey: { type: String, sparse: true },
  rejectionReason: { type: String },
  expiresAt: { type: Date },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }
}, { timestamps: true });

const STATUS_TRANSITIONS = {
  pending:     ['pending_admin', 'rejected', 'expired'],
  pending_admin: ['approved', 'rejected', 'expired'],
  approved:    [],
  rejected:    [],
  expired:     []
};

requestTransferSchema.index({ status: 1, createdAt: -1, requestedBy: 1 });
requestTransferSchema.index({ requestedBy: 1, createdAt: -1 });
requestTransferSchema.index({ fromAccount: 1, createdAt: -1 });

requestTransferSchema.pre('validate', function(next) {
  if (this.isNew) {
    const code = crypto.randomInt(100000, 999999).toString();
    this.code = code;
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10);
    this.codeExpires = expiryTime;
    const expiresAt = new Date(this.codeExpires);
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    this.expiresAt = expiresAt;
  }
  next();
});

requestTransferSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    const prev = this._previousStatus;
    if (prev) {
      const allowed = STATUS_TRANSITIONS[prev];
      if (!allowed || !allowed.includes(this.status)) {
        return next(new Error(`Invalid status transition from '${prev}' to '${this.status}'`));
      }
    }
  }
  next();
});

requestTransferSchema.methods.isExpired = function() {
  return this.status === 'pending_admin' && this.expiresAt && new Date() > this.expiresAt;
};

// Validate IBAN or account number format
requestTransferSchema.path('toAccount').validate(function(value) {
  // Basic IBAN format check (simplified)
  const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,}$/;
  // Basic account number check (simplified)
  const accountRegex = /^[0-9]{8,}$/;
  
  return ibanRegex.test(value) || accountRegex.test(value);
}, 'Invalid IBAN or account number format');

module.exports = mongoose.model('TransferRequest', requestTransferSchema);
