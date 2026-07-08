const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Allow anonymous donations
  isAnonymous: { type: Boolean, default: false },
  donorName: String,
  donorEmail: String,
  // Amount details
  amount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, required: true, default: 'USD' },
  // Converted to base currency for accounting
  amountUSD: { type: Number, required: true },
  exchangeRateUsed: Number,
  // After platform fee
  netAmount: { type: Number },
  platformFee: { type: Number },
  platformFeePercentage: { type: Number },
  // Recurring
  isRecurring: { type: Boolean, default: false },
  recurringInterval: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
  },
  recurringSubscriptionId: String,
  // Payment details
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'mobile_money', 'paypal', 'crypto', 'stripe', 'flutterwave', 'paystack'],
    required: true
  },
  paymentProvider: String,
  paymentReference: { type: String, unique: true },
  externalTransactionId: String,
  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'disputed', 'cancelled'],
    default: 'pending'
  },
  failureReason: String,
  // Blockchain
  blockchainTxHash: String,
  blockchainNetwork: String,
  blockchainConfirmations: { type: Number, default: 0 },
  isOnChain: { type: Boolean, default: false },
  // Message from donor
  message: { type: String, maxlength: 500 },
  // Reward tier selected
  rewardTier: String,
  // Tax receipt
  taxReceiptGenerated: { type: Boolean, default: false },
  taxReceiptUrl: String,
  // Fraud detection
  ipAddress: String,
  userAgent: String,
  riskScore: Number,
  isFlagged: { type: Boolean, default: false },
  flagReason: String,
  // Refund info
  refundedAt: Date,
  refundAmount: Number,
  refundReason: String,
  refundTransactionId: String,
  // Metadata
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Indexes
donationSchema.index({ campaign: 1, status: 1 });
donationSchema.index({ donor: 1 });
donationSchema.index({ paymentReference: 1 }, { unique: true });
donationSchema.index({ status: 1 });
donationSchema.index({ createdAt: -1 });
donationSchema.index({ 'blockchainTxHash': 1 }, { sparse: true });
donationSchema.index({ isRecurring: 1, recurringSubscriptionId: 1 });

module.exports = mongoose.model('Donation', donationSchema);
