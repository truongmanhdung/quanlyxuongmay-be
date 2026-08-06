const Batch = require("../models/Batch");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const ProductionReport = require("../models/ProductionReport");
const OrderDetail = require("../models/OrderDetail");
const asyncHandler = require("../utils/asyncHandler");
const { emitToAdmins } = require("../realtime/socket");

const POPULATE = [
  { path: "product", select: "name unit" },
  { path: "customer", select: "code name" },
];

// So luong da bao cao cho 1 lo = tong ProductionReport cung customer+product+batchNumber (khong phan biet hoa/thuong)
async function reportedQuantityFor(batch) {
  const rows = await ProductionReport.aggregate([
    {
      $match: {
        customer: batch.customer._id || batch.customer,
        product: batch.product._id || batch.product,
        batchNumber: new RegExp(`^${batch.code}$`, "i"),
      },
    },
    { $group: { _id: null, total: { $sum: "$quantity" } } },
  ]);
  return rows[0]?.total || 0;
}

// So luong da xuat kho gan voi lo nay = tong OrderDetail.quantity co batch = lo nay va thuoc phieu loai "xuat"
// Cho phep doi chieu: lo san xuat xong roi thi da xuat kho duoc bao nhieu trong so do.
async function exportedQuantityFor(batch) {
  const rows = await OrderDetail.aggregate([
    { $match: { batch: batch._id } },
    { $lookup: { from: "orders", localField: "order", foreignField: "_id", as: "order" } },
    { $unwind: "$order" },
    { $match: { "order.type": "xuat" } },
    { $group: { _id: null, total: { $sum: "$quantity" } } },
  ]);
  return rows[0]?.total || 0;
}

// GET /api/batches?status=&product=&customer=&search=
const list = asyncHandler(async (req, res) => {
  const { status, product, customer, search } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (product) filter.product = product;
  if (customer) filter.customer = customer;
  if (search) filter.code = new RegExp(search, "i");

  const batches = await Batch.find(filter).populate(POPULATE).sort({ createdAt: -1 });
  const withProgress = await Promise.all(
    batches.map(async (b) => ({
      ...b.toObject(),
      reportedQuantity: await reportedQuantityFor(b),
      exportedQuantity: await exportedQuantityFor(b),
    }))
  );
  res.json(withProgress);
});

const getOne = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.id).populate(POPULATE);
  if (!batch) return res.status(404).json({ message: "Không tìm thấy lô hàng" });

  const reports = await ProductionReport.find({
    customer: batch.customer._id,
    product: batch.product._id,
    batchNumber: new RegExp(`^${batch.code}$`, "i"),
  })
    .populate("worker", "code name")
    .populate("processStage", "name unitPrice")
    .sort({ createdAt: -1 });

  res.json({
    ...batch.toObject(),
    reportedQuantity: await reportedQuantityFor(batch),
    exportedQuantity: await exportedQuantityFor(batch),
    reports,
  });
});

// POST { code, product, customer, plannedQuantity, note }
const create = asyncHandler(async (req, res) => {
  const { code, product, customer, plannedQuantity, note } = req.body;
  if (!code || !product || !customer) {
    return res.status(400).json({ message: "Thiếu mã lô, mẫu hàng hoặc khách hàng" });
  }
  const [productExists, customerExists] = await Promise.all([
    Product.findById(product),
    Customer.findById(customer),
  ]);
  if (!productExists) return res.status(404).json({ message: "Không tìm thấy mẫu hàng" });
  if (!customerExists) return res.status(404).json({ message: "Không tìm thấy khách hàng" });

  const batch = await Batch.create({
    code,
    product,
    customer,
    plannedQuantity: plannedQuantity || undefined,
    note,
    createdBy: req.auth.sub,
  });
  const populated = await batch.populate(POPULATE);
  const withProgress = { ...populated.toObject(), reportedQuantity: 0, exportedQuantity: 0 };
  emitToAdmins("batch:new", withProgress);
  res.status(201).json(withProgress);
});

// PUT { plannedQuantity, note, status } - status chi cho phep dang_lam / chua_hoan_thanh (hoan_thanh phai qua /complete)
const update = asyncHandler(async (req, res) => {
  const { plannedQuantity, note, status } = req.body;
  if (status && !["dang_lam", "chua_hoan_thanh"].includes(status)) {
    return res.status(400).json({ message: "Dùng /complete để chuyển sang trạng thái Hoàn thành" });
  }
  const batch = await Batch.findByIdAndUpdate(
    req.params.id,
    { $set: { plannedQuantity, note, ...(status ? { status } : {}) } },
    { new: true, runValidators: true }
  ).populate(POPULATE);
  if (!batch) return res.status(404).json({ message: "Không tìm thấy lô hàng" });
  const withProgress = {
    ...batch.toObject(),
    reportedQuantity: await reportedQuantityFor(batch),
    exportedQuantity: await exportedQuantityFor(batch),
  };
  emitToAdmins("batch:updated", withProgress);
  res.json(withProgress);
});

// PATCH /api/batches/:id/complete - quan ly duyet hoan thanh (thu cong, khong tu dong)
const complete = asyncHandler(async (req, res) => {
  const batch = await Batch.findByIdAndUpdate(
    req.params.id,
    { $set: { status: "hoan_thanh", completedBy: req.auth.sub, completedAt: new Date() } },
    { new: true }
  ).populate(POPULATE);
  if (!batch) return res.status(404).json({ message: "Không tìm thấy lô hàng" });
  const withProgress = {
    ...batch.toObject(),
    reportedQuantity: await reportedQuantityFor(batch),
    exportedQuantity: await exportedQuantityFor(batch),
  };
  emitToAdmins("batch:updated", withProgress);
  res.json(withProgress);
});

const remove = asyncHandler(async (req, res) => {
  const batch = await Batch.findByIdAndDelete(req.params.id);
  if (!batch) return res.status(404).json({ message: "Không tìm thấy lô hàng" });
  res.status(204).send();
});

module.exports = { list, getOne, create, update, complete, remove };
