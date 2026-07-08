const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['donation', 'payout', 'refund', 'fee', 'transfer'],
    required: true
  },
  donation: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation' },
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  amountUSD: Number,
  description: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'pending'
  },
  provider: String,
  providerTransactionId: String,
  providerResponse: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

transactionSchema.index({ campaign: 1, type: 1 });
transactionSchema.index({ user: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
