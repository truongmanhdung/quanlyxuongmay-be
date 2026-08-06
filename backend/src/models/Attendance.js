const mongoose = require("mongoose");

// CHAM_CONG: cong nhan tu bam vao/ra hang ngay, chi de theo doi/doi chieu, khong anh huong tinh luong
const attendanceSchema = new mongoose.Schema(
  {
    worker: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true },
    date: { type: Date, required: true }, // ngay cong, chuan ve 00:00 gio server
    checkInAt: { type: Date },
    checkOutAt: { type: Date },
  },
  { timestamps: true }
);

attendanceSchema.index({ worker: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
