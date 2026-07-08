const axios = require('axios');
const { cache } = require('../config/redis');

const CACHE_TTL = 3600; // 1 hour
const CACHE_KEY = 'exchange_rates';

// Supported currencies with metadata
const SUPPORTED_CURRENCIES = {
  USD: { name: 'US Dollar', symbol: '$', flag: '🇺🇸', region: 'global' },
  EUR: { name: 'Euro', symbol: '€', flag: '🇪🇺', region: 'global' },
  GBP: { name: 'British Pound', symbol: '£', flag: '🇬🇧', region: 'global' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', region: 'global' },
  AUD: { name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', region: 'global' },
  JPY: { name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', region: 'global' },
  XOF: { name: 'West African CFA Franc', symbol: 'CFA', flag: '🌍', region: 'africa' },
  XAF: { name: 'Central African CFA Franc', symbol: 'FCFA', flag: '🌍', region: 'africa' },
  NGN: { name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬', region: 'africa' },
  KES: { name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪', region: 'africa' },
  GHS: { name: 'Ghanaian Cedi', symbol: 'GH₵', flag: '🇬🇭', region: 'africa' },
  ZAR: { name: 'South African Rand', symbol: 'R', flag: '🇿🇦', region: 'africa' },
  MAD: { name: 'Moroccan Dirham', symbol: 'MAD', flag: '🇲🇦', region: 'africa' },
  EGP: { name: 'Egyptian Pound', symbol: 'E£', flag: '🇪🇬', region: 'africa' },
  TZS: { name: 'Tanzanian Shilling', symbol: 'TSh', flag: '🇹🇿', region: 'africa' },
  UGX: { name: 'Ugandan Shilling', symbol: 'USh', flag: '🇺🇬', region: 'africa' },
  BRL: { name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', region: 'global' },
  INR: { name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', region: 'global' },
  CNY: { name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', region: 'global' }
};

// Fetch rates from Open Exchange Rates
const fetchRatesFromOXR = async () => {
  const response = await axios.get(
    `https://openexchangerates.org/api/latest.json?app_id=${process.env.OPEN_EXCHANGE_RATES_APP_ID}&base=USD`,
    { timeout: 5000 }
  );
  return response.data.rates;
};

// Fallback: fetch from ExchangeRate-API (free tier)
const fetchRatesFallback = async () => {
  const response = await axios.get(
    'https://api.exchangerate-api.com/v4/latest/USD',
    { timeout: 5000 }
  );
  return response.data.rates;
};

// Get exchange rates with caching
const getExchangeRates = async () => {
  // Try cache first
  const cached = await cache.get(CACHE_KEY);
  if (cached) return cached;

  let rates;
  try {
    if (process.env.OPEN_EXCHANGE_RATES_APP_ID) {
      rates = await fetchRatesFromOXR();
    } else {
      rates = await fetchRatesFallback();
    }
  } catch (err) {
    console.error('Primary exchange rate fetch failed:', err.message);
    try {
      rates = await fetchRatesFallback();
    } catch (fallbackErr) {
      console.error('Fallback exchange rate fetch failed:', fallbackErr.message);
      // Return hardcoded rates as last resort
      rates = getHardcodedRates();
    }
  }

  // Filter to supported currencies only
  const filteredRates = {};
  Object.keys(SUPPORTED_CURRENCIES).forEach(currency => {
    if (rates[currency]) filteredRates[currency] = rates[currency];
  });

  const result = {
    rates: filteredRates,
    base: 'USD',
    timestamp: Date.now()
  };

  await cache.set(CACHE_KEY, result, CACHE_TTL);
  return result;
};

// Convert amount between currencies
const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return { amount, rate: 1 };

  const { rates } = await getExchangeRates();

  // Convert to USD first, then to target currency
  const toUSD = fromCurrency === 'USD' ? amount : amount / (rates[fromCurrency] || 1);
  const toTarget = toCurrency === 'USD' ? toUSD : toUSD * (rates[toCurrency] || 1);

  const rate = (rates[toCurrency] || 1) / (rates[fromCurrency] || 1);

  return {
    amount: Math.round(toTarget * 100) / 100,
    rate: Math.round(rate * 10000) / 10000,
    fromCurrency,
    toCurrency
  };
};

// Convert any currency to USD
const toUSD = async (amount, currency) => {
  if (currency === 'USD') return amount;
  const { rates } = await getExchangeRates();
  return Math.round((amount / (rates[currency] || 1)) * 100) / 100;
};

// Format currency for display
const formatCurrency = (amount, currency, locale = 'en-US') => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: ['XOF', 'XAF', 'JPY', 'KES', 'UGX', 'TZS'].includes(currency) ? 0 : 2,
      maximumFractionDigits: ['XOF', 'XAF', 'JPY', 'KES', 'UGX', 'TZS'].includes(currency) ? 0 : 2
    }).format(amount);
  } catch {
    const info = SUPPORTED_CURRENCIES[currency];
    return `${info?.symbol || currency} ${amount.toLocaleString()}`;
  }
};

// Hardcoded fallback rates (USD base, approximate)
const getHardcodedRates = () => ({
  EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.53, JPY: 149.5,
  XOF: 620, XAF: 620, NGN: 1580, KES: 130, GHS: 12.5,
  ZAR: 18.7, MAD: 10.1, EGP: 47.5, TZS: 2530, UGX: 3720,
  BRL: 5.05, INR: 83.1, CNY: 7.23
});

module.exports = {
  SUPPORTED_CURRENCIES,
  getExchangeRates,
  convertCurrency,
  toUSD,
  formatCurrency
};
