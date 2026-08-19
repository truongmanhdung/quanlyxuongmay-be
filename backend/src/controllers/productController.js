const Product = require("../models/Product");
const ProcessStage = require("../models/ProcessStage");
const asyncHandler = require("../utils/asyncHandler");

const list = asyncHandler(async (req, res) => {
  const { customer, search, active } = req.query;
  const filter = {};
  if (customer) filter.customer = customer;
  if (active !== undefined) filter.active = active === "true";
  if (search) {
    filter.name = new RegExp(search, "i");
  }
  const products = await Product.find(filter).populate("customer", "code name").sort({ createdAt: -1 });
  res.json(products);
});

const getOne = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate("customer", "code name");
  if (!product) return res.status(404).json({ message: "Không tìm thấy mẫu hàng" });
  const stages = await ProcessStage.find({ product: product._id, active: true }).sort({ name: 1 });
  res.json({ ...product.toObject(), stages });
});

// POST { name, customer, unit?, standardPrice?, stages?: [{ name, unitPrice }] }
// Tao mau hang kem luon cong doan + don gia (khong can them buoc rieng sau do)
const create = asyncHandler(async (req, res) => {
  const { name, customer, unit, standardPrice, stages } = req.body;
  if (!name || !customer) {
    return res.status(400).json({ message: "Thiếu tên hàng hoặc khách hàng" });
  }
  if (Array.isArray(stages)) {
    const invalid = stages.some((s) => !s?.name || s.unitPrice === undefined || s.unitPrice === null);
    if (invalid) {
      return res.status(400).json({ message: "Mỗi công đoạn cần tên và đơn giá" });
    }
  }

  const product = await Product.create({ name, customer, unit, standardPrice });

  let createdStages = [];
  if (Array.isArray(stages) && stages.length > 0) {
    createdStages = await ProcessStage.insertMany(
      stages.map((s) => ({
        product: product._id,
        name: s.name,
        unitPrice: s.unitPrice,
        priceHistory: [{ price: s.unitPrice, changedBy: req.auth.sub }],
      }))
    );
  }

  res.status(201).json({ ...product.toObject(), stages: createdStages });
});

const update = asyncHandler(async (req, res) => {
  const { name, unit, standardPrice, active } = req.body;
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: { name, unit, standardPrice, active } },
    { new: true, runValidators: true }
  );
  if (!product) return res.status(404).json({ message: "Không tìm thấy mẫu hàng" });
  res.json(product);
});

const remove = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { active: false });
  if (!product) return res.status(404).json({ message: "Không tìm thấy mẫu hàng" });
  await ProcessStage.updateMany({ product: product._id }, { active: false });
  res.status(204).send();
});

// ---- Cong doan (process stages) cua 1 ma hang ----

const listStages = asyncHandler(async (req, res) => {
  const stages = await ProcessStage.find({ product: req.params.id }).sort({ name: 1 });
  res.json(stages);
});

const createStage = asyncHandler(async (req, res) => {
  const { name, unitPrice } = req.body;
  if (!name || unitPrice === undefined) {
    return res.status(400).json({ message: "Thiếu tên công đoạn hoặc đơn giá" });
  }
  const stage = await ProcessStage.create({
    product: req.params.id,
    name,
    unitPrice,
    priceHistory: [{ price: unitPrice, changedBy: req.auth.sub }],
  });
  res.status(201).json(stage);
});

// PUT: doi don gia cong doan -> luu lich su
const updateStage = asyncHandler(async (req, res) => {
  const { name, unitPrice, active } = req.body;
  const stage = await ProcessStage.findById(req.params.stageId);
  if (!stage) return res.status(404).json({ message: "Không tìm thấy công đoạn" });

  if (name !== undefined) stage.name = name;
  if (active !== undefined) stage.active = active;
  if (unitPrice !== undefined && unitPrice !== stage.unitPrice) {
    stage.unitPrice = unitPrice;
    stage.priceHistory.push({ price: unitPrice, changedBy: req.auth.sub });
  }
  await stage.save();
  res.json(stage);
});

const removeStage = asyncHandler(async (req, res) => {
  const stage = await ProcessStage.findByIdAndUpdate(req.params.stageId, { active: false });
  if (!stage) return res.status(404).json({ message: "Không tìm thấy công đoạn" });
  res.status(204).send();
});

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
  listStages,
  createStage,
  updateStage,
  removeStage,
};
