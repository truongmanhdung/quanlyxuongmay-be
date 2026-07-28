import { api } from "@/lib/api";
import { Customer } from "@/lib/types";

export const customersApi = {
  list: (search?: string) => api.get<Customer[]>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  get: (id: string) => api.get<Customer>(`/customers/${id}`),
  create: (data: Partial<Customer>) => api.post<Customer>("/customers", data),
  update: (id: string, data: Partial<Customer>) => api.put<Customer>(`/customers/${id}`, data),
  remove: (id: string) => api.del<void>(`/customers/${id}`),
};
