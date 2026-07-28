const mongoose = require("mongoose");

// DON_HANG: phieu nhap / xuat hang cho 1 khach hang
const orderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true }, // ma_don_hang
    type: { type: String, enum: ["nhap", "xuat"], required: true }, // loai_don
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    date: { type: Date, default: Date.now },
    note: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
