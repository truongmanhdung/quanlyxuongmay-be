const mongoose = require("mongoose");

// THONG_BAO_TRONG_APP: nhac cong nhan gui san luong (tu dong hoac quan ly ban tay bam)
const notificationSchema = new mongoose.Schema(
  {
    worker: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, trim: true },
    type: { type: String, enum: ["reminder", "manual", "system"], default: "manual" },
    read: { type: Boolean, default: false },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

notificationSchema.index({ worker: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
