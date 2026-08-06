const Attendance = require("../models/Attendance");
const Worker = require("../models/Worker");
const asyncHandler = require("../utils/asyncHandler");
const { periodRange, currentPeriod } = require("../utils/period");
const { emitToAdmins } = require("../realtime/socket");

const POPULATE_WORKER = { path: "worker", select: "code name" };

// Chuan hoa ve 00:00 UTC - phai dung UTC (khong dung gio dia phuong server) de nhat quan voi
// periodRange()/currentPeriod() (utils/period.js) cung tinh theo UTC, neu khong ban ghi "hom nay"
// se bi lech ra ngoai ky hien tai o cac server co timezone khac UTC (vd Asia/Saigon, UTC+7).
function startOfDay(input) {
  if (!input) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  const [y, m, d] = String(input).split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

// POST /api/attendance/check-in (worker)
const checkIn = asyncHandler(async (req, res) => {
  const date = startOfDay();
  let record = await Attendance.findOne({ worker: req.auth.sub, date });
  if (record && record.checkInAt) {
    return res.status(409).json({
      message: `Bạn đã chấm công vào lúc ${record.checkInAt.toLocaleTimeString("vi-VN")} hôm nay`,
    });
  }
  if (!record) {
    record = await Attendance.create({ worker: req.auth.sub, date, checkInAt: new Date() });
  } else {
    record.checkInAt = new Date();
    await record.save();
  }
  await record.populate(POPULATE_WORKER);
  emitToAdmins("attendance:new", record);
  res.status(201).json(record);
});

// POST /api/attendance/check-out (worker)
const checkOut = asyncHandler(async (req, res) => {
  const date = startOfDay();
  const record = await Attendance.findOne({ worker: req.auth.sub, date });
  if (!record || !record.checkInAt) {
    return res.status(400).json({ message: "Bạn chưa chấm công vào hôm nay" });
  }
  if (record.checkOutAt) {
    return res.status(409).json({
      message: `Bạn đã chấm công ra lúc ${record.checkOutAt.toLocaleTimeString("vi-VN")} hôm nay`,
    });
  }
  record.checkOutAt = new Date();
  await record.save();
  await record.populate(POPULATE_WORKER);
  emitToAdmins("attendance:updated", record);
  res.json(record);
});

// GET /api/attendance/today (worker)
const today = asyncHandler(async (req, res) => {
  const record = await Attendance.findOne({ worker: req.auth.sub, date: startOfDay() }).populate(POPULATE_WORKER);
  res.json(record || null);
});

// GET /api/attendance/mine?period=YYYY-MM (worker) - lich su cham cong cua chinh minh
const mine = asyncHandler(async (req, res) => {
  const period = req.query.period || currentPeriod();
  const range = periodRange(period);
  if (!range) return res.status(400).json({ message: "Kỳ không hợp lệ, dùng định dạng YYYY-MM" });

  const records = await Attendance.find({
    worker: req.auth.sub,
    date: { $gte: range.start, $lt: range.end },
  }).sort({ date: -1 });
  res.json(records);
});

// GET /api/attendance/day?date=YYYY-MM-DD (admin) - diem danh toan bo cong nhan active trong 1 ngay
const day = asyncHandler(async (req, res) => {
  const date = startOfDay(req.query.date);
  const [workers, records] = await Promise.all([
    Worker.find({ active: true }).sort({ code: 1 }),
    Attendance.find({ date }),
  ]);
  const recordMap = new Map(records.map((r) => [r.worker.toString(), r]));
  const rows = workers.map((w) => ({ worker: w, attendance: recordMap.get(w._id.toString()) || null }));
  res.json({ date, rows });
});

// GET /api/attendance/summary?period=YYYY-MM (admin) - so ngay cong (co check-in) tung cong nhan trong ky
const summary = asyncHandler(async (req, res) => {
  const period = req.query.period || currentPeriod();
  const range = periodRange(period);
  if (!range) return res.status(400).json({ message: "Kỳ không hợp lệ, dùng định dạng YYYY-MM" });

  const [counts, workers] = await Promise.all([
    Attendance.aggregate([
      { $match: { checkInAt: { $ne: null }, date: { $gte: range.start, $lt: range.end } } },
      { $group: { _id: "$worker", daysPresent: { $sum: 1 } } },
    ]),
    Worker.find({ active: true }).sort({ code: 1 }),
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.daysPresent]));
  const rows = workers.map((w) => ({ worker: w, daysPresent: countMap.get(w._id.toString()) || 0 }));
  res.json({ period, rows });
});

// GET /api/attendance?worker=&period=YYYY-MM (admin) - chi tiet tung ngay cua 1 cong nhan trong ky
const list = asyncHandler(async (req, res) => {
  const { worker } = req.query;
  const period = req.query.period || currentPeriod();
  const range = periodRange(period);
  if (!worker) return res.status(400).json({ message: "Thiếu công nhân" });
  if (!range) return res.status(400).json({ message: "Kỳ không hợp lệ, dùng định dạng YYYY-MM" });

  const records = await Attendance.find({ worker, date: { $gte: range.start, $lt: range.end } }).sort({ date: -1 });
  res.json(records);
});

module.exports = { checkIn, checkOut, today, mine, day, summary, list };
