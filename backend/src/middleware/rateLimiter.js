const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');

const createLimiter = (options) => {
  const baseConfig = {
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  };

  // Try to use Redis store, fallback to memory
  try {
    const client = getRedisClient();
    baseConfig.store = new RedisStore({
      sendCommand: (...args) => client.sendCommand(args)
    });
  } catch {
    // Memory store fallback for development
  }

  return rateLimit({ ...baseConfig, ...options });
};

// Global API rate limit
const globalRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: 'Too many requests from this IP'
});

// Auth endpoints - stricter
const authRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true
});

// Login - very strict
const loginRateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  skipSuccessfulRequests: true
});

// Donation submission
const donationRateLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5
});

// Email/SMS sending
const emailRateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5
});

// Campaign creation
const campaignRateLimiter = createLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10
});

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  loginRateLimiter,
  donationRateLimiter,
  emailRateLimiter,
  campaignRateLimiter
};
