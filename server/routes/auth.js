const express = require('express');
const User = require('../models/User');
const router = express.Router();

// @route  POST /api/auth/register
// @desc   Register a new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }

    const displayName = lastName ? `${firstName} ${lastName}` : firstName;

    // Check if there's a member with this email to auto-link
    const FamilyMember = require('../models/FamilyMember');
    const linkedMember = await FamilyMember.findOne({ email: email.toLowerCase() });

    const user = new User({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      displayName,
      role: 'member', // New users are members by default
      linkedMemberId: linkedMember ? linkedMember._id : null,
    });

    await user.save();

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Đăng ký thành công nhưng đăng nhập thất bại' });
      }
      res.json({
        user: {
          id: user._id,
          displayName: user.displayName,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profilePhoto: user.profilePhoto,
          role: user.role,
          linkedMemberId: user.linkedMemberId,
        },
      });
    });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }
    res.status(500).json({ error: 'Đăng ký thất bại: ' + err.message });
  }
});

// @route  POST /api/auth/login
// @desc   Log in with email and password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    // Check if user needs to be linked to a member
    if (!user.linkedMemberId) {
      const FamilyMember = require('../models/FamilyMember');
      const linkedMember = await FamilyMember.findOne({ email: email.toLowerCase() });
      if (linkedMember) {
        user.linkedMemberId = linkedMember._id;
        await user.save();
      }
    }

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Đăng nhập thất bại' });
      }
      res.json({
        user: {
          id: user._id,
          displayName: user.displayName,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profilePhoto: user.profilePhoto,
          role: user.role,
          linkedMemberId: user.linkedMemberId,
        },
      });
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Đăng nhập thất bại. Vui lòng thử lại.' });
  }
});

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
        role: req.user.role,
        linkedMemberId: req.user.linkedMemberId,
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
    let demoUser = await User.findOne({ email: 'demo@giapha.vn' });

    if (!demoUser) {
      demoUser = await User.findOne({ facebookId: 'demo_user_001' });
    }

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

// @route  POST /api/auth/forgot-password
// @desc   Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Vui lòng nhập email' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if email exists
      return res.json({
        message: 'Nếu email tồn tại, bạn sẽ nhận được mã đặt lại mật khẩu.',
        success: true
      });
    }

    const resetToken = user.generateResetToken();
    await user.save();

    // In production, send email with reset link
    // For development, return the token directly
    res.json({
      message: 'Mã đặt lại mật khẩu đã được tạo.',
      success: true,
      // Only include token in development for testing
      ...(process.env.NODE_ENV !== 'production' && { resetToken }),
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Không thể tạo mã đặt lại. Vui lòng thử lại.' });
  }
});

// @route  POST /api/auth/reset-password
// @desc   Reset password with token
const crypto = require('crypto');

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp mã và mật khẩu mới' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Mã đặt lại không hợp lệ hoặc đã hết hạn' });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Mật khẩu đã được đặt lại thành công!', success: true });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Không thể đặt lại mật khẩu. Vui lòng thử lại.' });
  }
});

// ============ ADMIN ROUTES ============

// Middleware kiểm tra admin
const ensureAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới có quyền truy cập' });
  }
  next();
};

// @route  GET /api/auth/admin/pending-users
// @desc   Get users waiting for approval (for now, returns empty - all users are auto-approved)
router.get('/admin/pending-users', ensureAdmin, async (req, res) => {
  try {
    // Currently no approval system, return empty array
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route  GET /api/auth/admin/all-users
// @desc   Get all users
router.get('/admin/all-users', ensureAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 });

    const formattedUsers = users.map(u => ({
      _id: u._id,
      displayName: u.displayName,
      email: u.email,
      username: u.email?.split('@')[0] || 'unknown',
      isAdmin: u.role === 'admin',
      isApproved: true, // All users are currently auto-approved
      registrationDate: u.createdAt,
      createdAt: u.createdAt,
      lastLogin: u.updatedAt,
    }));

    res.json(formattedUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route  POST /api/auth/admin/approve/:userId
// @desc   Approve a user (placeholder for future use)
router.post('/admin/approve/:userId', ensureAdmin, async (req, res) => {
  try {
    // Currently no approval system
    res.json({ success: true, message: 'User approved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route  DELETE /api/auth/admin/reject/:userId
// @desc   Reject and delete a user
router.delete('/admin/reject/:userId', ensureAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }
    res.json({ success: true, message: 'Đã xóa người dùng' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route  POST /api/auth/admin/toggle-admin/:userId
// @desc   Toggle admin role for a user
router.post('/admin/toggle-admin/:userId', ensureAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    // Toggle role
    user.role = user.role === 'admin' ? 'member' : 'admin';
    await user.save();

    res.json({
      success: true,
      message: user.role === 'admin' ? 'Đã cấp quyền Admin' : 'Đã thu hồi quyền Admin',
      isAdmin: user.role === 'admin'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
