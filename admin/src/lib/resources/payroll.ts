import { api, downloadFile } from "@/lib/api";
import { PayrollSummary, PayrollDetail, PayrollDefectComparison } from "@/lib/types";

export interface PayrollSlip {
  _id: string;
  worker: { _id: string; code: string; name: string };
  periodFrom: string;
  periodTo: string;
  totalQuantity: number;
  totalAmount: number;
  reportCount: number;
  issuedAt: string;
}

export const payrollApi = {
  summary: (from: string, to: string) => api.get<PayrollSummary>(`/payroll/summary?from=${from}&to=${to}`),
  detail: (workerId: string, from: string, to: string) =>
    api.get<PayrollDetail>(`/payroll?worker=${workerId}&from=${from}&to=${to}`),
  defectComparison: (workerId: string, from: string, to: string) =>
    api.get<PayrollDefectComparison>(`/payroll/defect-comparison?worker=${workerId}&from=${from}&to=${to}`),
  export: (worker: string, from: string, to: string) =>
    api.post<PayrollSlip>(`/payroll/export`, { worker, from, to }),
  listSlips: (params?: { worker?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.worker) qs.set("worker", params.worker);
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<PayrollSlip[]>(`/payroll/slips${suffix}`);
  },
  downloadSlipFile: (id: string, format: "pdf" | "xlsx", fileName: string) =>
    downloadFile(`/payroll/slips/${id}/export?format=${format}`, fileName),
};
