export interface Customer {
  _id: string;
  code: string;
  name: string;
  phone?: string;
  note?: string;
  active: boolean;
  createdAt: string;
}

export interface ProductRef {
  _id: string;
  name: string;
}

export interface Product {
  _id: string;
  name: string;
  // co the null neu khach hang bi xoa sau khi tao mau hang
  customer: { _id: string; code: string; name: string } | null;
  unit?: string;
  standardPrice: number;
  active: boolean;
  createdAt: string;
  stages?: ProcessStage[];
}

export interface ProcessStage {
  _id: string;
  product: string;
  name: string;
  unitPrice: number;
  priceHistory: { price: number; changedAt: string }[];
  active: boolean;
}

export interface Worker {
  _id: string;
  code: string;
  name: string;
  phone?: string;
  note?: string;
  active: boolean;
  createdAt: string;
}

export interface OrderDetail {
  _id: string;
  order: string;
  // co the null neu mau hang bi vo hieu hoa/xoa sau khi tao dong don hang
  product: { _id: string; name: string; unit?: string } | string | null;
  batch?: { _id: string; code: string } | string | null;
  quantity: number;
  unitPrice: number;
  amount?: number;
}

export interface Order {
  _id: string;
  code: string;
  type: "nhap" | "xuat";
  // co the null neu khach hang bi vo hieu hoa/xoa sau khi tao don hang
  customer: { _id: string; code: string; name: string } | null;
  date: string;
  note?: string;
  active: boolean;
  details?: OrderDetail[];
  createdAt: string;
}

export interface StockInfo {
  imported: number;
  exported: number;
  remaining: number;
}

export interface StockSummaryRow extends StockInfo {
  product: { _id: string; name: string; unit?: string };
}

export interface StockSummary {
  customer: string;
  rows: StockSummaryRow[];
}

export interface ProductionReport {
  _id: string;
  // co the null neu cong nhan bi vo hieu hoa/xoa sau khi bao cao duoc gui
  worker: { _id: string; code: string; name: string } | null;
  customer: { _id: string; code: string; name: string };
  // co the null neu mau hang / cong doan da bi xoa sau khi bao cao duoc gui
  product: { _id: string; name: string; unit?: string } | null;
  processStage: { _id: string; name: string; unitPrice: number } | null;
  batchNumber?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  status: "pending" | "confirmed" | "rejected";
  workDate: string;
  createdAt: string;
}

export interface PayrollRow {
  worker: Worker | null;
  totalQuantity: number;
  totalAmount: number;
  reportCount: number;
  // uoc tinh tu hang loi/hoan tra co gan cong nhan+cong doan - chi de doi chieu, khong phai so lieu tra luong chinh thuc
  defectQuantity: number;
  estimatedNetAmount: number;
}

export interface PayrollSummary {
  from: string;
  to: string;
  rows: PayrollRow[];
}

export interface PayrollDetail {
  from: string;
  to: string;
  worker: string;
  totalQuantity: number;
  totalAmount: number;
  reports: ProductionReport[];
}

export interface PayrollDefectComparisonRow {
  product: { _id: string; name: string } | null;
  processStage: { _id: string; name: string } | null;
  declaredQuantity: number;
  declaredAmount: number;
  defectQuantity: number;
  estimatedDefectAmount: number;
  netQuantity: number;
  netAmount: number;
}

export interface PayrollDefectComparison {
  from: string;
  to: string;
  worker: string;
  rows: PayrollDefectComparisonRow[];
  totals: { declaredAmount: number; estimatedDefectAmount: number; netAmount: number };
}

export interface Batch {
  _id: string;
  code: string;
  // co the null neu mau hang bi xoa sau khi tao lo hang
  product: { _id: string; name: string; unit?: string } | null;
  // co the null neu khach hang bi xoa sau khi tao lo hang
  customer: { _id: string; code: string; name: string } | null;
  plannedQuantity?: number;
  status: "dang_lam" | "chua_hoan_thanh" | "hoan_thanh";
  note?: string;
  active: boolean;
  reportedQuantity: number;
  exportedQuantity: number;
  completedAt?: string;
  createdAt: string;
}

export interface BatchDetail extends Batch {
  reports: ProductionReport[];
}

export interface DefectReport {
  _id: string;
  batch?: { _id: string; code: string };
  product: { _id: string; name: string } | null;
  // co the null neu khach hang bi xoa sau khi tao bao cao loi
  customer: { _id: string; code: string; name: string } | null;
  processStage?: { _id: string; name: string };
  worker?: { _id: string; code: string; name: string };
  quantity: number;
  type: "hong" | "tra_lai";
  reason?: string;
  reportedAt: string;
  active: boolean;
  createdAt: string;
}

export interface DefectSummary {
  from: string;
  to: string;
  totalHong: number;
  totalTraLai: number;
  rows: { product: { _id: string; name: string }; type: "hong" | "tra_lai"; totalQuantity: number; count: number }[];
}

export interface DefectComparisonRow {
  processStage: { _id: string; name: string } | null;
  worker: { _id: string; code: string; name: string } | null;
  declaredQuantity: number;
  defectQuantity: number;
  difference: number;
}

export interface DefectComparison {
  from: string;
  to: string;
  product: string;
  rows: DefectComparisonRow[];
}

export interface AppNotification {
  _id: string;
  worker: string;
  title: string;
  body?: string;
  type: "reminder" | "manual" | "system";
  read: boolean;
  createdAt: string;
}

export interface WorkerReminderSetting {
  _id: string;
  worker: { _id: string; code: string; name: string; active: boolean } | string;
  enabled: boolean;
  times: string[];
  message?: string;
}

export interface ReminderSetting {
  _id: string;
  enabled: boolean;
  times: string[];
  message: string;
}

export interface AttendanceRecord {
  _id: string;
  worker: { _id: string; code: string; name: string };
  date: string;
  checkInAt?: string;
  checkOutAt?: string;
}

export interface AttendanceDayRow {
  worker: Worker;
  attendance: AttendanceRecord | null;
}

export interface AttendanceDayView {
  date: string;
  rows: AttendanceDayRow[];
}

export interface AttendanceSummaryRow {
  worker: Worker | null;
  daysPresent: number;
}

export interface AttendanceSummary {
  from: string;
  to: string;
  rows: AttendanceSummaryRow[];
}

export interface DashboardOverview {
  from: string;
  to: string;
  totalAmount: number;
  totalQuantity: number;
  batchCount: number;
  totalWorkerCount: number;
  activeWorkerCount: number;
  activeCustomers: number;
  activeProducts: number;
  last7Days: { date: string; quantity: number; amount: number }[];
  recentSubmissions: ProductionReport[];
}
