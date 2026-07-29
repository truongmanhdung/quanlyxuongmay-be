import { api } from "@/lib/api";
import { ReminderSetting, WorkerReminderSetting } from "@/lib/types";

export const settingsApi = {
  getReminder: () => api.get<ReminderSetting>("/settings/reminder"),
  updateReminder: (data: { enabled?: boolean; times?: string[]; message?: string }) =>
    api.put<ReminderSetting>("/settings/reminder", data),
  remindAll: () => api.post<{ remindedCount: number }>("/notifications/remind", {}),
  remindWorkers: (workerIds: string[]) =>
    api.post<{ remindedCount: number }>("/notifications/remind", { workerIds }),
  getWorkerReminders: () => api.get<WorkerReminderSetting[]>("/settings/reminder/workers"),
  updateWorkerReminder: (workerId: string, data: { enabled?: boolean; times?: string[]; message?: string }) =>
    api.put<WorkerReminderSetting>(`/settings/reminder/workers/${workerId}`, data),
  removeWorkerReminder: (workerId: string) => api.del<void>(`/settings/reminder/workers/${workerId}`),
};
