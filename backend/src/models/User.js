const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true, maxlength: 50 },
  lastName: { type: String, required: true, trim: true, maxlength: 50 },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-()]{7,15}$/, 'Please enter a valid phone number']
  },
  password: { type: String, minlength: 8, select: false },
  role: {
    type: String,
    enum: ['donor', 'creator', 'admin', 'superadmin'],
    default: 'donor'
  },
  avatar: { type: String, default: '' },
  bio: { type: String, maxlength: 500 },
  location: {
    country: String,
    city: String,
    village: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  preferredLanguage: {
    type: String,
    enum: ['en', 'fr', 'es', 'ar', 'wo'],
    default: 'en'
  },
  preferredCurrency: {
    type: String,
    default: 'USD'
  },
  // OAuth providers
  googleId: { type: String, sparse: true },
  facebookId: { type: String, sparse: true },
  authProvider: {
    type: String,
    enum: ['local', 'google', 'facebook'],
    default: 'local'
  },
  // Email/Phone verification
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  phoneVerificationCode: String,
  phoneVerificationExpires: Date,
  // 2FA
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, select: false },
  twoFactorBackupCodes: { type: [String], select: false },
  // Password reset
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: Date,
  // Account status
  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  banReason: String,
  // KYC/AML
  kycStatus: {
    type: String,
    enum: ['pending', 'submitted', 'verified', 'rejected'],
    default: 'pending'
  },
  kycDocuments: [{
    type: { type: String },
    url: String,
    uploadedAt: Date
  }],
  // Blockchain wallet
  walletAddress: { type: String, trim: true },
  // Statistics
  totalDonated: { type: Number, default: 0 },
  totalRaised: { type: Number, default: 0 },
  campaignsCreated: { type: Number, default: 0 },
  // Notifications
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true }
  },
  // Social verification
  isVerifiedCreator: { type: Boolean, default: false },
  verificationBadge: String,
  // Session tracking
  lastLogin: Date,
  lastLoginIP: String,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ facebookId: 1 }, { sparse: true });
userSchema.index({ 'location.country': 1 });
userSchema.index({ role: 1 });
userSchema.index({ kycStatus: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Account lock check
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
  next();
});

// Increment login attempts
userSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  return this.updateOne(updates);
};

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
