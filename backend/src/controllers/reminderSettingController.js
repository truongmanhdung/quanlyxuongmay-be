const ReminderSetting = require("../models/ReminderSetting");
const asyncHandler = require("../utils/asyncHandler");

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
    if (!Array.isArray(times) || times.some((t) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t))) {
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

module.exports = { get, update, getSingleton };
