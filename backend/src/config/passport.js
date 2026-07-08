const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { Strategy: LocalStrategy } = require('passport-local');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const initializePassport = (app) => {
  app.use(passport.initialize());

  // JWT Strategy
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
    ignoreExpiration: false
  }, async (payload, done) => {
    try {
      const user = await User.findById(payload.id).select('-password -twoFactorSecret');
      if (!user || !user.isActive) return done(null, false);
      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  }));

  // Local Strategy
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      if (!user) return done(null, false, { message: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return done(null, false, { message: 'Invalid credentials' });

      if (!user.isActive) return done(null, false, { message: 'Account deactivated' });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.findOne({ email: profile.emails[0].value });
          if (user) {
            user.googleId = profile.id;
            user.avatar = user.avatar || profile.photos[0]?.value;
            await user.save();
          } else {
            user = await User.create({
              googleId: profile.id,
              email: profile.emails[0].value,
              firstName: profile.name.givenName,
              lastName: profile.name.familyName,
              avatar: profile.photos[0]?.value,
              isEmailVerified: true,
              authProvider: 'google'
            });
          }
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }));
  }

  // Facebook Strategy
  if (process.env.FACEBOOK_APP_ID) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'emails', 'name', 'picture']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ facebookId: profile.id });

        if (!user) {
          const email = profile.emails?.[0]?.value;
          if (email) user = await User.findOne({ email });

          if (user) {
            user.facebookId = profile.id;
            await user.save();
          } else {
            user = await User.create({
              facebookId: profile.id,
              email: profile.emails?.[0]?.value,
              firstName: profile.name.givenName,
              lastName: profile.name.familyName,
              avatar: profile.photos?.[0]?.value,
              isEmailVerified: true,
              authProvider: 'facebook'
            });
          }
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }));
  }

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};

module.exports = { initializePassport };
