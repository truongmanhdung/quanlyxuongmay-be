const mongoose = require("mongoose");

// CAU_HINH_NHAC_NHO_RIENG: ghi de gio nhac / noi dung cho tung cong nhan, thay the cau hinh chung
const workerReminderSettingSchema = new mongoose.Schema(
  {
    worker: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true, unique: true },
    enabled: { type: Boolean, default: true },
    times: { type: [String], default: ["17:00"] }, // dinh dang "HH:mm", gio server
    message: { type: String, trim: true }, // rong = dung noi dung cau hinh chung
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WorkerReminderSetting", workerReminderSettingSchema);
