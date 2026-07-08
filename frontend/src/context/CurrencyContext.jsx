import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { campaignAPI } from '../lib/api';

const CurrencyContext = createContext(null);

const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', JPY: '¥',
  XOF: 'CFA', XAF: 'FCFA', NGN: '₦', KES: 'KSh', GHS: 'GH₵',
  ZAR: 'R', MAD: 'MAD', EGP: 'E£', TZS: 'TSh', UGX: 'USh',
  BRL: 'R$', INR: '₹', CNY: '¥'
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('USD');
  const [rates, setRates] = useState({});
  const [currencies, setCurrencies] = useState({});
  const [loading, setLoading] = useState(true);

  // Load saved currency preference
  useEffect(() => {
    const saved = localStorage.getItem('preferredCurrency');
    if (saved) setCurrency(saved);
  }, []);

  // Fetch exchange rates
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const { data } = await campaignAPI.getExchangeRates();
        setRates(data.rates || {});
        setCurrencies(data.currencies || {});
      } catch {
        // Use defaults if fetch fails
      } finally {
        setLoading(false);
      }
    };
    fetchRates();
    // Refresh every hour
    const interval = setInterval(fetchRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const changeCurrency = useCallback((newCurrency) => {
    setCurrency(newCurrency);
    localStorage.setItem('preferredCurrency', newCurrency);
  }, []);

  const convert = useCallback((amount, fromCurrency = 'USD', toCurrency = currency) => {
    if (fromCurrency === toCurrency) return amount;
    if (!rates[fromCurrency] || !rates[toCurrency]) return amount;

    const toUSD = fromCurrency === 'USD' ? amount : amount / rates[fromCurrency];
    const result = toCurrency === 'USD' ? toUSD : toUSD * rates[toCurrency];
    return Math.round(result * 100) / 100;
  }, [rates, currency]);

  const format = useCallback((amount, currencyCode = currency) => {
    const nonDecimalCurrencies = ['XOF', 'XAF', 'JPY', 'KES', 'UGX', 'TZS', 'NGN'];
    const isNonDecimal = nonDecimalCurrencies.includes(currencyCode);

    try {
      const localeMap = { ar: 'ar-SA', fr: 'fr-FR', es: 'es-ES', wo: 'fr-SN', en: 'en-US' };
      const locale = localeMap[document?.documentElement?.lang] || 'en-US';

      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: isNonDecimal ? 0 : 2,
        maximumFractionDigits: isNonDecimal ? 0 : 2
      }).format(amount);
    } catch {
      const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
      return `${symbol} ${amount.toLocaleString()}`;
    }
  }, [currency]);

  const formatConverted = useCallback((amount, fromCurrency = 'USD') => {
    const converted = convert(amount, fromCurrency);
    return format(converted);
  }, [convert, format]);

  const value = {
    currency,
    changeCurrency,
    convert,
    format,
    formatConverted,
    rates,
    currencies,
    loading,
    symbol: CURRENCY_SYMBOLS[currency] || currency
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider');
  return context;
};

export default CurrencyContext;
