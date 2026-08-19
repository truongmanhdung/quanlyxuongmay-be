const Customer = require("../models/Customer");
const asyncHandler = require("../utils/asyncHandler");
const { createWithGeneratedCode } = require("../utils/codeGenerator");

const list = asyncHandler(async (req, res) => {
  const { search, active } = req.query;
  const filter = {};
  if (active !== undefined) filter.active = active === "true";
  if (search) {
    filter.$or = [
      { name: new RegExp(search, "i") },
      { code: new RegExp(search, "i") },
      { phone: new RegExp(search, "i") },
    ];
  }
  const customers = await Customer.find(filter).sort({ createdAt: -1 });
  res.json(customers);
});

const getOne = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: "Không tìm thấy khách hàng" });
  res.json(customer);
});

// Ma khach hang (KH001, KH002...) tu sinh, khong nhan tu client
const create = asyncHandler(async (req, res) => {
  const { name, phone, note } = req.body;
  if (!name) return res.status(400).json({ message: "Thiếu tên khách hàng" });
  const customer = await createWithGeneratedCode(Customer, "KH", 3, (code) => ({ code, name, phone, note }));
  res.status(201).json(customer);
});

const update = asyncHandler(async (req, res) => {
  const { name, phone, note, active } = req.body;
  const customer = await Customer.findByIdAndUpdate(
    req.params.id,
    { $set: { name, phone, note, active } },
    { new: true, runValidators: true }
  );
  if (!customer) return res.status(404).json({ message: "Không tìm thấy khách hàng" });
  res.json(customer);
});

const remove = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, { active: false });
  if (!customer) return res.status(404).json({ message: "Không tìm thấy khách hàng" });
  res.status(204).send();
});

module.exports = { list, getOne, create, update, remove };
