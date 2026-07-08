const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const Donation = require('../models/Donation');
const Transaction = require('../models/Transaction');
const { processPayoutToCampaignOwner } = require('../services/paymentService');

const adminOnly = [authenticate, authorize('admin', 'superadmin')];

// Dashboard stats
router.get('/stats', ...adminOnly, async (req, res, next) => {
  try {
    const [
      totalUsers, totalCampaigns, totalDonations, pendingCampaigns,
      activeCampaigns, completedCampaigns, totalRaised, recentDonations,
      newUsersToday
    ] = await Promise.all([
      User.countDocuments(),
      Campaign.countDocuments(),
      Donation.countDocuments({ status: 'completed' }),
      Campaign.countDocuments({ status: 'pending' }),
      Campaign.countDocuments({ status: 'active' }),
      Campaign.countDocuments({ status: 'completed' }),
      Donation.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amountUSD' } } }
      ]),
      Donation.find({ status: 'completed' })
        .populate('campaign', 'title')
        .populate('donor', 'firstName lastName')
        .sort('-createdAt')
        .limit(10),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 86400000) } })
    ]);

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, newToday: newUsersToday },
        campaigns: {
          total: totalCampaigns,
          pending: pendingCampaigns,
          active: activeCampaigns,
          completed: completedCampaigns
        },
        donations: {
          total: totalDonations,
          totalRaisedUSD: totalRaised[0]?.total || 0
        },
        recentDonations
      }
    });
  } catch (error) { next(error); }
});

// User management
router.get('/users', ...adminOnly, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, kycStatus } = req.query;
    const query = {};
    if (search) query.$or = [
      { firstName: new RegExp(search, 'i') },
      { lastName: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') }
    ];
    if (role) query.role = role;
    if (kycStatus) query.kycStatus = kycStatus;

    const [users, total] = await Promise.all([
      User.find(query).sort('-createdAt').skip((page - 1) * limit).limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({ success: true, data: users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
});

router.patch('/users/:id/ban', ...adminOnly, async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id,
      { isBanned: true, isActive: false, banReason: reason },
      { new: true }
    );
    res.json({ success: true, message: 'User banned', data: user });
  } catch (error) { next(error); }
});

router.patch('/users/:id/unban', ...adminOnly, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id,
      { isBanned: false, isActive: true, $unset: { banReason: 1 } },
      { new: true }
    );
    res.json({ success: true, message: 'User unbanned', data: user });
  } catch (error) { next(error); }
});

router.patch('/users/:id/verify-creator', ...adminOnly, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id,
      { isVerifiedCreator: true, role: 'creator', verificationBadge: 'verified' },
      { new: true }
    );
    res.json({ success: true, message: 'Creator verified', data: user });
  } catch (error) { next(error); }
});

// Campaign management
router.get('/campaigns', ...adminOnly, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = status ? { status } : {};
    const [campaigns, total] = await Promise.all([
      Campaign.find(query).populate('creator', 'firstName lastName email').sort('-createdAt')
        .skip((page - 1) * limit).limit(parseInt(limit)),
      Campaign.countDocuments(query)
    ]);
    res.json({ success: true, data: campaigns, total, pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
});

// Approve and trigger payout for a campaign
router.post('/campaigns/:id/payout/approve', ...adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id).populate('creator', 'firstName lastName email');

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    if (campaign.payoutStatus === 'completed') {
      return res.status(400).json({ success: false, message: 'Payout already completed' });
    }

    if (campaign.raisedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'No funds available for payout' });
    }

    const method = campaign.payoutMethod;
    const recipientDetails = campaign.payoutDetails || {};

    if (!method || !recipientDetails) {
      return res.status(400).json({ success: false, message: 'Payout details are missing' });
    }

    const result = await processPayoutToCampaignOwner({
      amount: campaign.raisedAmount,
      currency: process.env.BASE_CURRENCY || 'USD',
      method,
      recipient: recipientDetails
    });

    const paidOutAt = new Date();

    await Campaign.findByIdAndUpdate(id, {
      payoutStatus: 'completed',
      paidOutAt,
      paidOutAmount: campaign.raisedAmount
    });

    await Transaction.create({
      type: 'payout',
      campaign: campaign._id,
      amount: campaign.raisedAmount,
      currency: process.env.BASE_CURRENCY || 'USD',
      status: 'completed',
      provider: method,
      metadata: { transferId: result.transferId }
    });

    res.json({
      success: true,
      message: 'Payout processed successfully',
      data: { transferId: result.transferId, paidOutAt }
    });
  } catch (error) {
    next(error);
  }
});

// Flagged donations
router.get('/flagged-donations', ...adminOnly, async (req, res, next) => {
  try {
    const flagged = await Donation.find({ isFlagged: true })
      .populate('campaign', 'title')
      .populate('donor', 'firstName lastName email')
      .sort('-createdAt');
    res.json({ success: true, data: flagged });
  } catch (error) { next(error); }
});

// Platform analytics
router.get('/analytics', ...adminOnly, async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 86400000);

    const [donationsByDay, campaignsByCategory, donationsByCountry, topCampaigns] = await Promise.all([
      Donation.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$amountUSD' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Campaign.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 }, totalRaised: { $sum: '$raisedAmount' } } },
        { $sort: { count: -1 } }
      ]),
      Donation.aggregate([
        { $match: { status: 'completed' } },
        { $lookup: { from: 'users', localField: 'donor', foreignField: '_id', as: 'donorInfo' } },
        { $unwind: { path: '$donorInfo', preserveNullAndEmpty: true } },
        { $group: { _id: '$donorInfo.location.country', total: { $sum: '$amountUSD' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }, { $limit: 15 }
      ]),
      Campaign.find({ status: 'active' }).sort('-raisedAmount').limit(10)
        .populate('creator', 'firstName lastName').lean()
    ]);

    res.json({ success: true, data: { donationsByDay, campaignsByCategory, donationsByCountry, topCampaigns } });
  } catch (error) { next(error); }
});

module.exports = router;
