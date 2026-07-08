const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { donationRateLimiter } = require('../middleware/rateLimiter');

// Stripe
router.post('/stripe/init', optionalAuth, donationRateLimiter, paymentController.initStripePayment);
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), paymentController.stripeWebhook);

// Flutterwave (African payments / CFA / Mobile Money)
router.post('/flutterwave/init', optionalAuth, donationRateLimiter, paymentController.initFlutterwavePayment);
router.post('/webhook/flutterwave', paymentController.flutterwaveWebhook);

// Paystack
router.post('/paystack/init', optionalAuth, donationRateLimiter, paymentController.initPaystackPayment || ((req, res) => res.json({ message: 'Paystack not configured' })));
router.post('/webhook/paystack', paymentController.paystackWebhook);

// Donation status
router.get('/status/:reference', optionalAuth, paymentController.getDonationStatus);

// Authenticated donor analytics
router.get('/my-analytics', authenticate, paymentController.getMyDonationAnalytics);

// Payout request
router.post('/payout/request', authenticate, paymentController.requestPayout);

// Get user donations
router.get('/my-donations', authenticate, async (req, res, next) => {
  try {
    const Donation = require('../models/Donation');
    const donations = await Donation.find({ donor: req.user._id })
      .populate('campaign', 'title slug coverImage')
      .sort('-createdAt')
      .limit(50);
    res.json({ success: true, data: donations });
  } catch (error) { next(error); }
});

// Generate tax receipt (PDF)
router.get('/receipt/:donationId', authenticate, async (req, res, next) => {
  try {
    const Donation = require('../models/Donation');
    const PDFDocument = require('pdfkit');

    const donation = await Donation.findById(req.params.donationId)
      .populate('campaign', 'title')
      .populate('donor', 'firstName lastName email');

    if (!donation || donation.donor?._id.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${donation._id}.pdf`);
    doc.pipe(res);

    doc.fontSize(24).font('Helvetica-Bold').text('CrowdfundAfrica', { align: 'center' });
    doc.fontSize(16).font('Helvetica').text('Donation Receipt', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(12).text(`Receipt #: ${donation._id}`);
    doc.text(`Date: ${new Date(donation.createdAt).toLocaleDateString()}`);
    doc.text(`Donor: ${donation.donor?.firstName} ${donation.donor?.lastName}`);
    doc.text(`Email: ${donation.donor?.email || donation.donorEmail}`);
    doc.moveDown();
    doc.text(`Campaign: ${donation.campaign?.title}`);
    doc.text(`Amount: ${donation.currency} ${donation.amount.toLocaleString()}`);
    doc.text(`Amount (USD): $${donation.amountUSD.toFixed(2)}`);
    doc.text(`Payment Method: ${donation.paymentMethod}`);
    doc.text(`Status: ${donation.status}`);

    if (donation.blockchainTxHash) {
      doc.moveDown();
      doc.font('Helvetica-Bold').text('Blockchain Verification:');
      doc.font('Helvetica').text(`Transaction Hash: ${donation.blockchainTxHash}`);
      doc.text(`Network: ${donation.blockchainNetwork}`);
    }

    doc.moveDown(2);
    doc.fontSize(10).fillColor('#6b7280')
      .text('Thank you for your generous donation. This receipt is for tax purposes.', { align: 'center' });

    doc.end();
  } catch (error) { next(error); }
});

module.exports = router;
