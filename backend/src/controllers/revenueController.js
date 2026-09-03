const path = require("node:path");
const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const Batch = require("../models/Batch");
const ProductionReport = require("../models/ProductionReport");
const Customer = require("../models/Customer");
const RevenueSlip = require("../models/RevenueSlip");
const asyncHandler = require("../utils/asyncHandler");
const { dateRangeFromQuery } = require("../utils/period");
const { formatCurrency, formatNumber } = require("../utils/format");

// Be Vietnam Pro: font Unicode co day du dau tieng Viet (Helvetica chuan cua pdfkit khong co glyph dau)
const FONT_REGULAR = path.join(__dirname, "../assets/fonts/BeVietnamPro-Regular.ttf");
const FONT_BOLD = path.join(__dirname, "../assets/fonts/BeVietnamPro-Bold.ttf");

const POPULATE = [
  { path: "product", select: "name unit standardPrice" },
  { path: "customer", select: "code name" },
];

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// So luong tinh doanh thu cua 1 lo = tong ProductionReport da duyet (confirmed) khop
// khach + mau hang + so lo. Dung status confirmed cho khop voi so lieu tinh luong.
async function reportedConfirmedQuantity(batch) {
  if (!batch.customer || !batch.product) return 0;
  const rows = await ProductionReport.aggregate([
    {
      $match: {
        customer: batch.customer._id || batch.customer,
        product: batch.product._id || batch.product,
        batchNumber: new RegExp(`^${escapeRegex(batch.code)}$`, "i"),
        status: "confirmed",
      },
    },
    { $group: { _id: null, total: { $sum: "$quantity" } } },
  ]);
  return rows[0]?.total || 0;
}

// Danh sach dong lo hoan thanh trong ky (theo completedAt), kem SL da bao cao, don gia chuan, thanh tien.
async function completedBatchLines(range, customerId) {
  const filter = {
    status: "hoan_thanh",
    active: { $ne: false },
    completedAt: { $gte: range.start, $lt: range.end },
  };
  if (customerId) filter.customer = new mongoose.Types.ObjectId(String(customerId));

  const batches = await Batch.find(filter).populate(POPULATE).sort({ completedAt: 1 });

  return Promise.all(
    batches.map(async (b) => {
      const quantity = await reportedConfirmedQuantity(b);
      const unitPrice = b.product?.standardPrice || 0;
      return {
        batch: b._id,
        code: b.code,
        customer: b.customer, // populated { _id, code, name } hoac null
        productName: b.product?.name || "(mẫu hàng đã xoá)",
        completedAt: b.completedAt,
        quantity,
        unitPrice,
        amount: Math.round(quantity * unitPrice),
      };
    })
  );
}

function toLineDto(l) {
  return {
    batch: l.batch,
    code: l.code,
    productName: l.productName,
    completedAt: l.completedAt,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    amount: l.amount,
  };
}

// GET /api/revenue/summary?from=YYYY-MM-DD&to=YYYY-MM-DD  -> doanh thu tat ca khach hang trong ky (tinh dong)
const summary = asyncHandler(async (req, res) => {
  const range = dateRangeFromQuery(req.query);
  if (!range) return res.status(400).json({ message: "Khoảng ngày không hợp lệ" });

  const lines = await completedBatchLines(range);

  const byCustomer = new Map();
  for (const line of lines) {
    if (!line.customer) continue;
    const key = line.customer._id.toString();
    const acc = byCustomer.get(key) || {
      customer: line.customer,
      batchCount: 0,
      totalQuantity: 0,
      totalAmount: 0,
    };
    acc.batchCount += 1;
    acc.totalQuantity += line.quantity;
    acc.totalAmount += line.amount;
    byCustomer.set(key, acc);
  }

  const rows = [...byCustomer.values()].sort((a, b) => b.totalAmount - a.totalAmount);

  res.json({ from: range.from, to: range.to, rows });
});

// GET /api/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD&customer=  -> chi tiet lo hoan thanh cua 1 khach hang
const detail = asyncHandler(async (req, res) => {
  const range = dateRangeFromQuery(req.query);
  if (!range) return res.status(400).json({ message: "Khoảng ngày không hợp lệ" });
  const { customer } = req.query;
  if (!customer) return res.status(400).json({ message: "Thiếu khách hàng" });

  const [lines, customerDoc] = await Promise.all([
    completedBatchLines(range, customer),
    Customer.findById(customer).select("code name"),
  ]);

  const totalQuantity = lines.reduce((s, l) => s + l.quantity, 0);
  const totalAmount = lines.reduce((s, l) => s + l.amount, 0);

  res.json({
    from: range.from,
    to: range.to,
    customer: customerDoc,
    totalQuantity,
    totalAmount,
    lines: lines.map(toLineDto),
  });
});

// POST /api/revenue/export  { customer, from, to }  -> chot phieu doanh thu (luu snapshot tung dong lo)
const exportSlip = asyncHandler(async (req, res) => {
  const { customer, from, to } = req.body;
  const range = dateRangeFromQuery({ from, to });
  if (!customer || !range) {
    return res.status(400).json({ message: "Thiếu khách hàng hoặc khoảng ngày không hợp lệ" });
  }

  const lines = await completedBatchLines(range, customer);
  const totalQuantity = lines.reduce((s, l) => s + l.quantity, 0);
  const totalAmount = lines.reduce((s, l) => s + l.amount, 0);
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
      batchCount: lines.length,
      lines: lines.map(toLineDto),
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
  const lines = [...slip.lines].sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Doanh thu");
    sheet.columns = [
      { key: "c1", width: 30 },
      { key: "c2", width: 16 },
      { key: "c3", width: 14 },
      { key: "c4", width: 14 },
      { key: "c5", width: 18 },
    ];

    sheet.addRow([`Doanh thu - ${customerName} - Kỳ ${formatPeriodLabel(slip)}`]);
    sheet.mergeCells("A1:E1");
    sheet.getRow(1).font = { bold: true, size: 13 };
    sheet.addRow([]);

    const headerRow = sheet.addRow(["Lô hàng", "Ngày hoàn thành", "Số lượng", "Đơn giá", "Thành tiền"]);
    headerRow.font = { bold: true };

    lines.forEach((l) => {
      sheet.addRow([
        `${l.productName} (Lô ${l.code})`,
        l.completedAt ? new Date(l.completedAt).toLocaleDateString("vi-VN") : "",
        l.quantity,
        l.unitPrice,
        l.amount,
      ]);
    });

    sheet.addRow([]);
    const totalRow = sheet.addRow(["TỔNG CỘNG", "", slip.totalQuantity, "", slip.totalAmount]);
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
    doc.font("VN").fontSize(10).text("Không có lô hàng hoàn thành nào trong kỳ này.", startX, y);
    y = doc.y + 10;
  }

  lines.forEach((l) => {
    ensureSpace(28);
    const dateLabel = l.completedAt ? new Date(l.completedAt).toLocaleDateString("vi-VN") : "—";
    doc
      .font("VN")
      .fontSize(10)
      .text(`•  ${l.productName} (Lô ${l.code}) — ${dateLabel}`, startX + 10, y, { width: contentWidth - 10 });
    y = doc.y + 2;
    doc
      .font("VN")
      .fontSize(9.5)
      .text(
        `SL ${formatNumber(l.quantity)} × ${formatCurrency(l.unitPrice)} = ${formatCurrency(l.amount)}`,
        startX + 22,
        y,
        { width: contentWidth - 22 }
      );
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
