const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true }, // ma_hang
    name: { type: String, required: true, trim: true }, // ten_hang
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    unit: { type: String, trim: true, default: "san_pham" }, // don vi tinh
    standardPrice: { type: Number, default: 0 }, // don_gia_chuan (tham khao, gia thuc te theo cong doan)
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
