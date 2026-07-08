const Campaign = require('../models/Campaign');
const Donation = require('../models/Donation');
const User = require('../models/User');
const { cache } = require('../config/redis');
const { toUSD } = require('../services/currencyService');
const { sendCampaignApprovedEmail } = require('../services/emailService');
const { deployBlockchainCampaign } = require('../services/blockchainService');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Get all campaigns with filtering and pagination
exports.getCampaigns = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 12, category, country, village, status = 'active',
      sort = '-createdAt', search, currency, minAmount, maxAmount,
      featured, urgent, blockchainEnabled
    } = req.query;

    const query = {};

    // Status filter (non-admins only see active)
    if (req.user?.role === 'admin' || req.user?.role === 'superadmin') {
      if (status !== 'all') query.status = status;
    } else {
      query.status = 'active';
    }

    if (category) query.category = category;
    if (country) query['location.country'] = new RegExp(country, 'i');
    if (village) query['location.village'] = new RegExp(village, 'i');
    if (featured === 'true') query.isFeatured = true;
    if (urgent === 'true') query.isUrgent = true;
    if (blockchainEnabled === 'true') query.blockchainEnabled = true;

    if (search) {
      query.$text = { $search: search };
    }

    if (minAmount || maxAmount) {
      query.targetAmount = {};
      if (minAmount) query.targetAmount.$gte = parseFloat(minAmount);
      if (maxAmount) query.targetAmount.$lte = parseFloat(maxAmount);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .populate('creator', 'firstName lastName avatar isVerifiedCreator')
        .populate('coManagers', 'firstName lastName avatar')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Campaign.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: campaigns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Geolocation-based recommended campaigns
exports.getRecommendedCampaigns = async (req, res, next) => {
  try {
    const { country, village, limit = 6 } = req.query;

    const baseMatch = { status: 'active' };

    const pipeline = [
      { $match: baseMatch },
      {
        $addFields: {
          score: {
            $add: [
              // Highest weight: same village
              {
                $cond: [
                  village
                    ? { $eq: ['$location.village', new RegExp(`^${village}$`, 'i')] }
                    : false,
                  30,
                  0
                ]
              },
              // Country match
              {
                $cond: [
                  country
                    ? { $regexMatch: { input: '$location.country', regex: new RegExp(country, 'i') } }
                    : false,
                  20,
                  0
                ]
              },
              // Urgent campaigns
              { $cond: ['$isUrgent', 10, 0] },
              // Featured campaigns
              { $cond: ['$isFeatured', 8, 0] },
              // Normalized funding progress (0–1) * 5
              {
                $multiply: [
                  {
                    $min: [
                      1,
                      {
                        $cond: [
                          { $gt: ['$targetAmount', 0] },
                          { $divide: ['$raisedAmount', '$targetAmount'] },
                          0
                        ]
                      }
                    ]
                  },
                  5
                ]
              }
            ]
          }
        }
      },
      { $sort: { score: -1, createdAt: -1 } },
      { $limit: parseInt(limit, 10) }
    ];

    const campaigns = await Campaign.aggregate(pipeline);

    res.status(200).json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    next(error);
  }
};

// Get single campaign
exports.getCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOne(
      { $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { slug: id }] }
    )
      .populate('creator', 'firstName lastName avatar bio isVerifiedCreator totalRaised')
      .populate('coManagers', 'firstName lastName avatar')
      .populate('updates.postedBy', 'firstName lastName avatar')
      .populate('comments.user', 'firstName lastName avatar');

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Increment view count (non-blocking)
    Campaign.findByIdAndUpdate(campaign._id, { $inc: { viewCount: 1 } }).exec();

    // Get recent donations for this campaign
    const recentDonations = await Donation.find({
      campaign: campaign._id,
      status: 'completed'
    })
      .populate('donor', 'firstName lastName avatar')
      .sort('-createdAt')
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      data: campaign,
      recentDonations
    });
  } catch (error) {
    next(error);
  }
};

// Create campaign
exports.createCampaign = async (req, res, next) => {
  try {
    const {
      title, description, shortDescription, category, targetAmount, currency,
      deadline, location, tags, milestones, suggestedAmounts, minimumDonation,
      allowRecurring, allowAnonymous, communityGroup, blockchainEnabled,
      blockchainNetwork, rewardTiers
    } = req.body;

    if (new Date(deadline) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Deadline must be in the future' });
    }

    const campaign = await Campaign.create({
      title,
      description,
      shortDescription,
      category,
      targetAmount: parseFloat(targetAmount),
      currency: currency || 'USD',
      deadline: new Date(deadline),
      location,
      tags: tags || [],
      milestones: milestones || [],
      suggestedAmounts: suggestedAmounts || [10, 25, 50, 100],
      minimumDonation: minimumDonation || 1,
      allowRecurring: allowRecurring !== false,
      allowAnonymous: allowAnonymous !== false,
      communityGroup,
      blockchainEnabled: blockchainEnabled || false,
      blockchainNetwork: blockchainNetwork || 'polygon',
      rewardTiers: rewardTiers || [],
      creator: req.user._id,
      coverImage: req.body.coverImage || '',
      images: req.body.images || [],
      videoUrl: req.body.videoUrl,
      status: 'pending'
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { campaignsCreated: 1 } });

    res.status(201).json({
      success: true,
      message: 'Campaign submitted for review',
      data: campaign
    });
  } catch (error) {
    next(error);
  }
};

