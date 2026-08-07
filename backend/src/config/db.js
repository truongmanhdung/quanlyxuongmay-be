const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI in environment");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log(`[db] connected -> ${mongoose.connection.name}`);

  // Bo truong "code" khoi Product (2026-08): xoa index unique cu con sot lai tren DB
  // vi schema khong con khai bao truong nay nua.
  await require("../models/Product").syncIndexes();

  // Doi PayrollSlip tu "period" (thang, VD "2026-07") sang periodFrom/periodTo (khoang ngay) (2026-08).
  // Cac ban ghi cu chua co periodFrom/periodTo deu se ra gia tri null giong nhau -> build index
  // unique moi se bao loi trung khoa. Backfill tu "period" truoc khi sync index de khong mat du lieu
  // phieu luong da xuat truoc do.
  const PayrollSlip = require("../models/PayrollSlip");
  const legacySlips = await PayrollSlip.collection.find({ periodFrom: { $exists: false } }).toArray();
  for (const doc of legacySlips) {
    const match = /^(\d{4})-(\d{2})$/.exec(doc.period || "");
    if (!match) continue;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const periodFrom = new Date(Date.UTC(year, month - 1, 1));
    const periodTo = new Date(Date.UTC(year, month, 0)); // ngay cuoi cung cua thang do
    await PayrollSlip.collection.updateOne(
      { _id: doc._id },
      { $set: { periodFrom, periodTo }, $unset: { period: "" } }
    );
  }
  if (legacySlips.length > 0) {
    console.log(`[db] da chuyen ${legacySlips.length} phieu luong cu sang periodFrom/periodTo`);
  }
  await PayrollSlip.syncIndexes();
}

module.exports = connectDB;
