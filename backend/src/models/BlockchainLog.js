const mongoose = require('mongoose');

const blockchainLogSchema = new mongoose.Schema({
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  donation: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  eventType: {
    type: String,
    enum: [
      'campaign_created', 'donation_made', 'funds_released',
      'refund_issued', 'campaign_cancelled', 'milestone_reached',
      'contract_deployed', 'multisig_signed'
    ],
    required: true
  },
  network: { type: String, enum: ['polygon', 'ethereum', 'mumbai', 'sepolia', 'bsc'], required: true },
  contractAddress: String,
  txHash: { type: String, unique: true, sparse: true },
  blockNumber: Number,
  blockTimestamp: Date,
  from: String,
  to: String,
  value: String,
  gasUsed: Number,
  gasPrice: String,
  confirmations: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending'
  },
  errorMessage: String,
  rawLog: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

blockchainLogSchema.index({ campaign: 1 });
blockchainLogSchema.index({ donation: 1 });
blockchainLogSchema.index({ txHash: 1 });
blockchainLogSchema.index({ eventType: 1 });
blockchainLogSchema.index({ network: 1 });
blockchainLogSchema.index({ status: 1 });

module.exports = mongoose.model('BlockchainLog', blockchainLogSchema);
