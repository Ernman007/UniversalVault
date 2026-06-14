const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9]{10}$/, 'Please fill a valid phone number (10 digits)']
  },
  address: {
    type: String,
    trim: true
  },
  dob: {
    type: Date
  },
  password: {
    type: String,
    trim: true,
    minlength: [8, 'Password should be at least 8 characters long']
  },
  accountType: {
    type: String,
    enum: ['savings', 'checking', 'investment', 'business'],
    trim: true
  },
  image: {
    type: String,  // Store base64 image data
    validate: {
      validator: function(v) {
        // Basic validation for base64 image data
        if (!v) return true; // Allow empty
        return v.startsWith('data:image') || v.startsWith('/uploads/');
      },
      message: 'Invalid image format'
    }
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  metadata: { // Added metadata field
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    dob: { type: Date },
    accountType: { type: String, enum: ['savings', 'checking', 'investment', 'business'], trim: true },
    identificationDocument: { type: String }, // Store image URL/path
    idempotencyKey: { type: String, trim: true },
    userId: { type: String, trim: true }, // For existing users
    isExistingUser: { type: Boolean, default: false },
    initialDeposit: { type: Number, default: 0 },
    sourceAccountId: { type: String, trim: true }
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  message: {
    type: String,
    required: true
  },
  adminReply: {
    type: String,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['support', 'account-request'],
    default: 'support'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'pending', 'approved', 'rejected', 'closed'],
    default: 'open'
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
const STATUS_TRANSITIONS = {
  open:        ['in-progress', 'pending', 'closed'],
  'in-progress': ['pending', 'approved', 'rejected', 'closed'],
  pending:     ['approved', 'rejected', 'closed'],
  approved:    ['closed'],
  rejected:    ['closed'],
  closed:      []
};

supportMessageSchema.pre('save', function(next) {
  this._previousStatus = this._doc.status;
  this.updatedAt = Date.now();
  if (this.isModified('status') && !this.isNew) {
    const prev = this._previousStatus;
    if (prev !== undefined && prev !== this.status) {
      // Only validate if status is actually changing
      const allowed = STATUS_TRANSITIONS[prev];
      if (!allowed || !allowed.includes(this.status)) {
        return next(new Error(`Invalid status transition from '${prev}' to '${this.status}'`));
      }
    }
  }
  next();
});

supportMessageSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update && update.status !== undefined) {
    const query = this.getQuery();
    SupportMessage.findById(query._id).then((doc) => {
      if (doc) {
        // Allow same-status updates (no transition needed)
        if (doc.status === update.status) {
          return next();
        }
        const allowed = STATUS_TRANSITIONS[doc.status];
        if (!allowed || !allowed.includes(update.status)) {
          return next(new Error(`Invalid status transition from '${doc.status}' to '${update.status}'`));
        }
      }
      next();
    }).catch(next);
  } else {
    next();
  }
});

module.exports = mongoose.model('SupportMessage', supportMessageSchema);
