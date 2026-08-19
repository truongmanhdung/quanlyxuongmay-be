import { api } from "@/lib/api";
import { Order, OrderDetail, StockInfo, StockSummary } from "@/lib/types";

export const ordersApi = {
  list: (params?: { type?: string; customer?: string }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set("type", params.type);
    if (params?.customer) qs.set("customer", params.customer);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<Order[]>(`/orders${suffix}`);
  },
  get: (id: string) => api.get<Order>(`/orders/${id}`),
  create: (data: {
    type: "nhap" | "xuat";
    customer: string;
    date?: string;
    note?: string;
    details?: { product: string; batch?: string; quantity: number; unitPrice?: number }[];
  }) => api.post<Order>("/orders", data),
  update: (id: string, data: Partial<Order>) => api.put<Order>(`/orders/${id}`, data),
  remove: (id: string) => api.del<void>(`/orders/${id}`),

  addDetail: (orderId: string, data: { product: string; quantity: number; unitPrice?: number }) =>
    api.post<OrderDetail>(`/orders/${orderId}/details`, data),
  removeDetail: (orderId: string, detailId: string) =>
    api.del<void>(`/orders/${orderId}/details/${detailId}`),

  stock: (customer: string, product: string) =>
    api.get<StockInfo>(`/orders/stock?customer=${customer}&product=${product}`),
  stockSummary: (customer: string) => api.get<StockSummary>(`/orders/stock-summary?customer=${customer}`),
};
