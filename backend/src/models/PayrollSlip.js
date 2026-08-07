const mongoose = require("mongoose");

// TINH_LUONG_PHIEU_LUONG: phieu luong da chot cho 1 cong nhan trong 1 khoang ngay
const payrollSlipSchema = new mongoose.Schema(
  {
    worker: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true },
    periodFrom: { type: Date, required: true },
    periodTo: { type: Date, required: true }, // ngay cuoi ky, tinh bao gom ca ngay nay
    totalQuantity: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 }, // tong_luong
    reportCount: { type: Number, default: 0 },
    reports: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProductionReport" }],
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

payrollSlipSchema.index({ worker: 1, periodFrom: 1, periodTo: 1 }, { unique: true });

module.exports = mongoose.model("PayrollSlip", payrollSlipSchema);
