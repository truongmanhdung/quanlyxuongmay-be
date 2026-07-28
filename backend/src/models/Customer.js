const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true }, // ma_khach_hang
    name: { type: String, required: true, trim: true }, // ten_khach_hang
    phone: { type: String, trim: true },
    note: { type: String, trim: true }, // nhung_ma_hang / ghi chu
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
