const path = require("node:path");
const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const OrderDetail = require("../models/OrderDetail");
const Customer = require("../models/Customer");
const RevenueSlip = require("../models/RevenueSlip");
const asyncHandler = require("../utils/asyncHandler");
const { dateRangeFromQuery } = require("../utils/period");
const { formatCurrency, formatNumber } = require("../utils/format");

// Be Vietnam Pro: font Unicode co day du dau tieng Viet (Helvetica chuan cua pdfkit khong co glyph dau)
const FONT_REGULAR = path.join(__dirname, "../assets/fonts/BeVietnamPro-Regular.ttf");
const FONT_BOLD = path.join(__dirname, "../assets/fonts/BeVietnamPro-Bold.ttf");

// Cac dong phieu Xuat (tra hang thanh pham cho khach) trong ky. Doanh thu = SL x don gia tren tung dong.
async function exportLines(range, customerId) {
  const match = {
    "order.type": "xuat",
    "order.active": { $ne: false },
    "order.date": { $gte: range.start, $lt: range.end },
  };
  if (customerId) match["order.customer"] = new mongoose.Types.ObjectId(String(customerId));

  return OrderDetail.aggregate([
    { $lookup: { from: "orders", localField: "order", foreignField: "_id", as: "order" } },
    { $unwind: "$order" },
    { $match: match },
    { $lookup: { from: "products", localField: "product", foreignField: "_id", as: "product" } },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    // Cac cong doan cua mau hang nay + don gia gia cong (de doi chieu voi don gia ban)
    {
      $lookup: {
        from: "processstages",
        let: { pid: "$product._id" },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ["$product", "$$pid"] }, { $ne: ["$active", false] }] } } },
          { $sort: { name: 1 } },
          { $project: { _id: 0, name: 1, unitPrice: 1 } },
        ],
        as: "stages",
      },
    },
    { $sort: { "order.date": 1, "order.code": 1 } },
    {
      $project: {
        _id: 1,
        order: "$order._id",
        orderCode: "$order.code",
        date: "$order.date",
        customerId: "$order.customer",
        productName: { $ifNull: ["$product.name", "(mẫu hàng đã xoá)"] },
        quantity: "$quantity",
        unitPrice: "$unitPrice",
        amount: { $multiply: ["$quantity", { $ifNull: ["$unitPrice", 0] }] },
        stages: "$stages",
        stageCost: { $sum: "$stages.unitPrice" },
      },
    },
  ]);
}

function toLineDto(l) {
  const unitPrice = l.unitPrice || 0;
  const stageCost = l.stageCost || 0;
  const stages = (l.stages || []).map((s) => ({ name: s.name, unitPrice: s.unitPrice || 0 }));
  return {
    order: l.order,
    orderCode: l.orderCode,
    date: l.date,
    productName: l.productName,
    quantity: l.quantity,
    unitPrice,
    amount: Math.round(l.amount || 0),
    stages,
    stageCost, // tong don gia gia cong 1 sp (chi phi cong doan)
    grossMargin: unitPrice - stageCost, // lai gop 1 sp = don gia ban - chi phi cong doan
  };
}

// GET /api/revenue/summary?from=YYYY-MM-DD&to=YYYY-MM-DD  -> doanh thu tat ca khach hang trong ky (tinh dong)
const summary = asyncHandler(async (req, res) => {
  const range = dateRangeFromQuery(req.query);
  if (!range) return res.status(400).json({ message: "Khoảng ngày không hợp lệ" });

  const lines = await exportLines(range);

  const byCustomer = new Map();
  for (const line of lines) {
    if (!line.customerId) continue;
    const key = line.customerId.toString();
    const acc = byCustomer.get(key) || { orders: new Set(), totalQuantity: 0, totalAmount: 0 };
    acc.orders.add(line.order.toString());
    acc.totalQuantity += line.quantity;
    acc.totalAmount += Math.round(line.amount || 0);
    byCustomer.set(key, acc);
  }

  const customerIds = [...byCustomer.keys()];
  const customers = await Customer.find({ _id: { $in: customerIds } }).select("code name");
  const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));

  const rows = customerIds
    .map((id) => {
      const acc = byCustomer.get(id);
      return {
        customer: customerMap.get(id) || null,
        orderCount: acc.orders.size,
        totalQuantity: acc.totalQuantity,
        totalAmount: acc.totalAmount,
      };
    })
    .filter((r) => r.customer)
    .sort((a, b) => b.totalAmount - a.totalAmount);

  res.json({ from: range.from, to: range.to, rows });
});

