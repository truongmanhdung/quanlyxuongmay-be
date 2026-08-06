require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const mongoose = require("mongoose");

const User = require("../models/User");
const Worker = require("../models/Worker");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const ProcessStage = require("../models/ProcessStage");

async function seed() {
  await connectDB();

  const username = (process.env.SEED_ADMIN_USERNAME || "admin").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "admin123";

  let admin = await User.findOne({ username });
  if (!admin) {
    const passwordHash = await bcrypt.hash(password, 10);
    admin = await User.create({ username, passwordHash, name: "Quản trị viên", role: "admin" });
    console.log(`[seed] created admin user '${username}' / '${password}'`);
  } else {
    console.log(`[seed] admin user '${username}' already exists`);
  }

  const customerCount = await Customer.countDocuments();
  if (customerCount === 0) {
    const customer = await Customer.create({ code: "KH001", name: "Công ty May Mẫu A", phone: "0900000001" });
    const product = await Product.create({
      name: "Áo sơ mi nam",
      customer: customer._id,
      unit: "áo",
      standardPrice: 15000,
    });
    await ProcessStage.create([
      { product: product._id, name: "Cắt", unitPrice: 3000, priceHistory: [{ price: 3000 }] },
      { product: product._id, name: "May thân", unitPrice: 7000, priceHistory: [{ price: 7000 }] },
      { product: product._id, name: "Đóng gói", unitPrice: 2000, priceHistory: [{ price: 2000 }] },
    ]);
    console.log("[seed] created sample customer, product and process stages");
  }

  const workerCount = await Worker.countDocuments();
  if (workerCount === 0) {
    await Worker.create([
      { code: "A012", name: "Nguyễn Thị Lan", phone: "0900000002" },
      { code: "A013", name: "Trần Văn Bình", phone: "0900000003" },
    ]);
    console.log("[seed] created sample workers A012, A013");
  }

  await mongoose.disconnect();
  console.log("[seed] done");
}

seed().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
