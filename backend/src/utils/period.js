// Chuyen { from, to } (YYYY-MM-DD) tu query thanh khoang thoi gian [start, end) theo UTC.
// Mac dinh khi thieu ca hai: [hom nay - 1 thang, hom nay]. Thieu 1 trong 2 thi suy ra tu cai con lai.
function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateRangeFromQuery({ from, to } = {}) {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const toDate = to ? parseDate(to) : todayUTC;
  if (to && !toDate) return null;

  let fromDate = from ? parseDate(from) : null;
  if (from && !fromDate) return null;
  if (!fromDate) {
    fromDate = new Date(toDate);
    fromDate.setUTCMonth(fromDate.getUTCMonth() - 1);
  }

  if (toDate < fromDate) return null;

  const end = new Date(toDate);
  end.setUTCDate(end.getUTCDate() + 1); // "to" duoc tinh bao gom ca ngay do

  return {
    start: fromDate,
    end,
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
  };
}

module.exports = { dateRangeFromQuery };
