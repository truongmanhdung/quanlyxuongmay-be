const ProductionReport = require("../models/ProductionReport");
const ProcessStage = require("../models/ProcessStage");
const asyncHandler = require("../utils/asyncHandler");
const { emitToAdmins, emitToWorker } = require("../realtime/socket");

const POPULATE = [
  { path: "worker", select: "code name" },
  { path: "customer", select: "code name" },
  { path: "product", select: "code name unit" },
  { path: "processStage", select: "name unitPrice" },
];

// POST /api/reports  (worker)  { customer, product, processStage, batchNumber, quantity, workDate }
const create = asyncHandler(async (req, res) => {
  const { customer, product, processStage, batchNumber, quantity, workDate } = req.body;
  if (!customer || !product || !processStage || quantity === undefined) {
    return res.status(400).json({ message: "Thiếu khách hàng, mẫu hàng, công đoạn hoặc sản lượng" });
  }
  if (Number(quantity) <= 0) {
    return res.status(400).json({ message: "Sản lượng phải lớn hơn 0" });
  }

  const stage = await ProcessStage.findById(processStage);
  if (!stage) return res.status(404).json({ message: "Không tìm thấy công đoạn" });

  const unitPrice = stage.unitPrice;
  const amount = unitPrice * Number(quantity);

  const report = await ProductionReport.create({
    worker: req.auth.sub,
    customer,
    product,
    processStage,
    batchNumber,
    quantity,
    unitPrice,
    amount,
    workDate: workDate || Date.now(),
  });

  const populated = await report.populate(POPULATE);
  emitToAdmins("report:new", populated);
  res.status(201).json(populated);
});

// GET /api/reports/mine  (worker) - lich su gui cua chinh minh
const mine = asyncHandler(async (req, res) => {
  const reports = await ProductionReport.find({ worker: req.auth.sub })
    .populate(POPULATE)
    .sort({ createdAt: -1 });
  res.json(reports);
});

// GET /api/reports  (admin) filters: worker, product, customer, status, from, to
const list = asyncHandler(async (req, res) => {
  const { worker, product, customer, status, from, to } = req.query;
  const filter = {};
  if (worker) filter.worker = worker;
  if (product) filter.product = product;
  if (customer) filter.customer = customer;
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  const reports = await ProductionReport.find(filter).populate(POPULATE).sort({ createdAt: -1 });
  res.json(reports);
});

// GET /api/reports/recent?limit=20  (admin) - feed thong bao
const recent = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const reports = await ProductionReport.find().populate(POPULATE).sort({ createdAt: -1 }).limit(limit);
  res.json(reports);
});

const getOne = asyncHandler(async (req, res) => {
  const report = await ProductionReport.findById(req.params.id).populate(POPULATE);
  if (!report) return res.status(404).json({ message: "Không tìm thấy báo cáo sản lượng" });
  if (req.auth.role === "worker" && report.worker._id.toString() !== req.auth.sub) {
    return res.status(403).json({ message: "Không có quyền xem báo cáo này" });
  }
  res.json(report);
});

// PATCH /api/reports/:id/status  (admin) { status: 'confirmed' | 'rejected' }
const setStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["pending", "confirmed", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Trạng thái không hợp lệ" });
  }
  const report = await ProductionReport.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate(
    POPULATE
  );
  if (!report) return res.status(404).json({ message: "Không tìm thấy báo cáo sản lượng" });
  emitToWorker(report.worker._id.toString(), "report:status", report);
  res.json(report);
});

module.exports = { create, mine, list, recent, getOne, setStatus };
