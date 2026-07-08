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

module.exports = router;
