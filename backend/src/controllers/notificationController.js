const Notification = require("../models/Notification");
const Worker = require("../models/Worker");
const ProductionReport = require("../models/ProductionReport");
const asyncHandler = require("../utils/asyncHandler");
const { sendPushToWorker } = require("../utils/push");
const { emitToWorker } = require("../realtime/socket");

// GET /api/notifications/mine (worker)
const mine = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ worker: req.auth.sub }).sort({ createdAt: -1 }).limit(50);
  res.json(notifications);
});

// PATCH /api/notifications/:id/read (worker)
const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, worker: req.auth.sub },
    { $set: { read: true } },
    { new: true }
  );
  if (!notification) return res.status(404).json({ message: "Không tìm thấy thông báo" });
  res.json(notification);
});

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// tra ve danh sach cong nhan active chua co ProductionReport nao hom nay
async function workersMissingToday(workerIds) {
  const filter = { active: true };
  if (Array.isArray(workerIds) && workerIds.length > 0) filter._id = { $in: workerIds };
  const workers = await Worker.find(filter);
  const submitted = await ProductionReport.distinct("worker", { workDate: { $gte: startOfToday() } });
  const submittedSet = new Set(submitted.map((id) => id.toString()));
  return workers.filter((w) => !submittedSet.has(w._id.toString()));
}

// POST /api/notifications/remind (admin) { workerIds?, title?, body? }
const remind = asyncHandler(async (req, res) => {
  const { workerIds, title, body } = req.body || {};
  const targets = await workersMissingToday(workerIds);

  const finalTitle = title || "Nhắc gửi sản lượng";
  const finalBody = body || "Bạn chưa gửi sản lượng hôm nay, gửi ngay để quản lý ghi nhận nhé!";

  const created = await Promise.all(
    targets.map(async (worker) => {
      const notification = await Notification.create({
        worker: worker._id,
        title: finalTitle,
        body: finalBody,
        type: "manual",
        sentBy: req.auth.sub,
      });
      await sendPushToWorker(worker, { title: finalTitle, body: finalBody });
      emitToWorker(worker._id.toString(), "notification:new", notification);
      return notification;
    })
  );

  res.status(201).json({ remindedCount: created.length, notifications: created });
});

module.exports = { mine, markRead, remind, workersMissingToday, startOfToday };
