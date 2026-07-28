import { api, downloadFile } from "@/lib/api";
import { PayrollSummary, PayrollDetail, PayrollDefectComparison } from "@/lib/types";

export interface PayrollSlip {
  _id: string;
  worker: { _id: string; code: string; name: string };
  period: string;
  totalQuantity: number;
  totalAmount: number;
  reportCount: number;
  issuedAt: string;
}

export const payrollApi = {
  summary: (period: string) => api.get<PayrollSummary>(`/payroll/summary?period=${period}`),
  detail: (workerId: string, period: string) =>
    api.get<PayrollDetail>(`/payroll?worker=${workerId}&period=${period}`),
  defectComparison: (workerId: string, period: string) =>
    api.get<PayrollDefectComparison>(`/payroll/defect-comparison?worker=${workerId}&period=${period}`),
  export: (worker: string, period: string) => api.post<PayrollSlip>(`/payroll/export`, { worker, period }),
  listSlips: (params?: { worker?: string; period?: string }) => {
    const qs = new URLSearchParams();
    if (params?.worker) qs.set("worker", params.worker);
    if (params?.period) qs.set("period", params.period);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<PayrollSlip[]>(`/payroll/slips${suffix}`);
  },
  downloadSlipFile: (id: string, format: "pdf" | "xlsx", fileName: string) =>
    downloadFile(`/payroll/slips/${id}/export?format=${format}`, fileName),
};
