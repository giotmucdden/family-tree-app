const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

// @route  GET /api/auth/facebook
// @desc   Auth with Facebook
router.get(
  '/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

// @route  GET /api/auth/facebook/callback
// @desc   Facebook auth callback
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=auth_failed`,
  }),
  (req, res) => {
    res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
  }
);

// @route  GET /api/auth/current-user
// @desc   Get the current logged-in user
router.get('/current-user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      user: {
        id: req.user._id,
        displayName: req.user.displayName,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        profilePhoto: req.user.profilePhoto,
      },
    });
  } else {
    res.json({ user: null });
  }
});

// @route  GET /api/auth/logout
// @desc   Log out user
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
  });
});

// @route  POST /api/auth/demo
// @desc   Log in as the demo user (no Facebook required)
router.post('/demo', async (req, res) => {
  try {
    const demoUser = await User.findOne({ facebookId: 'demo_user_001' });
    if (!demoUser) {
      return res.status(404).json({
        error:
          'Demo data not found. Run "node seed.js" in the server directory first.',
      });
    }
    req.login(demoUser, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Demo login failed' });
      }
      res.json({
        user: {
          id: demoUser._id,
          displayName: demoUser.displayName,
          firstName: demoUser.firstName,
          lastName: demoUser.lastName,
          email: demoUser.email,
          profilePhoto: demoUser.profilePhoto,
        },
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
