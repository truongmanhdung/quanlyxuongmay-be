const mongoose = require("mongoose");

// BAO_CONG_SAN_LUONG: cong nhan gui san luong hoan thanh theo lo hang
const productionReportSchema = new mongoose.Schema(
  {
    worker: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true }, // ma_dang_nhap
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true }, // ma_hang
    processStage: { type: mongoose.Schema.Types.ObjectId, ref: "ProcessStage", required: true }, // cong_doan
    batchNumber: { type: String, trim: true }, // so_lo
    quantity: { type: Number, required: true, min: 0 }, // so_luong_san_xuat
    unitPrice: { type: Number, required: true, min: 0 }, // don gia chot tai thoi diem gui
    amount: { type: Number, required: true, min: 0 }, // quantity * unitPrice
    status: { type: String, enum: ["pending", "confirmed", "rejected"], default: "confirmed" },
    workDate: { type: Date, default: Date.now }, // ngay_thang_nam lam viec
  },
  { timestamps: true } // createdAt = ngay gio gui (submittedAt)
);

productionReportSchema.index({ worker: 1, createdAt: -1 });
productionReportSchema.index({ workDate: 1 });

module.exports = mongoose.model("ProductionReport", productionReportSchema);
