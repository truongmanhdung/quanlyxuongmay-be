"use client";
import React, { useEffect, useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/form/switch/Switch";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { PlusIcon, TrashBinIcon, PaperPlaneIcon } from "@/icons";
import { settingsApi } from "@/lib/resources/settings";
import { workersApi } from "@/lib/resources/workers";
import { ApiError } from "@/lib/api";
import { Worker, WorkerReminderSetting } from "@/lib/types";

export default function RemindersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Nhắc nhở</h1>
        <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
          Nhắc công nhân gửi sản lượng — cấu hình chung hoặc riêng cho từng người
        </p>
      </div>

      <GlobalReminderCard />
      <WorkerReminderTable />
    </div>
  );
}

function GlobalReminderCard() {
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
      <h3 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">Cấu hình chung</h3>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Áp dụng cho mọi công nhân chưa có cấu hình riêng bên dưới
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

function WorkerReminderTable() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [overrides, setOverrides] = useState<Record<string, WorkerReminderSetting>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [w, o] = await Promise.all([workersApi.list(), settingsApi.getWorkerReminders()]);
      setWorkers(w.filter((x) => x.active));
      const map: Record<string, WorkerReminderSetting> = {};
      o.forEach((item) => {
        const workerId = typeof item.worker === "string" ? item.worker : item.worker._id;
        map[workerId] = item;
      });
      setOverrides(map);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được danh sách công nhân");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleOverrideChange(workerId: string, override: WorkerReminderSetting | null) {
    setOverrides((prev) => {
      const next = { ...prev };
      if (override) next[workerId] = override;
      else delete next[workerId];
      return next;
    });
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="p-5 lg:p-6 pb-0">
        <h3 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">Cấu hình riêng từng công nhân</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Đặt giờ nhắc khác giờ chung cho một công nhân, hoặc bấm nhắc ngay để bắn thông báo tức thì cho riêng người đó
        </p>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
          {error}
        </div>
      )}

      <div className="max-w-full overflow-x-auto p-5 lg:p-6">
        <Table>
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell isHeader className="py-3 px-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Công nhân</TableCell>
              <TableCell isHeader className="py-3 px-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nhắc riêng</TableCell>
              <TableCell isHeader className="py-3 px-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Giờ nhắc riêng</TableCell>
              <TableCell isHeader className="py-3 px-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nội dung riêng</TableCell>
              <TableCell isHeader className="py-3 px-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{""}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading && (
              <TableRow>
                <TableCell className="py-6 px-3 text-center text-gray-400" colSpan={5}>Đang tải...</TableCell>
              </TableRow>
            )}
            {!loading && workers.length === 0 && (
              <TableRow>
                <TableCell className="py-6 px-3 text-center text-gray-400" colSpan={5}>Chưa có công nhân nào</TableCell>
              </TableRow>
            )}
            {!loading &&
              workers.map((w) => (
                <WorkerReminderRow key={w._id} worker={w} override={overrides[w._id] ?? null} onChange={handleOverrideChange} />
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function WorkerReminderRow({
  worker,
  override,
  onChange,
}: {
  worker: Worker;
  override: WorkerReminderSetting | null;
  onChange: (workerId: string, override: WorkerReminderSetting | null) => void;
}) {
  const [enabled, setEnabled] = useState(override?.enabled ?? false);
  const [times, setTimes] = useState<string[]>(override?.times ?? []);
  const [newTime, setNewTime] = useState("17:00");
  const [message, setMessage] = useState(override?.message ?? "");
  const [saving, setSaving] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  function addTime() {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(newTime)) return;
    if (times.includes(newTime)) return;
    setTimes([...times, newTime].sort((a, b) => a.localeCompare(b)));
  }

  function removeTime(t: string) {
    setTimes(times.filter((x) => x !== t));
  }

  async function handleSave() {
    if (times.length === 0) {
      setFeedback("Cần ít nhất 1 giờ nhắc");
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const saved = await settingsApi.updateWorkerReminder(worker._id, { enabled, times, message: message || undefined });
      onChange(worker._id, saved);
      setFeedback("Đã lưu");
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setFeedback(null);
    try {
      await settingsApi.removeWorkerReminder(worker._id);
      onChange(worker._id, null);
      setEnabled(false);
      setTimes([]);
      setMessage("");
      setFeedback("Đã xoá cấu hình riêng, dùng cấu hình chung");
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Xoá thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemindNow() {
    setReminding(true);
    setFeedback(null);
    try {
      const res = await settingsApi.remindWorkers([worker._id]);
      setFeedback(res.remindedCount > 0 ? "Đã gửi thông báo" : "Công nhân đã gửi sản lượng hôm nay");
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : "Gửi thất bại");
    } finally {
      setReminding(false);
    }
  }

  return (
    <TableRow>
      <TableCell className="py-3 px-3 align-top">
        <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{worker.name}</p>
        <span className="text-gray-500 text-theme-xs dark:text-gray-400">{worker.code}</span>
      </TableCell>
      <TableCell className="py-3 px-3 align-top">
        <Switch label="" defaultChecked={enabled} onChange={setEnabled} />
      </TableCell>
      <TableCell className="py-3 px-3 align-top min-w-[220px]">
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {times.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
            >
              {t}
              <button type="button" onClick={() => removeTime(t)}>
                <TrashBinIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
          {times.length === 0 && <span className="text-xs text-gray-400">Chưa có giờ nào</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="!w-28 !py-1.5" />
          <button
            type="button"
            onClick={addTime}
            className="flex items-center justify-center rounded-lg border border-gray-300 p-1.5 text-gray-500 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </TableCell>
      <TableCell className="py-3 px-3 align-top min-w-[180px]">
        <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Dùng nội dung chung" className="!py-1.5" />
      </TableCell>
      <TableCell className="py-3 px-3 align-top">
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              title="Nhắc ngay công nhân này"
              disabled={reminding}
              onClick={handleRemindNow}
              className="flex items-center justify-center rounded-lg border border-gray-300 p-2 text-gray-500 hover:text-brand-500 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
            >
              <PaperPlaneIcon className="h-4 w-4" />
            </button>
            {override && (
              <button
                type="button"
                title="Xoá cấu hình riêng"
                disabled={saving}
                onClick={handleReset}
                className="flex items-center justify-center rounded-lg border border-gray-300 p-2 text-gray-500 hover:text-error-500 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
              >
                <TrashBinIcon className="h-4 w-4" />
              </button>
            )}
            <Button className="!px-3 !py-1.5 !text-xs" disabled={saving} onClick={handleSave}>
              {saving ? "..." : "Lưu"}
            </Button>
          </div>
          {feedback && <span className="text-xs text-gray-500 dark:text-gray-400">{feedback}</span>}
        </div>
      </TableCell>
    </TableRow>
  );
}
