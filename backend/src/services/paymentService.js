const Stripe = require('stripe');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { toUSD, convertCurrency } = require('./currencyService');

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

const PLATFORM_FEE = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '3') / 100;

// ─── Stripe ────────────────────────────────────────────────────────────────────

const createStripePaymentIntent = async ({ amount, currency, campaignId, donorEmail, metadata }) => {
  if (!stripe) throw new Error('Stripe not configured');

  const amountInSmallestUnit = Math.round(
    ['jpy', 'xof', 'xaf', 'ugx', 'tzs', 'kes', 'ngn', 'ghs'].includes(currency.toLowerCase())
      ? amount
      : amount * 100
  );

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInSmallestUnit,
    currency: currency.toLowerCase(),
    receipt_email: donorEmail,
    metadata: {
      campaignId: campaignId.toString(),
      ...metadata
    },
    automatic_payment_methods: { enabled: true }
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id
  };
};

const createStripeSubscription = async ({ customerId, priceId, campaignId }) => {
  if (!stripe) throw new Error('Stripe not configured');

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    metadata: { campaignId: campaignId.toString() },
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent']
  });

  return subscription;
};

const getOrCreateStripeCustomer = async ({ email, name, userId }) => {
  if (!stripe) throw new Error('Stripe not configured');

  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) return existing.data[0];

  return stripe.customers.create({
    email,
    name,
    metadata: { userId: userId.toString() }
  });
};

const verifyStripeWebhook = (payload, signature) => {
  if (!stripe) throw new Error('Stripe not configured');
  return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
};

const refundStripePayment = async (paymentIntentId, amount) => {
  if (!stripe) throw new Error('Stripe not configured');
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amount && { amount: Math.round(amount * 100) })
  });
};

// ─── Flutterwave ───────────────────────────────────────────────────────────────

const FLUTTERWAVE_BASE = 'https://api.flutterwave.com/v3';
const flutterwaveHeaders = () => ({
  Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
  'Content-Type': 'application/json'
});

const initializeFlutterwavePayment = async ({
  amount, currency, email, phone, name, campaignId, redirectUrl, paymentType = 'card'
}) => {
  const txRef = `CF-${uuidv4()}`;

  const payload = {
    tx_ref: txRef,
    amount,
    currency,
    redirect_url: redirectUrl,
    customer: { email, phone_number: phone, name },
    customizations: {
      title: 'CrowdfundAfrica',
      description: 'Campaign Donation',
      logo: 'https://crowdfundafrica.com/logo.png'
    },
    payment_options: paymentType,
    meta: { campaign_id: campaignId.toString() }
  };

  const response = await axios.post(
    `${FLUTTERWAVE_BASE}/payments`,
    payload,
    { headers: flutterwaveHeaders() }
  );

  return {
    paymentLink: response.data.data.link,
    txRef
  };
};

const verifyFlutterwaveTransaction = async (transactionId) => {
  const response = await axios.get(
    `${FLUTTERWAVE_BASE}/transactions/${transactionId}/verify`,
    { headers: flutterwaveHeaders() }
  );
  return response.data.data;
};

const verifyFlutterwaveWebhook = (signature, payload) => {
  const crypto = require('crypto');
  const hash = crypto.createHmac('sha256', process.env.FLUTTERWAVE_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  return hash === signature;
};

const initiateFlutterwaveMobileMoney = async ({
  amount, currency, phone, network, email, campaignId
}) => {
  const payload = {
    phone_number: phone,
    amount,
    currency,
    network,
    email,
    tx_ref: `CF-${uuidv4()}`,
    order_id: `ORDER-${Date.now()}`,
    meta: { campaign_id: campaignId }
  };

  const response = await axios.post(
    `${FLUTTERWAVE_BASE}/charges?type=mobile_money_${currency.toLowerCase()}`,
    payload,
    { headers: flutterwaveHeaders() }
  );

  return response.data;
};

// ─── Paystack ──────────────────────────────────────────────────────────────────

const PAYSTACK_BASE = 'https://api.paystack.co';
const paystackHeaders = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  'Content-Type': 'application/json'
});

const initializePaystackPayment = async ({ amount, currency, email, campaignId, callbackUrl }) => {
  // Paystack amount is in kobo (smallest unit)
  const amountInKobo = Math.round(amount * 100);

  const response = await axios.post(
    `${PAYSTACK_BASE}/transaction/initialize`,
    {
      email,
      amount: amountInKobo,
      currency,
      callback_url: callbackUrl,
      metadata: {
        campaign_id: campaignId.toString(),
        custom_fields: [{ display_name: 'Campaign', variable_name: 'campaign_id', value: campaignId }]
      }
    },
    { headers: paystackHeaders() }
  );

  return {
    authorizationUrl: response.data.data.authorization_url,
    reference: response.data.data.reference,
    accessCode: response.data.data.access_code
  };
};

const verifyPaystackTransaction = async (reference) => {
  const response = await axios.get(
    `${PAYSTACK_BASE}/transaction/verify/${reference}`,
    { headers: paystackHeaders() }
  );
  return response.data.data;
};

// ─── Unified Payment Processing ────────────────────────────────────────────────

const calculateFees = (amount) => {
  const platformFee = Math.round(amount * PLATFORM_FEE * 100) / 100;
  const netAmount = Math.round((amount - platformFee) * 100) / 100;
  return { platformFee, netAmount, platformFeePercentage: PLATFORM_FEE * 100 };
};

const processPayoutToCampaignOwner = async ({ amount, currency, method, recipient }) => {
  switch (method) {
    case 'stripe': {
      // Stripe Connect payout
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        destination: recipient.stripeAccountId
      });
      return { success: true, transferId: transfer.id };
    }
    case 'flutterwave': {
      const response = await axios.post(
        `${FLUTTERWAVE_BASE}/transfers`,
        {
          account_bank: recipient.bankCode,
          account_number: recipient.accountNumber,
          amount,
          narration: 'CrowdfundAfrica Campaign Payout',
          currency,
          reference: `PAY-${uuidv4()}`
        },
        { headers: flutterwaveHeaders() }
      );
      return { success: true, transferId: response.data.data?.id };
    }
    default:
      throw new Error(`Unsupported payout method: ${method}`);
  }
};

module.exports = {
  // Stripe
  createStripePaymentIntent,
  createStripeSubscription,
  getOrCreateStripeCustomer,
  verifyStripeWebhook,
  refundStripePayment,
  // Flutterwave
  initializeFlutterwavePayment,
  verifyFlutterwaveTransaction,
  verifyFlutterwaveWebhook,
  initiateFlutterwaveMobileMoney,
  // Paystack
  initializePaystackPayment,
  verifyPaystackTransaction,
  // Utilities
  calculateFees,
  processPayoutToCampaignOwner
};
