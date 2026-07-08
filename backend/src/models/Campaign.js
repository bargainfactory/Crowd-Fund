const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  targetAmount: { type: Number, required: true },
  reachedAt: Date,
  isReached: { type: Boolean, default: false }
});

const updateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  images: [String],
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  postedAt: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 1000 },
  isAnonymous: { type: Boolean, default: false },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

const campaignSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  slug: { type: String, unique: true, lowercase: true },
  description: { type: String, required: true, maxlength: 10000 },
  shortDescription: { type: String, maxlength: 300 },
  category: {
    type: String,
    required: true,
    enum: [
      'community', 'education', 'health', 'infrastructure', 'disaster-relief',
      'environment', 'arts', 'technology', 'agriculture', 'business', 'other'
    ]
  },
  tags: [{ type: String, lowercase: true }],
  // Media
  coverImage: { type: String, required: true },
  images: [String],
  videoUrl: String,
  // Creators and co-managers
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coManagers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Financials
  targetAmount: { type: Number, required: true, min: 1 },
  raisedAmount: { type: Number, default: 0 },
  donorCount: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  // Timeline
  startDate: { type: Date, default: Date.now },
  deadline: { type: Date, required: true },
  // Location
  location: {
    country: { type: String, required: true },
    region: String,
    city: String,
    village: String,
    coordinates: { lat: Number, lng: Number }
  },
  // Status
  status: {
    type: String,
    enum: ['draft', 'pending', 'active', 'paused', 'completed', 'cancelled', 'rejected'],
    default: 'draft'
  },
  featuredUntil: Date,
  isFeatured: { type: Boolean, default: false },
  isUrgent: { type: Boolean, default: false },
  // Moderation
  moderationNotes: String,
  rejectionReason: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  // Blockchain integration
  blockchainEnabled: { type: Boolean, default: false },
  blockchainNetwork: { type: String, enum: ['polygon', 'ethereum', 'bsc'], default: 'polygon' },
  contractAddress: String,
  multiSigWallet: String,
  blockchainTxHash: String,
  // Milestones and updates
  milestones: [milestoneSchema],
  updates: [updateSchema],
  comments: [commentSchema],
  // Donation options
  allowRecurring: { type: Boolean, default: true },
  minimumDonation: { type: Number, default: 1 },
  suggestedAmounts: [Number],
  allowAnonymous: { type: Boolean, default: true },
  // Rewards / tiers
  rewardTiers: [{
    amount: Number,
    title: String,
    description: String,
    maxClaims: Number,
    claimed: { type: Number, default: 0 }
  }],
  // Analytics
  viewCount: { type: Number, default: 0 },
  shareCount: { type: Number, default: 0 },
  // Village/community group
  communityGroup: String,
  // Payout
  payoutStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'on-hold'],
    default: 'pending'
  },
  payoutMethod: String,
  payoutDetails: { type: mongoose.Schema.Types.Mixed, select: false },
  paidOutAt: Date,
  paidOutAmount: Number
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
campaignSchema.index({ slug: 1 });
campaignSchema.index({ creator: 1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ category: 1 });
campaignSchema.index({ 'location.country': 1 });
campaignSchema.index({ 'location.village': 1 });
campaignSchema.index({ deadline: 1 });
campaignSchema.index({ raisedAmount: -1 });
campaignSchema.index({ createdAt: -1 });
campaignSchema.index({ isFeatured: 1, featuredUntil: 1 });
campaignSchema.index({ tags: 1 });
campaignSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Virtuals
campaignSchema.virtual('progressPercentage').get(function () {
  if (!this.targetAmount) return 0;
  return Math.min(Math.round((this.raisedAmount / this.targetAmount) * 100), 100);
});

campaignSchema.virtual('daysLeft').get(function () {
  if (!this.deadline) return 0;
  const diff = this.deadline - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

campaignSchema.virtual('isExpired').get(function () {
  return this.deadline < new Date();
});

// Auto-generate slug
campaignSchema.pre('save', async function (next) {
  if (!this.isModified('title') && this.slug) return next();

  let slug = this.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const existing = await mongoose.model('Campaign').findOne({ slug, _id: { $ne: this._id } });
  if (existing) slug = `${slug}-${Date.now()}`;

  this.slug = slug;
  next();
});

// Update milestone status
campaignSchema.methods.checkMilestones = async function () {
  let updated = false;
  for (const milestone of this.milestones) {
    if (!milestone.isReached && this.raisedAmount >= milestone.targetAmount) {
      milestone.isReached = true;
      milestone.reachedAt = new Date();
      updated = true;
    }
  }
  if (updated) await this.save();
  return this.milestones.filter(m => m.isReached && !m.notified);
};

module.exports = mongoose.model('Campaign', campaignSchema);
