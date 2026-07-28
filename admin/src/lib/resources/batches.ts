import { api } from "@/lib/api";
import { Batch, BatchDetail } from "@/lib/types";

export const batchesApi = {
  list: (params?: { status?: string; product?: string; customer?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.product) qs.set("product", params.product);
    if (params?.customer) qs.set("customer", params.customer);
    if (params?.search) qs.set("search", params.search);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<Batch[]>(`/batches${suffix}`);
  },
  get: (id: string) => api.get<BatchDetail>(`/batches/${id}`),
  create: (data: { code: string; product: string; customer: string; plannedQuantity?: number; note?: string }) =>
    api.post<Batch>("/batches", data),
  update: (id: string, data: { plannedQuantity?: number; note?: string; status?: "dang_lam" | "chua_hoan_thanh" }) =>
    api.put<Batch>(`/batches/${id}`, data),
  complete: (id: string) => api.patch<Batch>(`/batches/${id}/complete`, {}),
  remove: (id: string) => api.del<void>(`/batches/${id}`),
};
