import { api } from "@/lib/api";
import { DashboardOverview } from "@/lib/types";

export const dashboardApi = {
  overview: (period?: string) => api.get<DashboardOverview>(`/dashboard/overview${period ? `?period=${period}` : ""}`),
};