// Update campaign
exports.updateCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id);

    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    const isOwner = campaign.creator.toString() === req.user._id.toString();
    const isCoManager = campaign.coManagers.map(m => m.toString()).includes(req.user._id.toString());
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (!isOwner && !isCoManager && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const allowedUpdates = [
      'description', 'shortDescription', 'images', 'videoUrl',
      'milestones', 'suggestedAmounts', 'rewardTiers', 'isUrgent'
    ];

    if (isAdmin) {
      allowedUpdates.push('status', 'isFeatured', 'featuredUntil', 'moderationNotes', 'rejectionReason');
    }

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await Campaign.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      .populate('creator', 'firstName lastName avatar');

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// Admin: approve or reject campaign
exports.moderateCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    const campaign = await Campaign.findById(id).populate('creator');
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    if (action === 'approve') {
      campaign.status = 'active';
      campaign.reviewedBy = req.user._id;
      campaign.reviewedAt = new Date();
      await campaign.save();

      // Enable blockchain if requested
      if (campaign.blockchainEnabled && campaign.creator.walletAddress) {
        try {
          const { contractAddress, txHash } = await deployBlockchainCampaign({
            campaignId: campaign._id,
            goalAmount: campaign.targetAmount,
            deadline: campaign.deadline,
            creatorAddress: campaign.creator.walletAddress,
            network: campaign.blockchainNetwork
          });
          await Campaign.findByIdAndUpdate(campaign._id, { contractAddress, blockchainTxHash: txHash });
        } catch (err) {
          console.error('Blockchain deploy failed:', err.message);
        }
      }

      const campaignUrl = `${process.env.CLIENT_URL}/campaigns/${campaign.slug}`;
      await sendCampaignApprovedEmail({
        email: campaign.creator.email,
        firstName: campaign.creator.firstName,
        campaignTitle: campaign.title,
        campaignUrl
      });

      // Emit real-time notification
      req.app.get('io')?.to(`campaign:${campaign._id}`).emit('campaign-approved', { campaignId: campaign._id });

    } else if (action === 'reject') {
      campaign.status = 'rejected';
      campaign.rejectionReason = reason;
      campaign.reviewedBy = req.user._id;
      campaign.reviewedAt = new Date();
      await campaign.save();
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action. Use "approve" or "reject".' });
    }

    res.status(200).json({ success: true, message: `Campaign ${action}d`, data: campaign });
  } catch (error) {
    next(error);
  }
};

// Add campaign update
exports.addUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, images } = req.body;

    const campaign = await Campaign.findById(id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    const isOwner = campaign.creator.toString() === req.user._id.toString();
    const isCoManager = campaign.coManagers.map(m => m.toString()).includes(req.user._id.toString());

    if (!isOwner && !isCoManager && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    campaign.updates.push({ title, content, images: images || [], postedBy: req.user._id });
    await campaign.save();

    // Emit real-time update
    req.app.get('io')?.to(`campaign:${id}`).emit('campaign-update', {
      campaignId: id,
      update: campaign.updates[campaign.updates.length - 1]
    });

    res.status(201).json({ success: true, message: 'Update posted', data: campaign.updates });
  } catch (error) {
    next(error);
  }
};

// Add comment
exports.addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, isAnonymous } = req.body;

    const campaign = await Campaign.findById(id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    campaign.comments.push({ user: req.user._id, content, isAnonymous: isAnonymous || false });
    await campaign.save();

    const comment = campaign.comments[campaign.comments.length - 1];
    await campaign.populate('comments.user', 'firstName lastName avatar');

    req.app.get('io')?.to(`campaign:${id}`).emit('new-comment', { campaignId: id, comment });

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
};

// Upload media (Cloudinary)
exports.uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'crowdfund-africa', resource_type: 'auto', quality: 'auto', fetch_format: 'auto' },
        (err, result) => err ? reject(err) : resolve(result)
      );
      uploadStream.end(req.file.buffer);
    });

    res.status(200).json({ success: true, url: result.secure_url, publicId: result.public_id });
  } catch (error) {
    next(error);
  }
};

// Get campaign analytics (creator/admin only)
exports.getCampaignAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    const [dailyDonations, topDonors, countryBreakdown] = await Promise.all([
      Donation.aggregate([
        { $match: { campaign: campaign._id, status: 'completed' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: '$amountUSD' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $limit: 30 }
      ]),
      Donation.find({ campaign: campaign._id, status: 'completed' })
        .populate('donor', 'firstName lastName avatar')
        .sort('-amountUSD')
        .limit(10)
        .lean(),
      Donation.aggregate([
        { $match: { campaign: campaign._id, status: 'completed' } },
        { $lookup: { from: 'users', localField: 'donor', foreignField: '_id', as: 'donorInfo' } },
        { $unwind: { path: '$donorInfo', preserveNullAndEmpty: true } },
        { $group: { _id: '$donorInfo.location.country', total: { $sum: '$amountUSD' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        campaign: {
          raisedAmount: campaign.raisedAmount,
          targetAmount: campaign.targetAmount,
          progressPercentage: campaign.progressPercentage,
          donorCount: campaign.donorCount,
          viewCount: campaign.viewCount,
          daysLeft: campaign.daysLeft
        },
        dailyDonations,
        topDonors,
        countryBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
};
