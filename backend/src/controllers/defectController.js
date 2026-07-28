const mongoose = require("mongoose");
const DefectReport = require("../models/DefectReport");
const ProductionReport = require("../models/ProductionReport");
const ProcessStage = require("../models/ProcessStage");
const Worker = require("../models/Worker");
const asyncHandler = require("../utils/asyncHandler");
const { periodRange, currentPeriod } = require("../utils/period");
const { emitToAdmins } = require("../realtime/socket");

const POPULATE = [
  { path: "product", select: "code name unit" },
  { path: "customer", select: "code name" },
  { path: "batch", select: "code" },
  { path: "processStage", select: "name" },
  { path: "worker", select: "code name" },
];

// GET /api/defects?product=&customer=&batch=&type=&from=&to=
const list = asyncHandler(async (req, res) => {
  const { product, customer, batch, type, from, to } = req.query;
  const filter = {};
  if (product) filter.product = product;
  if (customer) filter.customer = customer;
  if (batch) filter.batch = batch;
  if (type) filter.type = type;
  if (from || to) {
    filter.reportedAt = {};
    if (from) filter.reportedAt.$gte = new Date(from);
    if (to) filter.reportedAt.$lte = new Date(to);
  }
  const defects = await DefectReport.find(filter).populate(POPULATE).sort({ reportedAt: -1 });
  res.json(defects);
});

// POST { batch?, product, customer, processStage?, worker?, quantity, type, reason, reportedAt? }
const create = asyncHandler(async (req, res) => {
  const { batch, product, customer, processStage, worker, quantity, type, reason, reportedAt } = req.body;
  if (!product || !customer || quantity === undefined || !type) {
    return res.status(400).json({ message: "Thiếu mẫu hàng, khách hàng, số lượng hoặc loại" });
  }
  if (!["hong", "tra_lai"].includes(type)) {
    return res.status(400).json({ message: "Loại không hợp lệ" });
  }
  const defect = await DefectReport.create({
    batch: batch || undefined,
    product,
    customer,
    processStage: processStage || undefined,
    worker: worker || undefined,
    quantity,
    type,
    reason,
    reportedAt: reportedAt || Date.now(),
    createdBy: req.auth.sub,
  });
  const populated = await defect.populate(POPULATE);
  emitToAdmins("defect:new", populated);
  res.status(201).json(populated);
});

const update = asyncHandler(async (req, res) => {
  const { quantity, type, reason, reportedAt, processStage, worker } = req.body;
  const defect = await DefectReport.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        quantity,
        type,
        reason,
        reportedAt,
        processStage: processStage || undefined,
        worker: worker || undefined,
      },
    },
    { new: true, runValidators: true }
  ).populate(POPULATE);
  if (!defect) return res.status(404).json({ message: "Không tìm thấy báo cáo hàng lỗi/hoàn trả" });
  emitToAdmins("defect:updated", defect);
  res.json(defect);
});

const remove = asyncHandler(async (req, res) => {
  const defect = await DefectReport.findByIdAndDelete(req.params.id);
  if (!defect) return res.status(404).json({ message: "Không tìm thấy báo cáo hàng lỗi/hoàn trả" });
  res.status(204).send();
});

// GET /api/defects/summary?period=YYYY-MM - tong hop theo mau hang + loai, chi de xem, khong dinh vao luong
const summary = asyncHandler(async (req, res) => {
  const period = req.query.period || currentPeriod();
  const range = periodRange(period);
  if (!range) return res.status(400).json({ message: "Kỳ không hợp lệ, dùng định dạng YYYY-MM" });

  const rows = await DefectReport.aggregate([
    { $match: { reportedAt: { $gte: range.start, $lt: range.end } } },
    {
      $group: {
        _id: { product: "$product", type: "$type" },
        totalQuantity: { $sum: "$quantity" },
        count: { $sum: 1 },
      },
    },
    { $lookup: { from: "products", localField: "_id.product", foreignField: "_id", as: "product" } },
    { $unwind: "$product" },
    {
      $project: {
        _id: 0,
        product: { _id: "$product._id", code: "$product.code", name: "$product.name" },
        type: "$_id.type",
        totalQuantity: 1,
        count: 1,
      },
    },
    { $sort: { totalQuantity: -1 } },
  ]);

  const totals = rows.reduce(
    (acc, r) => {
      if (r.type === "hong") acc.totalHong += r.totalQuantity;
      if (r.type === "tra_lai") acc.totalTraLai += r.totalQuantity;
      return acc;
    },
    { totalHong: 0, totalTraLai: 0 }
  );

  res.json({ period, ...totals, rows });
});

