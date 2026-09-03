import { api, downloadFile } from "@/lib/api";
import { RevenueSummary, RevenueDetail } from "@/lib/types";

export interface RevenueSlip {
  _id: string;
  customer: { _id: string; code: string; name: string } | null;
  periodFrom: string;
  periodTo: string;
  totalQuantity: number;
  totalAmount: number;
  orderCount: number;
  issuedAt: string;
}

export const revenueApi = {
  summary: (from: string, to: string) => api.get<RevenueSummary>(`/revenue/summary?from=${from}&to=${to}`),
  detail: (customerId: string, from: string, to: string) =>
    api.get<RevenueDetail>(`/revenue?customer=${customerId}&from=${from}&to=${to}`),
  export: (customer: string, from: string, to: string) =>
    api.post<RevenueSlip>(`/revenue/export`, { customer, from, to }),
  listSlips: (params?: { customer?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.customer) qs.set("customer", params.customer);
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<RevenueSlip[]>(`/revenue/slips${suffix}`);
  },
  downloadSlipFile: (id: string, format: "pdf" | "xlsx", fileName: string) =>
    downloadFile(`/revenue/slips/${id}/export?format=${format}`, fileName),
};
