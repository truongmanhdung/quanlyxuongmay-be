const cron = require("node-cron");
const ReminderSetting = require("../models/ReminderSetting");
const Notification = require("../models/Notification");
const { sendPushToWorker } = require("../utils/push");
const { workersMissingToday } = require("../controllers/notificationController");

let lastRunKey = null;

function currentHHmm() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

async function tick() {
  const setting = await ReminderSetting.findOne();
  if (!setting || !setting.enabled || !setting.times || setting.times.length === 0) return;

  const hhmm = currentHHmm();
  if (!setting.times.includes(hhmm)) return;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const runKey = `${today} ${hhmm}`;
  if (runKey === lastRunKey) return; // da chay roi trong dung phut nay
  lastRunKey = runKey;

  const targets = await workersMissingToday();
  console.log(`[reminder] ${runKey}: nhac ${targets.length} cong nhan chua gui san luong hom nay`);

  await Promise.all(
    targets.map(async (worker) => {
      await Notification.create({
        worker: worker._id,
        title: "Nhắc gửi sản lượng",
        body: setting.message,
        type: "reminder",
      });
      await sendPushToWorker(worker, { title: "Nhắc gửi sản lượng", body: setting.message });
    })
  );
}

function start() {
  cron.schedule("* * * * *", () => {
    tick().catch((err) => console.error("[reminder] loi khi chay job nhac:", err));
  });
  console.log("[reminder] scheduler da khoi dong (kiem tra moi phut)");
}

module.exports = { start };
