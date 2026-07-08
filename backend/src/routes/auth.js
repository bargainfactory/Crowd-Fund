const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authRateLimiter, loginRateLimiter, emailRateLimiter } = require('../middleware/rateLimiter');

// Registration & Login
router.post('/register', authRateLimiter, authController.register);
router.post('/login', loginRateLimiter, authController.login);
router.post('/refresh-token', authController.refreshToken);

// Email verification
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', emailRateLimiter, authenticate, authController.resendVerification || ((req, res) => res.json({ message: 'Not implemented' })));

// Password reset
router.post('/forgot-password', emailRateLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// 2FA
router.post('/2fa/verify', loginRateLimiter, authController.verifyTwoFactor);
router.post('/2fa/setup', authenticate, authController.setupTwoFactor);
router.post('/2fa/enable', authenticate, authController.enableTwoFactor);
router.post('/2fa/disable', authenticate, (req, res) => {
  const User = require('../models/User');
  User.findByIdAndUpdate(req.user._id, { twoFactorEnabled: false, twoFactorSecret: null })
    .then(() => res.json({ success: true, message: '2FA disabled' }))
    .catch(err => res.status(500).json({ success: false, message: err.message }));
});

// Profile
router.get('/me', authenticate, authController.getMe);
router.put('/profile', authenticate, authController.updateProfile);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/auth/login?error=google_failed` }),
  authController.oauthCallback('google')
);

// Facebook OAuth
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'], session: false }));
router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: `${process.env.CLIENT_URL}/auth/login?error=facebook_failed` }),
  authController.oauthCallback('facebook')
);

module.exports = router;
