const mongoose = require("mongoose");

// LO_HANG: theo doi tien do va trang thai hoan thanh cua 1 lo san xuat
const batchSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true }, // so_lo, khop voi ProductionReport.batchNumber
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    plannedQuantity: { type: Number, min: 0 }, // so luong ke hoach, khong bat buoc
    status: {
      type: String,
      enum: ["dang_lam", "chua_hoan_thanh", "hoan_thanh"],
      default: "dang_lam",
    },
    note: { type: String, trim: true },
    active: { type: Boolean, default: true },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    completedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

batchSchema.index({ product: 1, customer: 1, code: 1 }, { unique: true });

module.exports = mongoose.model("Batch", batchSchema);
