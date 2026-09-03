const mongoose = require("mongoose");

// HANG_HONG_HOAN_TRA: thong ke rieng, khong tru truc tiep vao luong cong nhan
const defectReportSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    // cong doan + cong nhan gay loi, khong bat buoc - co thi moi thong ke duoc so sanh ke khai vs loi
    processStage: { type: mongoose.Schema.Types.ObjectId, ref: "ProcessStage" },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: "Worker" },
    quantity: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["hong", "tra_lai"], required: true }, // hang hong | khach tra lai
    reason: { type: String, trim: true },
    reportedAt: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

defectReportSchema.index({ reportedAt: -1 });

module.exports = mongoose.model("DefectReport", defectReportSchema);
