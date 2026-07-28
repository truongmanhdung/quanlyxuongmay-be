const mongoose = require("mongoose");

// CONG_DOAN: mot cong doan san xuat cua 1 ma hang, kem don gia hien tai + lich su doi gia
const priceHistorySchema = new mongoose.Schema(
  {
    price: { type: Number, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const processStageSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true, trim: true }, // ten_cong_doan
    unitPrice: { type: Number, required: true, default: 0 }, // don_gia hien tai
    priceHistory: { type: [priceHistorySchema], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

processStageSchema.index({ product: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("ProcessStage", processStageSchema);
