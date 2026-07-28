const mongoose = require("mongoose");

const workerSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true }, // ma_dang_nhap: A012, A013...
    name: { type: String, required: true, trim: true }, // ten_cong_nhan
    phone: { type: String, trim: true },
    note: { type: String, trim: true }, // thong_tin_nhan_vien
    active: { type: Boolean, default: true },
    fcmToken: { type: String, trim: true }, // device token, dung khi noi Firebase Cloud Messaging that
  },
  { timestamps: true }
);

module.exports = mongoose.model("Worker", workerSchema);
