const ReminderSetting = require("../models/ReminderSetting");
const WorkerReminderSetting = require("../models/WorkerReminderSetting");
const asyncHandler = require("../utils/asyncHandler");

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

async function getSingleton() {
  let setting = await ReminderSetting.findOne();
  if (!setting) setting = await ReminderSetting.create({});
  return setting;
}

// GET /api/settings/reminder (admin)
const get = asyncHandler(async (req, res) => {
  const setting = await getSingleton();
  res.json(setting);
});

// PUT /api/settings/reminder (admin) { enabled, times, message }
const update = asyncHandler(async (req, res) => {
  const { enabled, times, message } = req.body;
  if (times !== undefined) {
    if (!Array.isArray(times) || times.some((t) => !TIME_RE.test(t))) {
      return res.status(400).json({ message: "Danh sách giờ nhắc không hợp lệ, dùng định dạng HH:mm" });
    }
  }
  const setting = await getSingleton();
  if (enabled !== undefined) setting.enabled = enabled;
  if (times !== undefined) setting.times = times;
  if (message !== undefined) setting.message = message;
  setting.updatedBy = req.auth.sub;
  await setting.save();
  res.json(setting);
});

// GET /api/settings/reminder/workers (admin) - danh sach cau hinh nhac rieng da co
const listWorkerOverrides = asyncHandler(async (req, res) => {
  const overrides = await WorkerReminderSetting.find().populate("worker", "code name active");
  res.json(overrides);
});

// PUT /api/settings/reminder/workers/:workerId (admin) { enabled, times, message } - tao/cap nhat
const upsertWorkerOverride = asyncHandler(async (req, res) => {
  const { enabled, times, message } = req.body;
  if (times !== undefined) {
    if (!Array.isArray(times) || times.length === 0 || times.some((t) => !TIME_RE.test(t))) {
      return res.status(400).json({ message: "Danh sách giờ nhắc không hợp lệ, dùng định dạng HH:mm" });
    }
  }
  const update = { updatedBy: req.auth.sub };
  if (enabled !== undefined) update.enabled = enabled;
  if (times !== undefined) update.times = times;
  if (message !== undefined) update.message = message;

  const override = await WorkerReminderSetting.findOneAndUpdate(
    { worker: req.params.workerId },
    { $set: update, $setOnInsert: { worker: req.params.workerId } },
    { new: true, upsert: true, runValidators: true }
  ).populate("worker", "code name active");
  res.json(override);
});

// DELETE /api/settings/reminder/workers/:workerId (admin) - xoa cau hinh rieng, quay ve dung cau hinh chung
const removeWorkerOverride = asyncHandler(async (req, res) => {
  await WorkerReminderSetting.findOneAndDelete({ worker: req.params.workerId });
  res.status(204).send();
});

module.exports = { get, update, getSingleton, listWorkerOverrides, upsertWorkerOverride, removeWorkerOverride };
