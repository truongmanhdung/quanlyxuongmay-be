const mongoose = require("mongoose");

// TINH_DOANH_THU_PHIEU_DOANH_THU: phieu doanh thu da chot cho 1 khach hang trong 1 khoang ngay.
// Luu snapshot tung dong lo (don gia, so luong tai thoi diem chot) de phieu da chot khong doi
// khi sau nay sua standardPrice hoac them/sua bao cao san luong.
const revenueLineSchema = new mongoose.Schema(
  {
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
    code: { type: String }, // so_lo
    productName: { type: String },
    completedAt: { type: Date },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 }, // don_gia_chuan mau hang tai thoi diem chot
    amount: { type: Number, default: 0 }, // quantity * unitPrice
  },
  { _id: false }
);

const revenueSlipSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    periodFrom: { type: Date, required: true },
    periodTo: { type: Date, required: true }, // ngay cuoi ky, tinh bao gom ca ngay nay
    totalQuantity: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 }, // tong_doanh_thu
    batchCount: { type: Number, default: 0 },
    lines: { type: [revenueLineSchema], default: [] },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

revenueSlipSchema.index({ customer: 1, periodFrom: 1, periodTo: 1 }, { unique: true });

module.exports = mongoose.model("RevenueSlip", revenueSlipSchema);
