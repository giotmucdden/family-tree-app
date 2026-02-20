const mongoose = require('mongoose');

/**
 * VaiVeReport Model - Lưu báo cáo sai vai vế từ users
 */
const vaiVeReportSchema = new mongoose.Schema(
  {
    // Thông tin người báo cáo
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Family Tree liên quan
    familyTree: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyTree',
      required: true,
    },

    // 2 người được so sánh
    member1: {
      memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyMember',
        required: true,
      },
      name: String, // Lưu tên để dễ xem
    },
    member2: {
      memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyMember',
        required: true,
      },
      name: String,
    },

    // Kết quả hệ thống tính (để admin so sánh)
    systemResult: {
      title1to2: String, // A gọi B là gì
      title2to1: String, // B gọi A là gì
      bac: String,       // Miền Bắc
      trung: String,     // Miền Trung
      nam: String,       // Miền Nam
    },

    // Loại lỗi (có thể chọn nhiều)
    errorTypes: [{
      type: String,
      enum: [
        'wrong_title',        // Sai danh xưng (Cô/Chú/Bác...)
        'wrong_region_bac',   // Sai miền Bắc
        'wrong_region_trung', // Sai miền Trung
        'wrong_region_nam',   // Sai miền Nam
        'wrong_lineage',      // Sai họ nội/ngoại
        'wrong_generation',   // Sai thế hệ
        'other',              // Lỗi khác
      ],
    }],

    // Người dùng đề xuất danh xưng đúng
    suggestedCorrection: {
      title1to2: String, // A nên gọi B là gì
      title2to1: String, // B nên gọi A là gì
      bac: String,
      trung: String,
      nam: String,
    },

    // Mô tả chi tiết
    description: {
      type: String,
      maxlength: 1000,
    },

    // Trạng thái xử lý
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'fixed', 'rejected'],
      default: 'pending',
    },

    // Ghi chú của admin khi xử lý
    adminNotes: String,

    // Admin đã xử lý
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
  },
  { timestamps: true }
);

// Index để query nhanh
vaiVeReportSchema.index({ status: 1, createdAt: -1 });
vaiVeReportSchema.index({ familyTree: 1 });
vaiVeReportSchema.index({ reportedBy: 1 });

module.exports = mongoose.model('VaiVeReport', vaiVeReportSchema);
