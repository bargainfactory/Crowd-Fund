const express = require('express');
const router = express.Router();

const Donation = require('../models/Donation');
const Campaign = require('../models/Campaign');
const { authenticate } = require('../middleware/auth');

// Get recent donations for a specific campaign (public)
router.get('/campaign/:campaignId', async (req, res, next) => {
  try {
    const { campaignId } = req.params;

    const donations = await Donation.find({
      campaign: campaignId,
      status: 'completed'
    })
      .select('-ipAddress -userAgent -metadata')
      .populate('donor', 'firstName lastName')
      .sort('-createdAt')
      .limit(parseInt(req.query.limit, 10) || 50)
      .lean();

    res.json({ success: true, data: donations });
  } catch (error) {
    next(error);
  }
});

// Get aggregated donation stats for a campaign (used by analytics/dashboard)
router.get('/campaign/:campaignId/stats', async (req, res, next) => {
  try {
    const { campaignId } = req.params;

    const campaign = await Campaign.findById(campaignId)
      .select('raisedAmount targetAmount donorCount currency')
      .lean();

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const totalDonations = await Donation.countDocuments({
      campaign: campaignId,
      status: 'completed'
    });

    res.json({
      success: true,
      data: {
        raisedAmountUSD: campaign.raisedAmount,
        targetAmount: campaign.targetAmount,
        donorCount: campaign.donorCount,
        totalDonations
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get authenticated user's donations (alias of /api/payments/my-donations but grouped)
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const donations = await Donation.find({ donor: req.user._id })
      .populate('campaign', 'title slug coverImage')
      .sort('-createdAt')
      .limit(100);

    res.json({ success: true, data: donations });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

