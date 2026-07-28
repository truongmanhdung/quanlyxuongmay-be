// Chuyen "YYYY-MM" thanh khoang thoi gian [start, end) cua thang do
function periodRange(period) {
  const match = /^(\d{4})-(\d{2})$/.exec(period || "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]); // 1-12
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

function currentPeriod() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

module.exports = { periodRange, currentPeriod };
