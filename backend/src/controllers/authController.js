const crypto = require('crypto');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('../middleware/auth');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');
const { sendVerificationCode, sendTwoFactorCode } = require('../services/smsService');
const { cache } = require('../config/redis');
const { AppError } = require('../middleware/errorHandler');

// Register
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phone, preferredLanguage, preferredCurrency } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const emailToken = crypto.randomBytes(32).toString('hex');
    const emailTokenHash = crypto.createHash('sha256').update(emailToken).digest('hex');

    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      phone,
      preferredLanguage: preferredLanguage || 'en',
      preferredCurrency: preferredCurrency || 'USD',
      emailVerificationToken: emailTokenHash,
      emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    const verificationUrl = `${process.env.CLIENT_URL}/auth/verify-email?token=${emailToken}`;
    await sendWelcomeEmail({ email: user.email, firstName: user.firstName, verificationUrl });

    const { accessToken, refreshToken } = generateTokens(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        preferredLanguage: user.preferredLanguage,
        preferredCurrency: user.preferredCurrency
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +twoFactorSecret');

    if (!user || !(await user.comparePassword(password))) {
      if (user) await user.incrementLoginAttempts();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.isLocked) {
      return res.status(423).json({ success: false, message: 'Account temporarily locked due to too many failed attempts' });
    }

    if (user.isBanned) {
      return res.status(403).json({ success: false, message: 'Account suspended', reason: user.banReason });
    }

    // If 2FA is enabled, return partial auth
    if (user.twoFactorEnabled) {
      const tempToken = crypto.randomBytes(32).toString('hex');
      await cache.set(`2fa_temp:${tempToken}`, user._id.toString(), 300); // 5 min
      return res.status(200).json({
        success: true,
        requiresTwoFactor: true,
        tempToken
      });
    }

    // Reset login attempts on success
    await User.findByIdAndUpdate(user._id, {
      $set: { loginAttempts: 0, lastLogin: new Date(), lastLoginIP: req.ip },
      $unset: { lockUntil: 1 }
    });

    const { accessToken, refreshToken } = generateTokens(user._id);

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      user: sanitizeUser(user)
    });
  } catch (error) {
    next(error);
  }
};

// Verify 2FA code during login
exports.verifyTwoFactor = async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;

    const userId = await cache.get(`2fa_temp:${tempToken}`);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
    }

    const user = await User.findById(userId).select('+twoFactorSecret');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    if (!verified) {
      return res.status(401).json({ success: false, message: 'Invalid 2FA code' });
    }

    await cache.del(`2fa_temp:${tempToken}`);

    await User.findByIdAndUpdate(userId, {
      lastLogin: new Date(),
      lastLoginIP: req.ip,
      loginAttempts: 0
    });

    const { accessToken, refreshToken } = generateTokens(userId);

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      user: sanitizeUser(user)
    });
  } catch (error) {
    next(error);
  }
};

// Setup 2FA
exports.setupTwoFactor = async (req, res, next) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `CrowdfundAfrica:${req.user.email}`,
      length: 20
    });

    await cache.set(`2fa_setup:${req.user._id}`, secret.base32, 600);

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.status(200).json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl
    });
  } catch (error) {
    next(error);
  }
};

// Enable 2FA after verification
exports.enableTwoFactor = async (req, res, next) => {
  try {
    const { code } = req.body;

    const secret = await cache.get(`2fa_setup:${req.user._id}`);
    if (!secret) {
      return res.status(400).json({ success: false, message: '2FA setup expired. Please restart.' });
    }

    const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 1 });
    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid code. Please try again.' });
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(5).toString('hex').toUpperCase()
    );

    await User.findByIdAndUpdate(req.user._id, {
      twoFactorSecret: secret,
      twoFactorEnabled: true,
      twoFactorBackupCodes: backupCodes
    });

    await cache.del(`2fa_setup:${req.user._id}`);

    res.status(200).json({
      success: true,
      message: '2FA enabled successfully',
      backupCodes
    });
  } catch (error) {
    next(error);
  }
};

// Verify email
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    await User.findByIdAndUpdate(user._id, {
      isEmailVerified: true,
      $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 }
    });

    res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
};

// Forgot password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always respond success to prevent email enumeration
    if (!user) {
      return res.status(200).json({ success: true, message: 'If that email exists, a reset link was sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: hashedToken,
      passwordResetExpires: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail({ email: user.email, firstName: user.firstName, resetUrl });

    res.status(200).json({ success: true, message: 'If that email exists, a reset link was sent.' });
  } catch (error) {
    next(error);
  }
};

// Reset password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user._id);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// Refresh token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required' });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const user = await User.findById(payload.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    const tokens = generateTokens(user._id);

    res.status(200).json({ success: true, ...tokens });
  } catch (error) {
    next(error);
  }
};

// Get current user
exports.getMe = async (req, res) => {
  res.status(200).json({ success: true, user: sanitizeUser(req.user) });
};

// Update profile
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['firstName', 'lastName', 'phone', 'bio', 'location', 'preferredLanguage', 'preferredCurrency', 'notifications', 'walletAddress'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });

    res.status(200).json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

// OAuth callback handler
exports.oauthCallback = (provider) => async (req, res) => {
  try {
    const { accessToken, refreshToken } = generateTokens(req.user._id);
    const redirectUrl = `${process.env.CLIENT_URL}/auth/oauth-callback?token=${accessToken}&refresh=${refreshToken}`;
    res.redirect(redirectUrl);
  } catch {
    res.redirect(`${process.env.CLIENT_URL}/auth/login?error=oauth_failed`);
  }
};

// Utility
const sanitizeUser = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar: user.avatar,
  bio: user.bio,
  location: user.location,
  preferredLanguage: user.preferredLanguage,
  preferredCurrency: user.preferredCurrency,
  isEmailVerified: user.isEmailVerified,
  isPhoneVerified: user.isPhoneVerified,
  twoFactorEnabled: user.twoFactorEnabled,
  kycStatus: user.kycStatus,
  isVerifiedCreator: user.isVerifiedCreator,
  walletAddress: user.walletAddress,
  totalDonated: user.totalDonated,
  totalRaised: user.totalRaised,
  notifications: user.notifications,
  createdAt: user.createdAt
});
