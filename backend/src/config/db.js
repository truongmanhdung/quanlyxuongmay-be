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
}

module.exports = connectDB;
