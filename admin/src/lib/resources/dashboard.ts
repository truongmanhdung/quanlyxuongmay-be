import { api } from "@/lib/api";
import { DashboardOverview } from "@/lib/types";

export const dashboardApi = {
  overview: (params?: { from?: string; to?: string; days?: number }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    if (params?.days) qs.set("days", String(params.days));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<DashboardOverview>(`/dashboard/overview${suffix}`);
  },
};
