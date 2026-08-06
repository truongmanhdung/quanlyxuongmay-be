const path = require("node:path");
const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const ProductionReport = require("../models/ProductionReport");
const DefectReport = require("../models/DefectReport");
const Product = require("../models/Product");
const ProcessStage = require("../models/ProcessStage");
const PayrollSlip = require("../models/PayrollSlip");
const Worker = require("../models/Worker");
const asyncHandler = require("../utils/asyncHandler");
const { periodRange, currentPeriod } = require("../utils/period");
const { formatCurrency, formatNumber } = require("../utils/format");

// Be Vietnam Pro: font Unicode co day du dau tieng Viet, thay cho Helvetica chuan cua pdfkit
// (Helvetica khong co glyph dau, gay loi hien thi khi xuat PDF tieng Viet)
const FONT_REGULAR = path.join(__dirname, "../assets/fonts/BeVietnamPro-Regular.ttf");
const FONT_BOLD = path.join(__dirname, "../assets/fonts/BeVietnamPro-Bold.ttf");

// Uoc tinh lương bị ảnh hưởng bởi hàng lỗi/hoàn trả, gộp theo (worker, product, processStage)
// de dung don gia dung cua tung cong doan thay vi lay binh quan ca cong nhan.
// Chi mang tinh tham khao/hien thi - KHONG lam thay doi totalAmount chinh thuc dung de tra luong/xuat phieu.
async function defectAdjustmentByWorker(range) {
  const [declaredGroups, defectGroups] = await Promise.all([
    ProductionReport.aggregate([
      { $match: { status: "confirmed", workDate: { $gte: range.start, $lt: range.end } } },
      {
        $group: {
          _id: { worker: "$worker", product: "$product", processStage: "$processStage" },
          quantity: { $sum: "$quantity" },
          amount: { $sum: "$amount" },
        },
      },
    ]),
    DefectReport.aggregate([
      {
        $match: {
          worker: { $ne: null },
          processStage: { $ne: null },
          reportedAt: { $gte: range.start, $lt: range.end },
        },
      },
      {
        $group: {
          _id: { worker: "$worker", product: "$product", processStage: "$processStage" },
          quantity: { $sum: "$quantity" },
        },
      },
    ]),
  ]);

  const defectMap = new Map(
    defectGroups.map((d) => [`${d._id.worker}:${d._id.product}:${d._id.processStage}`, d.quantity])
  );

  const perWorker = new Map(); // workerId -> { defectQuantity, estimatedDefectAmount }
  declaredGroups.forEach((g) => {
    const key = `${g._id.worker}:${g._id.product}:${g._id.processStage}`;
    const defectQty = defectMap.get(key) || 0;
    if (defectQty <= 0) return;
    const cappedDefectQty = Math.min(defectQty, g.quantity);
    const avgUnitPrice = g.quantity > 0 ? g.amount / g.quantity : 0;
    const workerId = g._id.worker.toString();
    const acc = perWorker.get(workerId) || { defectQuantity: 0, estimatedDefectAmount: 0 };
    acc.defectQuantity += defectQty; // so lieu tho, hien thi de doi chieu
    acc.estimatedDefectAmount += cappedDefectQty * avgUnitPrice; // dung de tru uoc tinh, khong vuot qua da ke khai
    perWorker.set(workerId, acc);
  });
  return perWorker;
}

