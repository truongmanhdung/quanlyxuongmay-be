const mongoose = require("mongoose");
const Order = require("../models/Order");
const OrderDetail = require("../models/OrderDetail");
const Product = require("../models/Product");
const ProcessStage = require("../models/ProcessStage");
const ProductionReport = require("../models/ProductionReport");
const asyncHandler = require("../utils/asyncHandler");
const { createWithGeneratedCode } = require("../utils/codeGenerator");

// So thanh pham HOAN CHINH cua 1 mau hang = min san luong da duyet qua TUNG cong doan.
// VD ao co 3 cong doan, cat xong 2000, may xong 1000, dong goi xong 3000 -> chi 1000 sp hoan chinh.
// Cong doan nao chua co bao cao nao -> coi nhu 0 -> min = 0.
async function finishedQuantityFor(customerId, productId) {
  const stages = await ProcessStage.find({ product: productId, active: true }).select("_id");
  if (stages.length === 0) return 0; // chua khai bao cong doan thi khong the co thanh pham
  const stageIds = stages.map((s) => s._id);
  const rows = await ProductionReport.aggregate([
    {
      $match: {
        customer: new mongoose.Types.ObjectId(String(customerId)),
        product: new mongoose.Types.ObjectId(String(productId)),
        processStage: { $in: stageIds },
        status: "confirmed",
      },
    },
    { $group: { _id: "$processStage", total: { $sum: "$quantity" } } },
  ]);
  const byStage = new Map(rows.map((r) => [r._id.toString(), r.total]));
  return Math.min(...stageIds.map((id) => byStage.get(id.toString()) || 0));
}

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
  const details = await OrderDetail.find({ order: order._id }).populate("product", "name unit");
  res.json({ ...order.toObject(), details });
});

// Ton kho = tong so luong da Nhap - tong so luong da Xuat, theo 1 khach hang + 1 ma hang
async function stockFor(customerId, productId) {
  const [rows, finished] = await Promise.all([
    OrderDetail.aggregate([
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
    ]),
    finishedQuantityFor(customerId, productId),
  ]);
  const imported = rows.find((r) => r._id === "nhap")?.total || 0;
  const exported = rows.find((r) => r._id === "xuat")?.total || 0;
  return {
    imported,
    exported,
    finished, // so thanh pham hoan chinh = min san luong cac cong doan
    canExport: Math.max(0, finished - exported), // con co the ban giao cho khach
    remaining: imported - exported, // vai/phoi con lai tai xuong (giu de tuong thich)
  };
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
      const { canExport } = await stockFor(customer, productId);
      if (requestedQty > canExport) {
        const product = await Product.findById(productId);
        return res.status(400).json({
          message: `Mẫu hàng ${product ? product.name : productId}: chỉ xuất được tối đa ${canExport} (số thành phẩm đã hoàn thành đủ các công đoạn, trừ đã xuất)`,
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
  const { product, quantity, unitPrice } = req.body;
  if (!product || quantity === undefined) {
    return res.status(400).json({ message: "Thiếu mã hàng hoặc số lượng" });
  }
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

  if (order.type === "xuat") {
    const { canExport } = await stockFor(order.customer, product);
    if (Number(quantity) > canExport) {
      const productDoc = await Product.findById(product);
      return res.status(400).json({
        message: `Mẫu hàng ${productDoc ? productDoc.name : product}: chỉ xuất được tối đa ${canExport} (số thành phẩm đã hoàn thành đủ các công đoạn, trừ đã xuất)`,
      });
    }
  }

  const detail = await OrderDetail.create({
    order: req.params.id,
    product,
    quantity,
    unitPrice: unitPrice || 0,
  });
  res.status(201).json(detail);
});

const updateDetail = asyncHandler(async (req, res) => {
  const { quantity, unitPrice } = req.body;
  const existing = await OrderDetail.findOne({ _id: req.params.detailId, order: req.params.id });
  if (!existing) return res.status(404).json({ message: "Không tìm thấy chi tiết đơn hàng" });

  if (quantity !== undefined) {
    const order = await Order.findById(req.params.id);
    if (order?.type === "xuat") {
      const { canExport } = await stockFor(order.customer, existing.product);
      // cong lai so luong dong nay (da bi tinh vao "da xuat") truoc khi so sanh
      const maxForThisLine = canExport + existing.quantity;
      if (Number(quantity) > maxForThisLine) {
        const productDoc = await Product.findById(existing.product);
        return res.status(400).json({
          message: `Mẫu hàng ${productDoc ? productDoc.name : existing.product}: chỉ xuất được tối đa ${maxForThisLine} (số thành phẩm đã hoàn thành đủ các công đoạn)`,
        });
      }
    }
  }

  const detail = await OrderDetail.findOneAndUpdate(
    { _id: req.params.detailId, order: req.params.id },
    { $set: { quantity, unitPrice } },
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

  // Gop them cac mau hang cua khach chua co don Nhap/Xuat nao (van co the dang san xuat)
  const allProducts = await Product.find({ customer, active: true }).select("_id name unit");
  const byId = new Map();
  rows.forEach((r) => byId.set(r.product._id.toString(), r));
  allProducts.forEach((p) => {
    const id = p._id.toString();
    if (!byId.has(id)) byId.set(id, { product: { _id: p._id, name: p.name, unit: p.unit }, byType: [] });
  });

  const summary = await Promise.all(
    [...byId.values()].map(async (r) => {
      const imported = r.byType.find((t) => t.type === "nhap")?.total || 0;
      const exported = r.byType.find((t) => t.type === "xuat")?.total || 0;
      const finished = await finishedQuantityFor(customer, r.product._id);
      return {
        product: r.product,
        imported, // vai/phoi khach giao
        exported, // thanh pham da ban giao
        finished, // thanh pham hoan chinh = min san luong cac cong doan
        canExport: Math.max(0, finished - exported), // con co the ban giao
        remaining: imported - exported,
      };
    })
  );
  summary.sort((a, b) => a.product.name.localeCompare(b.product.name));

  res.json({ customer, rows: summary });
});

module.exports = { list, getOne, create, update, remove, addDetail, updateDetail, removeDetail, stock, stockSummary };
