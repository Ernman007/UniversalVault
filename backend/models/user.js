const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  phone: { type: String },
  address: { type: String },
  dateOfBirth: { type: Date },
  ssn: { type: String, select: false }, // Store encrypted SSN (last 4)
  image: { type: String },
  accounts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Account' }],
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Card PIN fields (user-level PIN for card access)
  cardPin: { type: String, select: false }, // Hashed with bcrypt
  cardPinChangedAt: Date,
  cardPinResetToken: String,
  cardPinResetExpires: Date,
  failedPinAttempts: { type: Number, default: 0 },
  pinLockedUntil: Date, // Lockout timestamp after too many failures
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (this.isModified('email') && this.email) {
    this.email = this.email.trim().toLowerCase();
  }
  // Hash password if modified
  if (this.isModified('password')) {
    // Set passwordChangedAt if password is modified
    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure token is issued after password change
    }
    
    const salt = await bcrypt.genSalt(12); // Increased salt rounds for better security
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  // Hash card PIN if modified
  if (this.isModified('cardPin')) {
    this.cardPinChangedAt = Date.now() - 1000;
    const salt = await bcrypt.genSalt(10); // 10 salt rounds for PIN (slightly faster than password)
    this.cardPin = await bcrypt.hash(this.cardPin, salt);
  }
  
  next();
});

userSchema.methods.matchPassword = function(entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Card PIN methods
userSchema.methods.matchCardPin = function(enteredPin) {
  if (!this.cardPin) return false;
  return bcrypt.compare(enteredPin, this.cardPin);
};

userSchema.methods.createCardPinResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.cardPinResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.cardPinResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

userSchema.methods.isPinLocked = function() {
  return this.pinLockedUntil && this.pinLockedUntil > Date.now();
};

userSchema.methods.getRemainingLockTime = function() {
  if (!this.pinLockedUntil) return 0;
  const remaining = this.pinLockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
};

module.exports = mongoose.model('User', userSchema);
