import { api } from "@/lib/api";
import { Product, ProcessStage } from "@/lib/types";

export const productsApi = {
  list: (params?: { customer?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.customer) qs.set("customer", params.customer);
    if (params?.search) qs.set("search", params.search);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<Product[]>(`/products${suffix}`);
  },
  get: (id: string) => api.get<Product>(`/products/${id}`),
  create: (data: {
    name: string;
    customer: string;
    unit?: string;
    standardPrice?: number;
    stages?: { name: string; unitPrice: number }[];
  }) => api.post<Product>("/products", data),
  update: (id: string, data: Partial<Pick<Product, "name" | "unit" | "standardPrice" | "active">>) =>
    api.put<Product>(`/products/${id}`, data),
  remove: (id: string) => api.del<void>(`/products/${id}`),

  listStages: (productId: string) => api.get<ProcessStage[]>(`/products/${productId}/stages`),
  createStage: (productId: string, data: { name: string; unitPrice: number }) =>
    api.post<ProcessStage>(`/products/${productId}/stages`, data),
  updateStage: (productId: string, stageId: string, data: Partial<ProcessStage>) =>
    api.put<ProcessStage>(`/products/${productId}/stages/${stageId}`, data),
  removeStage: (productId: string, stageId: string) =>
    api.del<void>(`/products/${productId}/stages/${stageId}`),
};
