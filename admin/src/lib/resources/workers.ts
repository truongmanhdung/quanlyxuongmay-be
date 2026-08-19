import { api } from "@/lib/api";
import { Worker } from "@/lib/types";

export const workersApi = {
  list: (params?: string | { search?: string; active?: boolean }) => {
    const opts = typeof params === "string" ? { search: params } : params;
    const qs = new URLSearchParams();
    if (opts?.search) qs.set("search", opts.search);
    if (opts?.active !== undefined) qs.set("active", String(opts.active));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<Worker[]>(`/workers${suffix}`);
  },
  get: (id: string) => api.get<Worker>(`/workers/${id}`),
  create: (data: Partial<Worker>) => api.post<Worker>("/workers", data),
  update: (id: string, data: Partial<Worker>) => api.put<Worker>(`/workers/${id}`, data),
  remove: (id: string) => api.del<void>(`/workers/${id}`),
};
