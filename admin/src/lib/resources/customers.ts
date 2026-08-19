import { api } from "@/lib/api";
import { Customer } from "@/lib/types";

export const customersApi = {
  list: (params?: string | { search?: string; active?: boolean }) => {
    const opts = typeof params === "string" ? { search: params } : params;
    const qs = new URLSearchParams();
    if (opts?.search) qs.set("search", opts.search);
    if (opts?.active !== undefined) qs.set("active", String(opts.active));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<Customer[]>(`/customers${suffix}`);
  },
  get: (id: string) => api.get<Customer>(`/customers/${id}`),
  create: (data: Partial<Customer>) => api.post<Customer>("/customers", data),
  update: (id: string, data: Partial<Customer>) => api.put<Customer>(`/customers/${id}`, data),
  remove: (id: string) => api.del<void>(`/customers/${id}`),
};
