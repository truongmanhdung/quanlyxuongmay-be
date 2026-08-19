const mongoose = require("mongoose");
const Order = require("../models/Order");
const OrderDetail = require("../models/OrderDetail");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");
const { createWithGeneratedCode } = require("../utils/codeGenerator");

const list = asyncHandler(async (req, res) => {
  const { type, customer, from, to } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (customer) filter.customer = customer;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }
  const orders = await Order.find(filter).populate("customer", "code name").sort({ date: -1 });
  res.json(orders);
});

const getOne = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("customer", "code name");
  if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
  const details = await OrderDetail.find({ order: order._id })
    .populate("product", "name unit")
    .populate("batch", "code");
  res.json({ ...order.toObject(), details });
});

// Ton kho = tong so luong da Nhap - tong so luong da Xuat, theo 1 khach hang + 1 ma hang
async function stockFor(customerId, productId) {
  const rows = await OrderDetail.aggregate([
    { $lookup: { from: "orders", localField: "order", foreignField: "_id", as: "order" } },
    { $unwind: "$order" },
    {
      $match: {
        product: new mongoose.Types.ObjectId(String(productId)),
        "order.customer": new mongoose.Types.ObjectId(String(customerId)),
        "order.active": { $ne: false },
      },
    },
    { $group: { _id: "$order.type", total: { $sum: "$quantity" } } },
  ]);
  const imported = rows.find((r) => r._id === "nhap")?.total || 0;
  const exported = rows.find((r) => r._id === "xuat")?.total || 0;
  return { imported, exported, remaining: imported - exported };
}

// POST { type, customer, date, note, details: [{ product, quantity, unitPrice }] }
// Ma phieu tu sinh: Nhap -> PN0001, Xuat -> PX0001
const create = asyncHandler(async (req, res) => {
  const { type, customer, date, note, details } = req.body;
  if (!customer) return res.status(400).json({ message: "Thiếu khách hàng" });
  if (!["nhap", "xuat"].includes(type)) {
    return res.status(400).json({ message: "Thiếu loại đơn hoặc loại đơn không hợp lệ" });
  }

  if (type === "xuat" && Array.isArray(details) && details.length > 0) {
    const requestedByProduct = new Map();
    details.forEach((d) => {
      requestedByProduct.set(d.product, (requestedByProduct.get(d.product) || 0) + Number(d.quantity || 0));
    });
    for (const [productId, requestedQty] of requestedByProduct) {
      const { remaining } = await stockFor(customer, productId);
      if (requestedQty > remaining) {
        const product = await Product.findById(productId);
        return res.status(400).json({
          message: `Xuất vượt quá tồn kho mẫu hàng ${product ? product.name : productId} (còn lại: ${remaining})`,
        });
      }
    }
  }

  const order = await createWithGeneratedCode(Order, type === "nhap" ? "PN" : "PX", 4, (code) => ({
    code,
    type,
    customer,
    date,
    note,
    createdBy: req.auth.sub,
  }));

  let createdDetails = [];
  if (Array.isArray(details) && details.length > 0) {
    createdDetails = await OrderDetail.insertMany(
      details.map((d) => ({
        order: order._id,
        product: d.product,
        batch: d.batch || undefined,
        quantity: d.quantity,
        unitPrice: d.unitPrice || 0,
      }))
    );
  }
  res.status(201).json({ ...order.toObject(), details: createdDetails });
});

const update = asyncHandler(async (req, res) => {
  const { date, note, type, active } = req.body;
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { $set: { date, note, type, active } },
    { new: true, runValidators: true }
  );
  if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
  res.json(order);
});

const remove = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { active: false });
  if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
  res.status(204).send();
});

// ---- Chi tiet don hang ----