// GET /api/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD&customer=  -> chi tiet cac dong phieu Xuat cua 1 khach hang
const detail = asyncHandler(async (req, res) => {
  const range = dateRangeFromQuery(req.query);
  if (!range) return res.status(400).json({ message: "Khoảng ngày không hợp lệ" });
  const { customer } = req.query;
  if (!customer) return res.status(400).json({ message: "Thiếu khách hàng" });

  const [lines, customerDoc] = await Promise.all([
    exportLines(range, customer),
    Customer.findById(customer).select("code name"),
  ]);

  const totalQuantity = lines.reduce((s, l) => s + l.quantity, 0);
  const totalAmount = lines.reduce((s, l) => s + Math.round(l.amount || 0), 0);

  res.json({
    from: range.from,
    to: range.to,
    customer: customerDoc,
    totalQuantity,
    totalAmount,
    lines: lines.map(toLineDto),
  });
});

// POST /api/revenue/export  { customer, from, to }  -> chot phieu doanh thu (luu snapshot tung dong xuat)
const exportSlip = asyncHandler(async (req, res) => {
  const { customer, from, to } = req.body;
  const range = dateRangeFromQuery({ from, to });
  if (!customer || !range) {
    return res.status(400).json({ message: "Thiếu khách hàng hoặc khoảng ngày không hợp lệ" });
  }

  const lines = await exportLines(range, customer);
  const dtos = lines.map(toLineDto);
  const totalQuantity = dtos.reduce((s, l) => s + l.quantity, 0);
  const totalAmount = dtos.reduce((s, l) => s + l.amount, 0);
  const orderCount = new Set(lines.map((l) => l.order.toString())).size;
  const periodFrom = new Date(range.from);
  const periodTo = new Date(range.to);

  const slip = await RevenueSlip.findOneAndUpdate(
    { customer, periodFrom, periodTo },
    {
      customer,
      periodFrom,
      periodTo,
      totalQuantity,
      totalAmount,
      orderCount,
      lines: dtos,
      issuedBy: req.auth.sub,
      issuedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate("customer", "code name");

  res.status(201).json(slip);
});

// GET /api/revenue/slips?customer=&from=YYYY-MM-DD&to=YYYY-MM-DD
const listSlips = asyncHandler(async (req, res) => {
  const { customer, from, to } = req.query;
  const filter = {};
  if (customer) filter.customer = customer;
  if (from) filter.periodFrom = new Date(from);
  if (to) filter.periodTo = new Date(to);
  const slips = await RevenueSlip.find(filter).populate("customer", "code name").sort({ issuedAt: -1 });
  res.json(slips);
});

function formatPeriodLabel(slip) {
  const from = new Date(slip.periodFrom).toLocaleDateString("vi-VN");
  const to = new Date(slip.periodTo).toLocaleDateString("vi-VN");
  return `${from} - ${to}`;
}

function periodFileSuffix(slip) {
  const from = new Date(slip.periodFrom).toISOString().slice(0, 10);
  const to = new Date(slip.periodTo).toISOString().slice(0, 10);
  return `${from}_${to}`;
}

// GET /api/revenue/slips/:id/export?format=pdf|xlsx
const exportFile = asyncHandler(async (req, res) => {
  const format = (req.query.format || "pdf").toLowerCase();
  if (!["pdf", "xlsx"].includes(format)) {
    return res.status(400).json({ message: "Định dạng không hợp lệ, dùng pdf hoặc xlsx" });
  }
  const slip = await RevenueSlip.findById(req.params.id).populate("customer", "code name");
  if (!slip) return res.status(404).json({ message: "Không tìm thấy phiếu doanh thu" });

  const customerName = slip.customer ? `${slip.customer.code} - ${slip.customer.name}` : "(khách hàng đã xoá)";
  const fileName = `doanh-thu-${slip.customer ? slip.customer.code : "khach"}-${periodFileSuffix(slip)}`;
  const lines = [...slip.lines].sort((a, b) => new Date(a.date) - new Date(b.date));

  const stageLabel = (l) =>
    (l.stages || []).map((s) => `${s.name} (${formatCurrency(s.unitPrice)})`).join(", ") || "—";

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Doanh thu");
    sheet.columns = [
      { key: "c1", width: 13 },
      { key: "c2", width: 14 },
      { key: "c3", width: 22 },
      { key: "c4", width: 34 },
      { key: "c5", width: 10 },
      { key: "c6", width: 13 },
      { key: "c7", width: 13 },
      { key: "c8", width: 13 },
      { key: "c9", width: 16 },
    ];

    sheet.addRow([`Doanh thu - ${customerName} - Kỳ ${formatPeriodLabel(slip)}`]);
    sheet.mergeCells("A1:I1");
    sheet.getRow(1).font = { bold: true, size: 13 };
    sheet.addRow([]);

    const headerRow = sheet.addRow([
      "Ngày xuất",
      "Phiếu xuất",
      "Mẫu hàng",
      "Công đoạn (đơn giá gia công)",
      "Số lượng",
      "Đơn giá bán",
      "Chi phí công đoạn/sp",
      "Lãi gộp/sp",
      "Thành tiền",
    ]);
    headerRow.font = { bold: true };

    lines.forEach((l) => {
      sheet.addRow([
        l.date ? new Date(l.date).toLocaleDateString("vi-VN") : "",
        l.orderCode || "",
        l.productName || "",
        stageLabel(l),
        l.quantity,
        l.unitPrice,
        l.stageCost || 0,
        (l.unitPrice || 0) - (l.stageCost || 0),
        l.amount,
      ]);
    });

    sheet.addRow([]);
    const totalRow = sheet.addRow(["", "", "", "TỔNG CỘNG", slip.totalQuantity, "", "", "", slip.totalAmount]);
    totalRow.font = { bold: true, size: 12 };

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}.xlsx"`);
    await workbook.xlsx.write(res);
    return res.end();
  }

  // PDF
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.registerFont("VN", FONT_REGULAR);
  doc.registerFont("VN-Bold", FONT_BOLD);
  doc.font("VN");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}.pdf"`);
  doc.pipe(res);

  doc.font("VN-Bold").fontSize(16).text("PHIẾU DOANH THU", { align: "center" });
  doc.moveDown(0.5);
  doc.font("VN").fontSize(11).text(`Khách hàng: ${customerName}`);
  doc.text(`Kỳ: ${formatPeriodLabel(slip)}`);
  doc.text(`Ngày xuất: ${new Date(slip.issuedAt).toLocaleDateString("vi-VN")}`);
  doc.moveDown();

  const startX = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  let y = doc.y;

  const ensureSpace = (needed) => {
    if (y > 780 - needed) {
      doc.addPage();
      y = 40;
    }
  };

  if (lines.length === 0) {
    doc.font("VN").fontSize(10).text("Không có phiếu xuất nào trong kỳ này.", startX, y);
    y = doc.y + 10;
  }

  lines.forEach((l) => {
    ensureSpace(48);
    const dateLabel = l.date ? new Date(l.date).toLocaleDateString("vi-VN") : "—";
    doc
      .font("VN-Bold")
      .fontSize(10)
      .text(`•  ${l.productName} — Phiếu ${l.orderCode || "—"} — ${dateLabel}`, startX + 10, y, {
        width: contentWidth - 10,
      });
    y = doc.y + 2;
    doc
      .font("VN")
      .fontSize(9.5)
      .text(
        `SL ${formatNumber(l.quantity)} × đơn giá bán ${formatCurrency(l.unitPrice)} = ${formatCurrency(l.amount)}`,
        startX + 22,
        y,
        { width: contentWidth - 22 }
      );
    y = doc.y + 2;
    doc
      .font("VN")
      .fontSize(9)
      .fillColor("#555555")
      .text(`Công đoạn: ${stageLabel(l)}`, startX + 22, y, { width: contentWidth - 22 });
    y = doc.y + 2;
    doc
      .font("VN")
      .fontSize(9)
      .text(
        `Chi phí công đoạn ${formatCurrency(l.stageCost || 0)}/sp · Lãi gộp ${formatCurrency(
          (l.unitPrice || 0) - (l.stageCost || 0)
        )}/sp`,
        startX + 22,
        y,
        { width: contentWidth - 22 }
      );
    doc.fillColor("black");
    y = doc.y + 8;
  });

  ensureSpace(60);
  y += 6;
  doc
    .moveTo(startX, y)
    .lineTo(startX + contentWidth, y)
    .strokeColor("#888888")
    .stroke();
  y += 12;

  doc.font("VN-Bold").fontSize(11).text(`Tổng số lượng: ${formatNumber(slip.totalQuantity)}`, startX, y);
  y += 18;
  doc.font("VN-Bold").fontSize(13).text(`Tổng doanh thu: ${formatCurrency(slip.totalAmount)}`, startX, y);

  doc.end();
});

module.exports = { summary, detail, exportSlip, listSlips, exportFile };
