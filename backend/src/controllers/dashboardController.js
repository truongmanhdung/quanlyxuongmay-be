const ProductionReport = require("../models/ProductionReport");
const Worker = require("../models/Worker");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");
const { periodRange, currentPeriod } = require("../utils/period");

// GET /api/dashboard/overview?period=YYYY-MM
const overview = asyncHandler(async (req, res) => {
  const period = req.query.period || currentPeriod();
  const range = periodRange(period);
  if (!range) return res.status(400).json({ message: "Kỳ không hợp lệ, dùng định dạng YYYY-MM" });

  // So ngay hien thi tren bieu do (mac dinh 7, cho phep client xin nhieu hon de xem bieu do day du hon)
  const trendDays = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 90);

  const [periodAgg, counts, sevenDayAgg, recent] = await Promise.all([
    ProductionReport.aggregate([
      { $match: { status: "confirmed", workDate: { $gte: range.start, $lt: range.end } } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalQuantity: { $sum: "$quantity" },
          batchCount: { $sum: 1 },
          workers: { $addToSet: "$worker" },
        },
      },
    ]),
    Promise.all([Worker.countDocuments({ active: true }), Customer.countDocuments({ active: true }), Product.countDocuments({ active: true })]),
    ProductionReport.aggregate([
      {
        $match: {
          status: "confirmed",
          workDate: { $gte: new Date(Date.now() - trendDays * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$workDate" } },
          totalQuantity: { $sum: "$quantity" },
          totalAmount: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    ProductionReport.find()
      .populate("worker", "code name")
      .populate("customer", "code name")
      .populate("product", "name")
      .populate("processStage", "name")
      .sort({ createdAt: -1 })
      .limit(10),
  ]);

  const agg = periodAgg[0] || { totalAmount: 0, totalQuantity: 0, batchCount: 0, workers: [] };
  const [totalWorkers, activeCustomers, activeProducts] = counts;

  res.json({
    period,
    totalAmount: agg.totalAmount,
    totalQuantity: agg.totalQuantity,
    batchCount: agg.batchCount,
    // tong so cong nhan con hoat dong tai xuong (co flag active=true)
    totalWorkerCount: totalWorkers,
    // cong nhan "dang hoat dong" = co gui bao cao san luong trong ky nay
    activeWorkerCount: agg.workers.length,
    activeCustomers,
    activeProducts,
    last7Days: sevenDayAgg.map((d) => ({ date: d._id, quantity: d.totalQuantity, amount: d.totalAmount })),
    recentSubmissions: recent,
  });
});

module.exports = { overview };
