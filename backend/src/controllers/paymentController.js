const { v4: uuidv4 } = require('uuid');
const Campaign = require('../models/Campaign');
const Donation = require('../models/Donation');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const {
  createStripePaymentIntent,
  verifyStripeWebhook,
  initializeFlutterwavePayment,
  verifyFlutterwaveTransaction,
  verifyFlutterwaveWebhook,
  initializePaystackPayment,
  verifyPaystackTransaction,
  calculateFees,
  processPayoutToCampaignOwner
} = require('../services/paymentService');
const { toUSD, convertCurrency } = require('../services/currencyService');
const { sendDonationConfirmationEmail } = require('../services/emailService');
const { sendDonationSMS } = require('../services/smsService');
const { recordDonationOnChain, getExplorerUrl } = require('../services/blockchainService');

// Initialize Stripe payment
exports.initStripePayment = async (req, res, next) => {
  try {
    const { campaignId, amount, currency, donorEmail, isAnonymous, message } = req.body;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign || campaign.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Campaign not found or inactive' });
    }

    const { platformFee, netAmount } = calculateFees(amount);
    const amountUSD = await toUSD(amount, currency);

    const { clientSecret, paymentIntentId } = await createStripePaymentIntent({
      amount,
      currency,
      campaignId,
      donorEmail: donorEmail || req.user?.email,
      metadata: { campaignId, donorId: req.user?._id, isAnonymous, message }
    });

    // Create pending donation record
    const donation = await Donation.create({
      campaign: campaignId,
      donor: req.user?._id,
      isAnonymous: isAnonymous || false,
      donorEmail: donorEmail || req.user?.email,
      amount,
      currency,
      amountUSD,
      exchangeRateUsed: amountUSD / amount,
      netAmount,
      platformFee,
      platformFeePercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '3'),
      paymentMethod: 'stripe',
      paymentProvider: 'stripe',
      paymentReference: paymentIntentId,
      status: 'pending',
      message,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      clientSecret,
      donationId: donation._id
    });
  } catch (error) {
    next(error);
  }
};

// Stripe webhook handler
exports.stripeWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    const event = verifyStripeWebhook(req.body, signature);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        await handleSuccessfulPayment({ paymentReference: paymentIntent.id, provider: 'stripe' });
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        await Donation.findOneAndUpdate(
          { paymentReference: paymentIntent.id },
          { status: 'failed', failureReason: paymentIntent.last_payment_error?.message }
        );
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await Donation.updateMany(
          { recurringSubscriptionId: subscription.id },
          { isRecurring: false }
        );
        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(400).json({ error: 'Webhook signature verification failed' });
  }
};

// Initialize Flutterwave payment (for African payments / mobile money / CFA)
exports.initFlutterwavePayment = async (req, res, next) => {
  try {
    const { campaignId, amount, currency, email, phone, name, paymentType, redirectUrl } = req.body;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign || campaign.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Campaign not found or inactive' });
    }

    const amountUSD = await toUSD(amount, currency);
    const { platformFee, netAmount } = calculateFees(amount);

    const { paymentLink, txRef } = await initializeFlutterwavePayment({
      amount,
      currency,
      email: email || req.user?.email,
      phone,
      name: name || req.user?.fullName,
      campaignId,
      redirectUrl: redirectUrl || `${process.env.CLIENT_URL}/campaigns/${campaignId}?payment=success`,
      paymentType
    });

    await Donation.create({
      campaign: campaignId,
      donor: req.user?._id,
      donorEmail: email || req.user?.email,
      amount,
      currency,
      amountUSD,
      netAmount,
      platformFee,
      platformFeePercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '3'),
      paymentMethod: paymentType === 'mobilemoney' ? 'mobile_money' : 'card',
      paymentProvider: 'flutterwave',
      paymentReference: txRef,
      status: 'pending',
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, paymentLink, txRef });
  } catch (error) {
    next(error);
  }
};

// Flutterwave webhook
exports.flutterwaveWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['verif-hash'];
    const isValid = verifyFlutterwaveWebhook(signature, req.body);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const { event, data } = req.body;

    if (event === 'charge.completed' && data.status === 'successful') {
      const verified = await verifyFlutterwaveTransaction(data.id);
      if (verified.status === 'successful') {
        await handleSuccessfulPayment({ paymentReference: verified.tx_ref, provider: 'flutterwave' });
      }
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Flutterwave webhook error:', error);
    res.status(200).json({ status: 'error' }); // Always 200 to prevent retry storms
  }
};

