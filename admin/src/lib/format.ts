export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Khoang ngay mac dinh cho cac bo loc tim kiem: [hom nay - 1 thang, hom nay]
export function defaultDateRange(): { from: string; to: string } {
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setMonth(fromDate.getMonth() - 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(fromDate), to: fmt(toDate) };
}

// Nhan hien thi cho 1 khoang ngay, dung chung cho cac trang tim kiem theo tu ngay-den ngay
export function formatDateRangeLabel(from: string, to: string): string {
  return `${formatDate(from)} - ${formatDate(to)}`;
}
