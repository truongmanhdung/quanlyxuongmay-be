import { api } from "@/lib/api";

export const authApi = {
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch<{ message: string }>("/auth/admin/change-password", { currentPassword, newPassword }),
};