// Paystack webhook
exports.paystackWebhook = async (req, res, next) => {
  try {
    const crypto = require('crypto');
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { event, data } = req.body;

    if (event === 'charge.success') {
      const verified = await verifyPaystackTransaction(data.reference);
      if (verified.status === 'success') {
        await handleSuccessfulPayment({ paymentReference: data.reference, provider: 'paystack' });
      }
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Paystack webhook error:', error);
    res.status(200).json({ status: 'error' });
  }
};

// Core: process successful payment
const handleSuccessfulPayment = async ({ paymentReference, provider }) => {
  try {
    const donation = await Donation.findOne({ paymentReference }).populate('donor campaign');

    if (!donation || donation.status === 'completed') return;

    // Update donation
    donation.status = 'completed';
    donation.paymentProvider = provider;
    await donation.save();

    // Update campaign raised amount
    const campaign = await Campaign.findByIdAndUpdate(
      donation.campaign._id,
      {
        $inc: { raisedAmount: donation.amountUSD, donorCount: 1 }
      },
      { new: true }
    );

    // Update donor stats
    if (donation.donor) {
      await User.findByIdAndUpdate(donation.donor._id, {
        $inc: { totalDonated: donation.amountUSD }
      });
    }

    // Record transaction
    await Transaction.create({
      type: 'donation',
      donation: donation._id,
      campaign: donation.campaign._id,
      user: donation.donor?._id,
      amount: donation.amount,
      currency: donation.currency,
      amountUSD: donation.amountUSD,
      status: 'completed',
      provider
    });

    // Check if goal reached
    if (campaign.raisedAmount >= campaign.targetAmount && campaign.status === 'active') {
      await Campaign.findByIdAndUpdate(campaign._id, { status: 'completed' });
    }

    // Check milestones
    if (campaign.checkMilestones) {
      await campaign.checkMilestones();
    }

    // Record on blockchain if enabled
    if (campaign.blockchainEnabled && campaign.contractAddress && donation.donor?.walletAddress) {
      try {
        const { txHash } = await recordDonationOnChain({
          campaignContractAddress: campaign.contractAddress,
          donorAddress: donation.donor.walletAddress,
          amountMatic: donation.amountUSD * 0.001, // Example conversion
          donationId: donation._id,
          network: campaign.blockchainNetwork
        });
        await Donation.findByIdAndUpdate(donation._id, {
          blockchainTxHash: txHash,
          isOnChain: true,
          blockchainNetwork: campaign.blockchainNetwork
        });
      } catch (err) {
        console.error('On-chain recording failed:', err.message);
      }
    }

    // Send confirmation emails/SMS
    const donorEmail = donation.donorEmail || donation.donor?.email;
    if (donorEmail && !donation.isAnonymous) {
      await sendDonationConfirmationEmail({
        email: donorEmail,
        donorName: donation.donor ? `${donation.donor.firstName} ${donation.donor.lastName}` : donation.donorName,
        campaignTitle: campaign.title,
        amount: donation.amount,
        currency: donation.currency,
        txHash: donation.blockchainTxHash
      });
    }

  } catch (error) {
    console.error('Payment processing error:', error);
  }
};

// Get donation status
exports.getDonationStatus = async (req, res, next) => {
  try {
    const { reference } = req.params;
    const donation = await Donation.findOne({ paymentReference: reference })
      .populate('campaign', 'title slug coverImage')
      .lean();

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    const response = { success: true, data: donation };

    if (donation.blockchainTxHash) {
      response.explorerUrl = getExplorerUrl(donation.blockchainTxHash, donation.blockchainNetwork);
    }

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// Get analytics for the authenticated donor
exports.getMyDonationAnalytics = async (req, res, next) => {
  try {
    const { days = 90 } = req.query;
    const since = new Date(Date.now() - Number(days) * 86400000);

    // Aggregate only completed donations for the current user
    const [donationsByDay, byCurrency, byCampaign] = await Promise.all([
      Donation.aggregate([
        { $match: { donor: req.user._id, status: 'completed', createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            totalUSD: { $sum: '$amountUSD' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Donation.aggregate([
        { $match: { donor: req.user._id, status: 'completed' } },
        {
          $group: {
            _id: '$currency',
            total: { $sum: '$amount' },
            totalUSD: { $sum: '$amountUSD' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalUSD: -1 } }
      ]),
      Donation.aggregate([
        { $match: { donor: req.user._id, status: 'completed' } },
        {
          $group: {
            _id: '$campaign',
            totalUSD: { $sum: '$amountUSD' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalUSD: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Populate top campaigns for readability
    const campaignIds = byCampaign.map((c) => c._id).filter(Boolean);
    const campaignsMap = campaignIds.length
      ? await Campaign.find({ _id: { $in: campaignIds } })
          .select('title slug coverImage')
          .lean()
          .then((rows) =>
            rows.reduce((acc, c) => {
              acc[c._id.toString()] = c;
              return acc;
            }, {})
          )
      : {};

    const topCampaigns = byCampaign.map((entry) => ({
      campaignId: entry._id,
      campaign: campaignsMap[entry._id?.toString()] || null,
      totalUSD: entry.totalUSD,
      count: entry.count
    }));

    res.status(200).json({
      success: true,
      data: {
        donationsByDay,
        byCurrency,
        topCampaigns
      }
    });
  } catch (error) {
    next(error);
  }
};

// Request payout (campaign creator)
exports.requestPayout = async (req, res, next) => {
  try {
    const { campaignId, method, recipientDetails } = req.body;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    if (campaign.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only campaign creator can request payout' });
    }

    if (campaign.status !== 'completed' && campaign.raisedAmount < campaign.targetAmount) {
      return res.status(400).json({ success: false, message: 'Campaign goal not yet reached' });
    }

    if (campaign.payoutStatus === 'completed') {
      return res.status(400).json({ success: false, message: 'Payout already processed' });
    }

    await Campaign.findByIdAndUpdate(campaignId, {
      payoutStatus: 'processing',
      payoutMethod: method,
      payoutDetails: recipientDetails
    });

    // Process payout (admin will confirm)
    res.status(200).json({ success: true, message: 'Payout request submitted. Processing within 2-5 business days.' });
  } catch (error) {
    next(error);
  }
};

module.exports.handleSuccessfulPayment = handleSuccessfulPayment;
