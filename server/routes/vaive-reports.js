const express = require('express');
const router = express.Router();
const VaiVeReport = require('../models/VaiVeReport');
const { ensureAuth } = require('../middleware/auth');

router.use(ensureAuth);

// ============ USER ROUTES ============

/**
 * POST /api/vaive-reports
 * User gửi báo cáo sai vai vế
 */
router.post('/', async (req, res) => {
  try {
    const {
      familyTreeId,
      member1Id,
      member1Name,
      member2Id,
      member2Name,
      systemResult,
      errorTypes,
      suggestedCorrection,
      description,
    } = req.body;

    // Validate required fields
    if (!familyTreeId || !member1Id || !member2Id) {
      return res.status(400).json({
        error: 'Thiếu thông tin: familyTreeId, member1Id, member2Id là bắt buộc'
      });
    }

    if (!errorTypes || errorTypes.length === 0) {
      return res.status(400).json({
        error: 'Vui lòng chọn ít nhất một loại lỗi'
      });
    }

    const report = await VaiVeReport.create({
      reportedBy: req.user._id,
      familyTree: familyTreeId,
      member1: {
        memberId: member1Id,
        name: member1Name,
      },
      member2: {
        memberId: member2Id,
        name: member2Name,
      },
      systemResult,
      errorTypes,
      suggestedCorrection,
      description,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Báo cáo đã được gửi thành công. Admin sẽ xem xét sớm.',
      report,
    });
  } catch (err) {
    console.error('Error creating VaiVe report:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/vaive-reports/my-reports
 * User xem các báo cáo đã gửi của mình
 */
router.get('/my-reports', async (req, res) => {
  try {
    const reports = await VaiVeReport.find({ reportedBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ADMIN ROUTES ============

/**
 * Middleware kiểm tra admin
 */
const ensureAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới có quyền truy cập' });
  }
  next();
};

/**
 * GET /api/vaive-reports/admin/all
 * Admin xem tất cả báo cáo
 */
router.get('/admin/all', ensureAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, total] = await Promise.all([
      VaiVeReport.find(query)
        .populate('reportedBy', 'displayName email')
        .populate('reviewedBy', 'displayName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      VaiVeReport.countDocuments(query),
    ]);

    res.json({
      reports,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/vaive-reports/admin/stats
 * Admin xem thống kê báo cáo
 */
router.get('/admin/stats', ensureAdmin, async (req, res) => {
  try {
    const stats = await VaiVeReport.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      pending: 0,
      reviewed: 0,
      fixed: 0,
      rejected: 0,
      total: 0,
    };

    stats.forEach(s => {
      result[s._id] = s.count;
      result.total += s.count;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/vaive-reports/admin/:reportId
 * Admin cập nhật trạng thái báo cáo
 */
router.put('/admin/:reportId', ensureAdmin, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    const validStatuses = ['pending', 'reviewed', 'fixed', 'rejected'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }

    const updateData = {};
    if (status) {
      updateData.status = status;
      updateData.reviewedBy = req.user._id;
      updateData.reviewedAt = new Date();
    }
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    const report = await VaiVeReport.findByIdAndUpdate(
      req.params.reportId,
      { $set: updateData },
      { new: true }
    )
      .populate('reportedBy', 'displayName email')
      .populate('reviewedBy', 'displayName');

    if (!report) {
      return res.status(404).json({ error: 'Không tìm thấy báo cáo' });
    }

    res.json({
      success: true,
      message: 'Đã cập nhật báo cáo',
      report,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/vaive-reports/admin/:reportId
 * Admin xóa báo cáo
 */
router.delete('/admin/:reportId', ensureAdmin, async (req, res) => {
  try {
    const report = await VaiVeReport.findByIdAndDelete(req.params.reportId);

    if (!report) {
      return res.status(404).json({ error: 'Không tìm thấy báo cáo' });
    }

    res.json({
      success: true,
      message: 'Đã xóa báo cáo',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
