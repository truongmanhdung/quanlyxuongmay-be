const mongoose = require("mongoose");

// TINH_LUONG_PHIEU_LUONG: phieu luong da chot cho 1 cong nhan trong 1 ky (thang)
const payrollSlipSchema = new mongoose.Schema(
  {
    worker: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true },
    period: { type: String, required: true }, // "YYYY-MM"
    totalQuantity: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 }, // tong_luong
    reportCount: { type: Number, default: 0 },
    reports: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProductionReport" }],
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

payrollSlipSchema.index({ worker: 1, period: 1 }, { unique: true });

module.exports = mongoose.model("PayrollSlip", payrollSlipSchema);
