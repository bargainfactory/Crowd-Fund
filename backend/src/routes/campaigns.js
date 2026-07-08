const express = require('express');
const multer = require('multer');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');
const { campaignRateLimiter } = require('../middleware/rateLimiter');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// Public routes
router.get('/', optionalAuth, campaignController.getCampaigns);
router.get('/recommended', optionalAuth, campaignController.getRecommendedCampaigns);
router.get('/:id', optionalAuth, campaignController.getCampaign);

// Protected routes
router.post('/', authenticate, campaignRateLimiter, campaignController.createCampaign);
router.put('/:id', authenticate, campaignController.updateCampaign);
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  const Campaign = require('../models/Campaign');
  await Campaign.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
  res.json({ success: true, message: 'Campaign cancelled' });
});

// Campaign updates & comments
router.post('/:id/updates', authenticate, campaignController.addUpdate);
router.post('/:id/comments', authenticate, campaignController.addComment);

// Analytics
router.get('/:id/analytics', authenticate, campaignController.getCampaignAnalytics);

// Media upload
router.post('/upload/media', authenticate, upload.single('file'), campaignController.uploadMedia);

// Admin moderation
router.patch('/:id/moderate', authenticate, authorize('admin', 'superadmin'), campaignController.moderateCampaign);

// Exchange rates (public)
router.get('/meta/exchange-rates', async (req, res, next) => {
  try {
    const { getExchangeRates, SUPPORTED_CURRENCIES } = require('../services/currencyService');
    const rates = await getExchangeRates();
    res.json({ success: true, ...rates, currencies: SUPPORTED_CURRENCIES });
  } catch (error) {
    next(error);
  }
});

// Public platform stats (real numbers for the homepage — no fabricated figures).
// Cached in Redis for 5 minutes to keep the homepage fast.
router.get('/meta/stats', async (req, res, next) => {
  try {
    const Campaign = require('../models/Campaign');
    const { cache } = require('../config/redis');

    const cached = await cache.get('public:stats').catch(() => null);
    if (cached) return res.json({ success: true, data: cached });

    const publicMatch = { status: { $in: ['active', 'completed'] } };
    const [agg, countries] = await Promise.all([
      Campaign.aggregate([
        { $match: publicMatch },
        {
          $group: {
            _id: null,
            totalRaised: { $sum: '$raisedAmount' },
            totalDonors: { $sum: '$donorCount' },
            totalCampaigns: { $sum: 1 }
          }
        }
      ]),
      Campaign.distinct('location.country', publicMatch)
    ]);

    const data = {
      totalRaised: agg[0]?.totalRaised || 0,
      totalDonors: agg[0]?.totalDonors || 0,
      totalCampaigns: agg[0]?.totalCampaigns || 0,
      totalCountries: (countries || []).filter(Boolean).length
    };

    await cache.set('public:stats', data, 300).catch(() => {});
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