// GET /api/payroll/summary?period=YYYY-MM  -> bang luong tat ca cong nhan trong ky (tinh dong)
const summary = asyncHandler(async (req, res) => {
  const period = req.query.period || currentPeriod();
  const range = periodRange(period);
  if (!range) return res.status(400).json({ message: "Kỳ lương không hợp lệ, dùng định dạng YYYY-MM" });

  const [rows, defectByWorker] = await Promise.all([
    ProductionReport.aggregate([
      { $match: { status: "confirmed", workDate: { $gte: range.start, $lt: range.end } } },
      {
        $group: {
          _id: "$worker",
          totalQuantity: { $sum: "$quantity" },
          totalAmount: { $sum: "$amount" },
          reportCount: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]),
    defectAdjustmentByWorker(range),
  ]);

  const workerIds = rows.map((r) => r._id);
  const workers = await Worker.find({ _id: { $in: workerIds } });
  const workerMap = new Map(workers.map((w) => [w._id.toString(), w]));

  res.json({
    period,
    rows: rows.map((r) => {
      const adj = defectByWorker.get(r._id.toString()) || { defectQuantity: 0, estimatedDefectAmount: 0 };
      return {
        worker: workerMap.get(r._id.toString()) || null,
        totalQuantity: r.totalQuantity,
        totalAmount: r.totalAmount,
        reportCount: r.reportCount,
        defectQuantity: adj.defectQuantity,
        estimatedNetAmount: Math.round(r.totalAmount - adj.estimatedDefectAmount),
      };
    }),
  });
});

// GET /api/payroll?period=YYYY-MM  (worker: chinh minh | admin: query ?worker=)
const detail = asyncHandler(async (req, res) => {
  const period = req.query.period || currentPeriod();
  const range = periodRange(period);
  if (!range) return res.status(400).json({ message: "Kỳ lương không hợp lệ, dùng định dạng YYYY-MM" });

  const workerId = req.auth.role === "worker" ? req.auth.sub : req.query.worker;
  if (!workerId) return res.status(400).json({ message: "Thiếu công nhân cần tính lương" });

  const reports = await ProductionReport.find({
    worker: workerId,
    status: "confirmed",
    workDate: { $gte: range.start, $lt: range.end },
  })
    .populate("worker", "name code")
    .populate("customer", "name code")
    .populate("product", "name")
    .populate("processStage", "name")
    .sort({ workDate: -1 });

  const totalQuantity = reports.reduce((sum, r) => sum + r.quantity, 0);
  const totalAmount = reports.reduce((sum, r) => sum + r.amount, 0);

  res.json({ period, worker: workerId, totalQuantity, totalAmount, reports });
});

// GET /api/payroll/defect-comparison?worker=&period=YYYY-MM  (admin)
// So sanh luong ke khai vs luong uoc tinh sau khi tru hang loi/hoan tra, theo tung mau hang + cong doan
// cua 1 cong nhan. Chi de xem doi chieu, khong lam thay doi so lieu tra luong chinh thuc.
const defectComparison = asyncHandler(async (req, res) => {
  const period = req.query.period || currentPeriod();
  const range = periodRange(period);
  const { worker } = req.query;
  if (!worker) return res.status(400).json({ message: "Thiếu công nhân" });
  if (!range) return res.status(400).json({ message: "Kỳ lương không hợp lệ, dùng định dạng YYYY-MM" });

  const workerObjectId = new mongoose.Types.ObjectId(String(worker));

  const [declaredGroups, defectGroups] = await Promise.all([
    ProductionReport.aggregate([
      { $match: { worker: workerObjectId, status: "confirmed", workDate: { $gte: range.start, $lt: range.end } } },
      {
        $group: {
          _id: { product: "$product", processStage: "$processStage" },
          declaredQuantity: { $sum: "$quantity" },
          declaredAmount: { $sum: "$amount" },
        },
      },
    ]),
    DefectReport.aggregate([
      {
        $match: {
          worker: workerObjectId,
          processStage: { $ne: null },
          reportedAt: { $gte: range.start, $lt: range.end },
        },
      },
      {
        $group: {
          _id: { product: "$product", processStage: "$processStage" },
          defectQuantity: { $sum: "$quantity" },
        },
      },
    ]),
  ]);

  const defectMap = new Map(defectGroups.map((d) => [`${d._id.product}:${d._id.processStage}`, d.defectQuantity]));

  const merged = declaredGroups.map((g) => {
    const defectQuantity = defectMap.get(`${g._id.product}:${g._id.processStage}`) || 0;
    const cappedDefectQty = Math.min(defectQuantity, g.declaredQuantity);
    const avgUnitPrice = g.declaredQuantity > 0 ? g.declaredAmount / g.declaredQuantity : 0;
    const estimatedDefectAmount = Math.round(cappedDefectQty * avgUnitPrice);
    return {
      product: g._id.product,
      processStage: g._id.processStage,
      declaredQuantity: g.declaredQuantity,
      declaredAmount: g.declaredAmount,
      defectQuantity,
      estimatedDefectAmount,
      netQuantity: g.declaredQuantity - cappedDefectQty,
      netAmount: g.declaredAmount - estimatedDefectAmount,
    };
  });

  const productIds = [...new Set(merged.map((r) => r.product.toString()))];
  const stageIds = [...new Set(merged.map((r) => r.processStage.toString()))];
  const [products, stages] = await Promise.all([
    Product.find({ _id: { $in: productIds } }),
    ProcessStage.find({ _id: { $in: stageIds } }),
  ]);
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));
  const stageMap = new Map(stages.map((s) => [s._id.toString(), s]));

  const rows = merged
    .map((r) => ({
      product: productMap.get(r.product.toString()) || null,
      processStage: stageMap.get(r.processStage.toString()) || null,
      declaredQuantity: r.declaredQuantity,
      declaredAmount: r.declaredAmount,
      defectQuantity: r.defectQuantity,
      estimatedDefectAmount: r.estimatedDefectAmount,
      netQuantity: r.netQuantity,
      netAmount: r.netAmount,
    }))
    .sort((a, b) => b.defectQuantity - a.defectQuantity);

  const totals = rows.reduce(
    (acc, r) => {
      acc.declaredAmount += r.declaredAmount;
      acc.estimatedDefectAmount += r.estimatedDefectAmount;
      acc.netAmount += r.netAmount;
      return acc;
    },
    { declaredAmount: 0, estimatedDefectAmount: 0, netAmount: 0 }
  );

  res.json({ period, worker, rows, totals });
});

