import { api } from "@/lib/api";
import { AttendanceDayView, AttendanceRecord, AttendanceSummary } from "@/lib/types";

export const attendanceApi = {
  day: (date?: string) => api.get<AttendanceDayView>(`/attendance/day${date ? `?date=${date}` : ""}`),
  summary: (from: string, to: string) => api.get<AttendanceSummary>(`/attendance/summary?from=${from}&to=${to}`),
  list: (worker: string, from: string, to: string) =>
    api.get<AttendanceRecord[]>(`/attendance?worker=${worker}&from=${from}&to=${to}`),
};
