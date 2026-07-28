import { api } from "@/lib/api";
import { ProductionReport } from "@/lib/types";

export const reportsApi = {
  list: (params?: { worker?: string; product?: string; customer?: string; status?: string }) => {
    const qs = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => v && qs.set(k, v));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<ProductionReport[]>(`/reports${suffix}`);
  },
  recent: (limit = 20) => api.get<ProductionReport[]>(`/reports/recent?limit=${limit}`),
  setStatus: (id: string, status: "pending" | "confirmed" | "rejected") =>
    api.patch<ProductionReport>(`/reports/${id}/status`, { status }),
};
