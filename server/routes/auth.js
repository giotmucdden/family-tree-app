const express = require('express');
const User = require('../models/User');
const router = express.Router();

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
      return res.status(500).json({ error: 'Đăng xuất thất bại' });
    }
    req.session.destroy();
    res.json({ message: 'Đã đăng xuất thành công' });
  });
});

// @route  POST /api/auth/demo
// @desc   Log in as the demo user
router.post('/demo', async (req, res) => {
  try {
    const demoUser = await User.findOne({ facebookId: 'demo_user_001' });
    if (!demoUser) {
      return res.status(404).json({
        error:
          'Không tìm thấy dữ liệu demo. Hãy chạy "node seed.js" trong thư mục server trước.',
      });
    }
    req.login(demoUser, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Đăng nhập demo thất bại' });
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
