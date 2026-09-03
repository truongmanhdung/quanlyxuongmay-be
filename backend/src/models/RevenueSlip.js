const mongoose = require("mongoose");

// TINH_DOANH_THU_PHIEU_DOANH_THU: phieu doanh thu da chot cho 1 khach hang trong 1 khoang ngay.
// Doanh thu = tong cac dong phieu Xuat (tra hang thanh pham cho khach) trong ky.
// Luu snapshot tung dong xuat de phieu da chot khong doi khi sau nay sua don gia / xoa phieu.
const revenueLineSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    orderCode: { type: String }, // ma_phieu_xuat
    date: { type: Date }, // ngay xuat
    productName: { type: String },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 }, // don gia khach tra 1 sp (= don gia chuan mau hang)
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
    orderCount: { type: Number, default: 0 }, // so phieu xuat trong ky
    lines: { type: [revenueLineSchema], default: [] },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

revenueSlipSchema.index({ customer: 1, periodFrom: 1, periodTo: 1 }, { unique: true });

module.exports = mongoose.model("RevenueSlip", revenueSlipSchema);
