import { api } from "@/lib/api";
import { ReminderSetting } from "@/lib/types";

export const settingsApi = {
  getReminder: () => api.get<ReminderSetting>("/settings/reminder"),
  updateReminder: (data: { enabled?: boolean; times?: string[]; message?: string }) =>
    api.put<ReminderSetting>("/settings/reminder", data),
  remindAll: () => api.post<{ remindedCount: number }>("/notifications/remind", {}),
};
