import { api } from "@/lib/api";
import { Worker } from "@/lib/types";

export const workersApi = {
  list: (search?: string) => api.get<Worker[]>(`/workers${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  get: (id: string) => api.get<Worker>(`/workers/${id}`),
  create: (data: Partial<Worker>) => api.post<Worker>("/workers", data),
  update: (id: string, data: Partial<Worker>) => api.put<Worker>(`/workers/${id}`, data),
  remove: (id: string) => api.del<void>(`/workers/${id}`),
};
