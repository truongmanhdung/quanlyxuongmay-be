const cron = require("node-cron");
const ReminderSetting = require("../models/ReminderSetting");
const WorkerReminderSetting = require("../models/WorkerReminderSetting");
const Notification = require("../models/Notification");
const { sendPushToWorker } = require("../utils/push");
const { workersMissingToday } = require("../controllers/notificationController");

let lastRunKey = null;

function currentHHmm() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

async function tick() {
  const hhmm = currentHHmm();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const runKey = `${today} ${hhmm}`;
  if (runKey === lastRunKey) return; // da chay roi trong dung phut nay
  lastRunKey = runKey;

  const [setting, overrides] = await Promise.all([ReminderSetting.findOne(), WorkerReminderSetting.find()]);
  const overrideByWorkerId = new Map(overrides.map((o) => [o.worker.toString(), o]));

  // cong nhan co gio nhac rieng khop phut nay
  const overrideTargetIds = overrides
    .filter((o) => o.enabled && o.times.includes(hhmm))
    .map((o) => o.worker.toString());

  // cong nhan dung cau hinh chung (khong co override) va gio chung khop phut nay
  const globalActive = Boolean(setting && setting.enabled && setting.times && setting.times.includes(hhmm));

  if (overrideTargetIds.length === 0 && !globalActive) return;

  const missingWorkerIds = globalActive
    ? undefined // can toan bo cong nhan dang thieu bao cao de loc ca nhom dung cau hinh chung
    : overrideTargetIds;
  const missing = await workersMissingToday(missingWorkerIds);
  const missingSet = new Set(missing.map((w) => w._id.toString()));

  const targets = missing.filter((w) => {
    const wid = w._id.toString();
    if (overrideByWorkerId.has(wid)) return overrideTargetIds.includes(wid);
    return globalActive;
  });

  console.log(`[reminder] ${runKey}: nhac ${targets.length} cong nhan chua gui san luong hom nay`);

  await Promise.all(
    targets.map(async (worker) => {
      const override = overrideByWorkerId.get(worker._id.toString());
      const body = override?.message || setting?.message || "Đừng quên gửi sản lượng hôm nay nhé!";
      await Notification.create({
        worker: worker._id,
        title: "Nhắc gửi sản lượng",
        body,
        type: "reminder",
      });
      await sendPushToWorker(worker, { title: "Nhắc gửi sản lượng", body });
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