// GET /api/defects/workers-for-stage?product=&processStage= - cong nhan tung gui bao cao san luong
// khop mau hang + cong doan nay, phuc vu logic "chon mau hang => chon cong doan => chon cong nhan"
const workersForStage = asyncHandler(async (req, res) => {
  const { product, processStage } = req.query;
  if (!product || !processStage) {
    return res.status(400).json({ message: "Thiếu mẫu hàng hoặc công đoạn" });
  }
  const workerIds = await ProductionReport.distinct("worker", { product, processStage });
  const workers = await Worker.find({ _id: { $in: workerIds } }).sort({ name: 1 });
  res.json(workers);
});

// GET /api/defects/comparison?product=&period=YYYY-MM
// So sanh san luong ke khai (ProductionReport) vs so luong loi/hoan tra (DefectReport co gan
// cong doan + cong nhan) theo tung (cong doan, cong nhan) cua 1 mau hang trong ky
const comparison = asyncHandler(async (req, res) => {
  const { product } = req.query;
  const period = req.query.period || currentPeriod();
  const range = periodRange(period);
  if (!product) return res.status(400).json({ message: "Thiếu mẫu hàng" });
  if (!range) return res.status(400).json({ message: "Kỳ không hợp lệ, dùng định dạng YYYY-MM" });

  const [declaredRows, defectRows] = await Promise.all([
    ProductionReport.aggregate([
      {
        $match: {
          product: new mongoose.Types.ObjectId(String(product)),
          status: "confirmed",
          workDate: { $gte: range.start, $lt: range.end },
        },
      },
      {
        $group: {
          _id: { processStage: "$processStage", worker: "$worker" },
          declaredQuantity: { $sum: "$quantity" },
        },
      },
    ]),
    DefectReport.aggregate([
      {
        $match: {
          product: new mongoose.Types.ObjectId(String(product)),
          processStage: { $ne: null },
          worker: { $ne: null },
          reportedAt: { $gte: range.start, $lt: range.end },
        },
      },
      {
        $group: {
          _id: { processStage: "$processStage", worker: "$worker" },
          defectQuantity: { $sum: "$quantity" },
        },
      },
    ]),
  ]);

  const key = (processStage, worker) => `${processStage}:${worker}`;
  const merged = new Map();
  declaredRows.forEach((r) => {
    merged.set(key(r._id.processStage, r._id.worker), {
      processStage: r._id.processStage,
      worker: r._id.worker,
      declaredQuantity: r.declaredQuantity,
      defectQuantity: 0,
    });
  });
  defectRows.forEach((r) => {
    const k = key(r._id.processStage, r._id.worker);
    const existing = merged.get(k);
    if (existing) {
      existing.defectQuantity = r.defectQuantity;
    } else {
      merged.set(k, {
        processStage: r._id.processStage,
        worker: r._id.worker,
        declaredQuantity: 0,
        defectQuantity: r.defectQuantity,
      });
    }
  });

  const rows = Array.from(merged.values());
  const stageIds = [...new Set(rows.map((r) => r.processStage.toString()))];
  const workerIds = [...new Set(rows.map((r) => r.worker.toString()))];
  const [stages, workers] = await Promise.all([
    ProcessStage.find({ _id: { $in: stageIds } }),
    Worker.find({ _id: { $in: workerIds } }),
  ]);
  const stageMap = new Map(stages.map((s) => [s._id.toString(), s]));
  const workerMap = new Map(workers.map((w) => [w._id.toString(), w]));

  const result = rows
    .map((r) => ({
      processStage: stageMap.get(r.processStage.toString()) || null,
      worker: workerMap.get(r.worker.toString()) || null,
      declaredQuantity: r.declaredQuantity,
      defectQuantity: r.defectQuantity,
      difference: r.declaredQuantity - r.defectQuantity,
    }))
    .sort((a, b) => (b.defectQuantity || 0) - (a.defectQuantity || 0));

  res.json({ period, product, rows: result });
});

module.exports = { list, create, update, remove, summary, workersForStage, comparison };
