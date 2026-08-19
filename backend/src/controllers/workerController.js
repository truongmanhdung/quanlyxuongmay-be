const Worker = require("../models/Worker");
const asyncHandler = require("../utils/asyncHandler");
const { createWithGeneratedCode } = require("../utils/codeGenerator");

const list = asyncHandler(async (req, res) => {
  const { search, active } = req.query;
  const filter = {};
  if (active !== undefined) filter.active = active === "true";
  if (search) {
    filter.$or = [{ name: new RegExp(search, "i") }, { code: new RegExp(search, "i") }];
  }
  const workers = await Worker.find(filter).sort({ createdAt: -1 });
  res.json(workers);
});

const getOne = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.params.id);
  if (!worker) return res.status(404).json({ message: "Không tìm thấy công nhân" });
  res.json(worker);
});

// Ma cong nhan (CN001, CN002...) tu sinh - day cung la ma dang nhap app cua cong nhan
const create = asyncHandler(async (req, res) => {
  const { name, phone, note } = req.body;
  if (!name) return res.status(400).json({ message: "Thiếu tên công nhân" });
  const worker = await createWithGeneratedCode(Worker, "CN", 3, (code) => ({ code, name, phone, note }));
  res.status(201).json(worker);
});

const update = asyncHandler(async (req, res) => {
  const { name, phone, note, active } = req.body;
  const worker = await Worker.findByIdAndUpdate(
    req.params.id,
    { $set: { name, phone, note, active } },
    { new: true, runValidators: true }
  );
  if (!worker) return res.status(404).json({ message: "Không tìm thấy công nhân" });
  res.json(worker);
});

const remove = asyncHandler(async (req, res) => {
  const worker = await Worker.findByIdAndUpdate(req.params.id, { active: false });
  if (!worker) return res.status(404).json({ message: "Không tìm thấy công nhân" });
  res.status(204).send();
});

module.exports = { list, getOne, create, update, remove };
