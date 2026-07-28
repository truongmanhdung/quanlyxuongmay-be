import { api } from "@/lib/api";
import { DefectComparison, DefectReport, DefectSummary, Worker } from "@/lib/types";

export const defectsApi = {
  list: (params?: { product?: string; customer?: string; batch?: string; type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.product) qs.set("product", params.product);
    if (params?.customer) qs.set("customer", params.customer);
    if (params?.batch) qs.set("batch", params.batch);
    if (params?.type) qs.set("type", params.type);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<DefectReport[]>(`/defects${suffix}`);
  },
  create: (data: {
    batch?: string;
    product: string;
    customer: string;
    processStage?: string;
    worker?: string;
    quantity: number;
    type: "hong" | "tra_lai";
    reason?: string;
  }) => api.post<DefectReport>("/defects", data),
  update: (
    id: string,
    data: Partial<Pick<DefectReport, "quantity" | "type" | "reason">> & { processStage?: string; worker?: string }
  ) => api.put<DefectReport>(`/defects/${id}`, data),
  remove: (id: string) => api.del<void>(`/defects/${id}`),
  summary: (period: string) => api.get<DefectSummary>(`/defects/summary?period=${period}`),
  workersForStage: (product: string, processStage: string) =>
    api.get<Worker[]>(`/defects/workers-for-stage?product=${product}&processStage=${processStage}`),
  comparison: (product: string, period: string) =>
    api.get<DefectComparison>(`/defects/comparison?product=${product}&period=${period}`),
};
