import { api } from "@/lib/api";
import { AttendanceDayView, AttendanceRecord, AttendanceSummary } from "@/lib/types";

export const attendanceApi = {
  day: (date?: string) => api.get<AttendanceDayView>(`/attendance/day${date ? `?date=${date}` : ""}`),
  summary: (period: string) => api.get<AttendanceSummary>(`/attendance/summary?period=${period}`),
  list: (worker: string, period: string) =>
    api.get<AttendanceRecord[]>(`/attendance?worker=${worker}&period=${period}`),
};