const addDetail = asyncHandler(async (req, res) => {
  const { product, batch, quantity, unitPrice } = req.body;
  if (!product || quantity === undefined) {
    return res.status(400).json({ message: "Thiếu mã hàng hoặc số lượng" });
  }
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

  if (order.type === "xuat") {
    const { remaining } = await stockFor(order.customer, product);
    if (Number(quantity) > remaining) {
      const productDoc = await Product.findById(product);
      return res.status(400).json({
        message: `Xuất vượt quá tồn kho mẫu hàng ${productDoc ? productDoc.name : product} (còn lại: ${remaining})`,
      });
    }
  }

  const detail = await OrderDetail.create({
    order: req.params.id,
    product,
    batch: batch || undefined,
    quantity,
    unitPrice: unitPrice || 0,
  });
  res.status(201).json(detail);
});

const updateDetail = asyncHandler(async (req, res) => {
  const { quantity, unitPrice, batch } = req.body;
  const existing = await OrderDetail.findOne({ _id: req.params.detailId, order: req.params.id });
  if (!existing) return res.status(404).json({ message: "Không tìm thấy chi tiết đơn hàng" });

  if (quantity !== undefined) {
    const order = await Order.findById(req.params.id);
    if (order?.type === "xuat") {
      const { remaining } = await stockFor(order.customer, existing.product);
      // tru dong nay ra khoi ton hien tai (vi so luong cu da bi tinh vao phan da xuat) truoc khi so sanh
      const remainingWithoutThisLine = remaining + existing.quantity;
      if (Number(quantity) > remainingWithoutThisLine) {
        const productDoc = await Product.findById(existing.product);
        return res.status(400).json({
          message: `Xuất vượt quá tồn kho mẫu hàng ${productDoc ? productDoc.name : existing.product} (còn lại: ${remainingWithoutThisLine})`,
        });
      }
    }
  }

  const detail = await OrderDetail.findOneAndUpdate(
    { _id: req.params.detailId, order: req.params.id },
    { $set: { quantity, unitPrice, ...(batch !== undefined ? { batch: batch || null } : {}) } },
    { new: true, runValidators: true }
  );
  res.json(detail);
});

const removeDetail = asyncHandler(async (req, res) => {
  const detail = await OrderDetail.findOneAndDelete({ _id: req.params.detailId, order: req.params.id });
  if (!detail) return res.status(404).json({ message: "Không tìm thấy chi tiết đơn hàng" });
  res.status(204).send();
});

// GET /api/orders/stock?customer=&product= - ton kho khả dung 1 ma hang cua 1 khach hang
const stock = asyncHandler(async (req, res) => {
  const { customer, product } = req.query;
  if (!customer || !product) {
    return res.status(400).json({ message: "Thiếu khách hàng hoặc mẫu hàng" });
  }
  const result = await stockFor(customer, product);
  res.json(result);
});

// GET /api/orders/stock-summary?customer= - ton kho theo tung ma hang cua 1 khach hang
const stockSummary = asyncHandler(async (req, res) => {
  const { customer } = req.query;
  if (!customer) return res.status(400).json({ message: "Thiếu khách hàng" });

  const rows = await OrderDetail.aggregate([
    { $lookup: { from: "orders", localField: "order", foreignField: "_id", as: "order" } },
    { $unwind: "$order" },
    {
      $match: {
        "order.customer": new mongoose.Types.ObjectId(String(customer)),
        "order.active": { $ne: false },
      },
    },
    {
      $group: {
        _id: { product: "$product", type: "$order.type" },
        total: { $sum: "$quantity" },
      },
    },
    {
      $group: {
        _id: "$_id.product",
        byType: { $push: { type: "$_id.type", total: "$total" } },
      },
    },
    { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
    { $unwind: "$product" },
    {
      $project: {
        _id: 0,
        product: { _id: "$product._id", name: "$product.name", unit: "$product.unit" },
        byType: 1,
      },
    },
  ]);

  const summary = rows
    .map((r) => {
      const imported = r.byType.find((t) => t.type === "nhap")?.total || 0;
      const exported = r.byType.find((t) => t.type === "xuat")?.total || 0;
      return { product: r.product, imported, exported, remaining: imported - exported };
    })
    .sort((a, b) => a.product.name.localeCompare(b.product.name));

  res.json({ customer, rows: summary });
});

module.exports = { list, getOne, create, update, remove, addDetail, updateDetail, removeDetail, stock, stockSummary };
