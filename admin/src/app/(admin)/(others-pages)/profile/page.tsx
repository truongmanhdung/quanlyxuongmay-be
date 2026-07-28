"use client";
import React, { useEffect, useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/form/switch/Switch";
import { EyeCloseIcon, EyeIcon, PlusIcon, TrashBinIcon } from "@/icons";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/resources/auth";
import { settingsApi } from "@/lib/resources/settings";
import { ApiError } from "@/lib/api";

export default function ProfilePage() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu mới không khớp");
      return;
    }

    setSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setSuccess("Đổi mật khẩu thành công");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đổi mật khẩu thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Tài khoản</h1>
        <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
          Thông tin đăng nhập và bảo mật tài khoản quản lý
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6 max-w-lg">
        <div className="flex items-center gap-4 mb-6">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-xl font-semibold text-white">
            {user?.name?.charAt(0)?.toUpperCase() || "Q"}
          </span>
          <div>
            <p className="font-semibold text-gray-800 dark:text-white/90">{user?.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">@{user?.username}</p>
          </div>
        </div>

        <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">Đổi mật khẩu</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-success-50 px-4 py-3 text-sm text-success-600 dark:bg-success-500/15 dark:text-success-400">
              {success}
            </div>
          )}

          <div>
            <Label>Mật khẩu hiện tại</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
              >
                {showPassword ? (
                  <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                ) : (
                  <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                )}
              </span>
            </div>
          </div>
          <div>
            <Label>Mật khẩu mới</Label>
            <Input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint="Tối thiểu 6 ký tự"
            />
          </div>
          <div>
            <Label>Xác nhận mật khẩu mới</Label>
            <Input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Đang lưu..." : "Đổi mật khẩu"}
            </Button>
          </div>
        </form>
      </div>

      <ReminderSettingsCard />
    </div>
  );
}

function ReminderSettingsCard() {
  const [enabled, setEnabled] = useState(false);
  const [times, setTimes] = useState<string[]>([]);
  const [newTime, setNewTime] = useState("17:00");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    settingsApi
      .getReminder()
      .then((s) => {
        setEnabled(s.enabled);
        setTimes(s.times);
        setMessage(s.message);
      })
      .catch(() => setError("Không tải được cấu hình nhắc nhở"))
      .finally(() => setLoading(false));
  }, []);

  function addTime() {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(newTime)) return;
    if (times.includes(newTime)) return;
    setTimes([...times, newTime].sort((a, b) => a.localeCompare(b)));
  }

  function removeTime(t: string) {
    setTimes(times.filter((x) => x !== t));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await settingsApi.updateReminder({ enabled, times, message });
      setSuccess("Đã lưu cấu hình nhắc nhở");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu cấu hình thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemindAll() {
    setReminding(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await settingsApi.remindAll();
      setSuccess(`Đã nhắc ${res.remindedCount} công nhân chưa gửi sản lượng hôm nay`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gửi nhắc nhở thất bại");
    } finally {
      setReminding(false);
    }
  }

  if (loading) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6 max-w-lg">
      <h3 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">Nhắc công nhân gửi sản lượng</h3>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Tự động nhắc theo giờ cấu hình, hoặc bấm nhắc ngay bất cứ lúc nào
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-success-50 px-4 py-3 text-sm text-success-600 dark:bg-success-500/15 dark:text-success-400">
          {success}
        </div>
      )}

      <div className="space-y-4">
        <Switch label="Bật nhắc tự động hàng ngày" defaultChecked={enabled} onChange={setEnabled} />

        <div>
          <Label>Giờ nhắc (giờ máy chủ)</Label>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {times.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
              >
                {t}
                <button type="button" onClick={() => removeTime(t)}>
                  <TrashBinIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {times.length === 0 && <span className="text-sm text-gray-400">Chưa có giờ nào</span>}
          </div>
          <div className="flex items-center gap-2">
            <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="!w-32" />
            <button
              type="button"
              onClick={addTime}
              className="flex items-center justify-center rounded-lg border border-gray-300 p-2.5 text-gray-500 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400"
            >
              <PlusIcon />
            </button>
          </div>
        </div>

        <div>
          <Label>Nội dung nhắc nhở</Label>
          <Input value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button variant="outline" disabled={reminding} onClick={handleRemindAll}>
            {reminding ? "Đang gửi..." : "Nhắc ngay tất cả công nhân chưa gửi hôm nay"}
          </Button>
          <Button disabled={saving} onClick={handleSave}>
            {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </div>
      </div>
    </div>
  );
}