// POST /api/payroll/export  (admin) { worker, period } -> chot phieu luong
const exportSlip = asyncHandler(async (req, res) => {
  const { worker, period } = req.body;
  const range = periodRange(period);
  if (!worker || !range) {
    return res.status(400).json({ message: "Thiếu công nhân hoặc kỳ lương không hợp lệ" });
  }

  const reports = await ProductionReport.find({
    worker,
    status: "confirmed",
    workDate: { $gte: range.start, $lt: range.end },
  });

  const totalQuantity = reports.reduce((sum, r) => sum + r.quantity, 0);
  const totalAmount = reports.reduce((sum, r) => sum + r.amount, 0);

  const slip = await PayrollSlip.findOneAndUpdate(
    { worker, period },
    {
      worker,
      period,
      totalQuantity,
      totalAmount,
      reportCount: reports.length,
      reports: reports.map((r) => r._id),
      issuedBy: req.auth.sub,
      issuedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json(slip);
});

// GET /api/payroll/slips?worker=&period=  (admin)
const listSlips = asyncHandler(async (req, res) => {
  const { worker, period } = req.query;
  const filter = {};
  if (worker) filter.worker = worker;
  if (period) filter.period = period;
  const slips = await PayrollSlip.find(filter).populate("worker", "code name").sort({ issuedAt: -1 });
  res.json(slips);
});

// Gom cac bao cao trong phieu luong theo tung ngay lam viec, moi ngay tinh cong rieng
// vd: 27/07 vat so ao 500*300d=150.000d ; 28/07 lam co 200*400d=80.000d -> tong ket
function groupReportsByDay(reports) {
  const sorted = [...reports].sort(
    (a, b) => new Date(a.workDate) - new Date(b.workDate) || new Date(a.createdAt) - new Date(b.createdAt)
  );
  const groups = [];
  const byKey = new Map();
  sorted.forEach((r) => {
    const key = new Date(r.workDate).toISOString().slice(0, 10);
    let group = byKey.get(key);
    if (!group) {
      group = { date: r.workDate, reports: [], subtotalQuantity: 0, subtotalAmount: 0 };
      byKey.set(key, group);
      groups.push(group);
    }
    group.reports.push(r);
    group.subtotalQuantity += r.quantity;
    group.subtotalAmount += r.amount;
  });
  return groups;
}

async function loadSlipForFile(id) {
  const slip = await PayrollSlip.findById(id)
    .populate("worker", "code name")
    .populate({
      path: "reports",
      populate: [
        { path: "product", select: "name" },
        { path: "processStage", select: "name" },
      ],
    });
  return slip;
}

// GET /api/payroll/slips/:id/export?format=pdf|xlsx  (admin)
const exportFile = asyncHandler(async (req, res) => {
  const format = (req.query.format || "pdf").toLowerCase();
  if (!["pdf", "xlsx"].includes(format)) {
    return res.status(400).json({ message: "Định dạng không hợp lệ, dùng pdf hoặc xlsx" });
  }
  const slip = await loadSlipForFile(req.params.id);
  if (!slip) return res.status(404).json({ message: "Không tìm thấy phiếu lương" });

  const fileName = `phieu-luong-${slip.worker.code}-${slip.period}`;

  const dayGroups = groupReportsByDay(slip.reports);

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Phiếu lương");
    sheet.columns = [
      { key: "col1", width: 24 },
      { key: "col2", width: 22 },
      { key: "col3", width: 12 },
      { key: "col4", width: 12 },
      { key: "col5", width: 14 },
      { key: "col6", width: 16 },
    ];

    sheet.addRow([`Phiếu lương - ${slip.worker.code} - ${slip.worker.name} - Kỳ ${slip.period}`]);
    sheet.mergeCells("A1:F1");
    sheet.getRow(1).font = { bold: true, size: 13 };
    sheet.addRow([]);

    dayGroups.forEach((group) => {
      const dayHeaderRow = sheet.addRow([`Ngày ${new Date(group.date).toLocaleDateString("vi-VN")}`]);
      dayHeaderRow.font = { bold: true };
      dayHeaderRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE9EBF3" } };
      });
      sheet.mergeCells(`A${dayHeaderRow.number}:F${dayHeaderRow.number}`);

      const headerRow = sheet.addRow(["Công đoạn", "Mẫu hàng", "Số lô", "Số lượng", "Đơn giá", "Thành tiền"]);
      headerRow.font = { bold: true, italic: true, size: 10 };

      group.reports.forEach((r) => {
        sheet.addRow([
          r.processStage ? r.processStage.name : "",
          r.product ? r.product.name : "",
          r.batchNumber || "",
          r.quantity,
          r.unitPrice,
          r.amount,
        ]);
      });

      const subtotalRow = sheet.addRow(["", "", "", "", "Cộng ngày", group.subtotalAmount]);
      subtotalRow.font = { bold: true };
      sheet.addRow([]);
    });

    sheet.addRow([]);
    const totalRow = sheet.addRow(["", "", "", "TỔNG KẾT", slip.totalQuantity, slip.totalAmount]);
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

  doc.font("VN-Bold").fontSize(16).text("PHIẾU LƯƠNG", { align: "center" });
  doc.moveDown(0.5);
  doc.font("VN").fontSize(11).text(`Công nhân: ${slip.worker.code} - ${slip.worker.name}`);
  doc.text(`Kỳ lương: ${slip.period}`);
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

  dayGroups.forEach((group) => {
    ensureSpace(20);
    doc.font("VN-Bold").fontSize(11).text(`Ngày ${new Date(group.date).toLocaleDateString("vi-VN")}`, startX, y);
    y += 18;

    group.reports.forEach((r) => {
      ensureSpace(15);
      const label = `${r.processStage ? r.processStage.name : "—"} — ${r.product ? r.product.name : "—"}${
        r.batchNumber ? ` (Lô ${r.batchNumber})` : ""
      }`;
      const calc = `SL ${formatNumber(r.quantity)} × ${formatCurrency(r.unitPrice)} = ${formatCurrency(r.amount)}`;
      doc.font("VN").fontSize(9.5).text(`•  ${label}`, startX + 10, y, { width: contentWidth - 10 });
      y = doc.y + 2;
      doc.font("VN").fontSize(9.5).text(calc, startX + 22, y, { width: contentWidth - 22 });
      y = doc.y + 6;
    });

    ensureSpace(16);
    doc
      .font("VN-Bold")
      .fontSize(9.5)
      .text(`Cộng ngày: ${formatCurrency(group.subtotalAmount)}`, startX, y, { width: contentWidth, align: "right" });
    y += 20;
  });

  ensureSpace(60);
  y += 6;
  doc
    .moveTo(startX, y)
    .lineTo(startX + contentWidth, y)
    .strokeColor("#888888")
    .stroke();
  y += 12;

  doc.font("VN-Bold").fontSize(13).text("TỔNG KẾT", startX, y);
  y += 20;
  doc.font("VN-Bold").fontSize(11).text(`Tổng số lượng: ${formatNumber(slip.totalQuantity)}`, startX, y);
  y += 18;
  doc.font("VN-Bold").fontSize(13).text(`Tổng lương: ${formatCurrency(slip.totalAmount)}`, startX, y);

  doc.end();
});

module.exports = { summary, detail, defectComparison, exportSlip, listSlips, exportFile };
