const mongoose = require("mongoose");

// CAU_HINH_NHAC_NHO: 1 ban ghi duy nhat, cau hinh gio nhac cong nhan gui san luong hang ngay
const reminderSettingSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    times: { type: [String], default: ["17:00"] }, // dinh dang "HH:mm", gio server
    message: {
      type: String,
      default: "Đừng quên gửi sản lượng hôm nay nhé!",
      trim: true,
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReminderSetting", reminderSettingSchema);
