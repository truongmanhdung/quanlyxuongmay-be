"use client";
import React, { useEffect, useState } from "react";
import { notification } from "antd";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Badge from "@/components/ui/badge/Badge";
import { PencilIcon, TrashBinIcon, PlusIcon, CheckCircleIcon, CopyIcon } from "@/icons";
import { useConfirmDialog } from "@/components/ui/confirm-dialog/ConfirmDialogProvider";
import { workersApi } from "@/lib/resources/workers";
import { Worker } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";

const emptyForm = { name: "", phone: "", note: "" };

export default function WorkersPage() {
  const confirmDialog = useConfirmDialog();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await workersApi.list(search || undefined);
      setWorkers(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được danh sách công nhân");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setIsOpen(true);
  }

  function openEdit(w: Worker) {
    setEditing(w);
    setForm({ name: w.name, phone: w.phone || "", note: w.note || "" });
    setError(null);
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await workersApi.update(editing._id, { name: form.name, phone: form.phone, note: form.note });
        setIsOpen(false);
      } else {
        const created = await workersApi.create(form);
        setIsOpen(false);
        setNewCode(created.code);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu công nhân thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(w: Worker) {
    if (w.active) {
      const ok = await confirmDialog({
        title: "Xác nhận vô hiệu hoá",
        message: `Vô hiệu hoá công nhân "${w.name}" (${w.code})?`,
        confirmText: "Vô hiệu hoá",
        danger: true,
      });
      if (!ok) return;
    }
    try {
      if (w.active) {
        await workersApi.remove(w._id);
      } else {
        await workersApi.update(w._id, { active: true });
      }
      await load();
    } catch (err) {
      notification.error({ message: err instanceof ApiError ? err.message : "Cập nhật trạng thái thất bại" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Công nhân</h1>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Quản lý mã đăng nhập cấp cho công nhân dùng app (VD: A012, A013...)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Tìm theo tên hoặc mã..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button size="sm" startIcon={<PlusIcon />} onClick={openCreate}>
            Thêm công nhân
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Mã đăng nhập</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Họ tên</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">SĐT</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Ngày vào làm</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Trạng thái</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{""}</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading && (
                <TableRow>
                  <TableCell className="py-6 px-5 text-center text-gray-400" colSpan={6}>Đang tải...</TableCell>
                </TableRow>
              )}
              {!loading && workers.length === 0 && (
                <TableRow>
                  <TableCell className="py-6 px-5 text-center text-gray-400" colSpan={6}>Chưa có công nhân nào</TableCell>
                </TableRow>
              )}
              {workers.map((w) => (
                <TableRow key={w._id}>
                  <TableCell className="py-3 px-5">
                    <Badge size="sm" color="primary">{w.code}</Badge>
                  </TableCell>
                  <TableCell className="py-3 px-5 font-medium text-gray-800 text-theme-sm dark:text-white/90">{w.name}</TableCell>
                  <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">{w.phone || "—"}</TableCell>
                  <TableCell className="py-3 px-5 text-gray-500 text-theme-xs dark:text-gray-400">{formatDate(w.createdAt)}</TableCell>
                  <TableCell className="py-3 px-5">
                    <Badge size="sm" color={w.active ? "success" : "light"}>{w.active ? "Đang làm" : "Ngừng"}</Badge>
                  </TableCell>
                  <TableCell className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(w)} className="text-gray-500 hover:text-brand-500 dark:text-gray-400">
                        <PencilIcon />
                      </button>
                      <button
                        onClick={() => handleToggleActive(w)}
                        title={w.active ? "Vô hiệu hoá" : "Kích hoạt lại"}
                        className={
                          w.active
                            ? "text-gray-500 hover:text-error-500 dark:text-gray-400"
                            : "text-gray-500 hover:text-success-500 dark:text-gray-400"
                        }
                      >
                        {w.active ? <TrashBinIcon /> : <CheckCircleIcon />}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} className="max-w-md m-4">
        <div className="p-6">
          <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
            {editing ? "Sửa công nhân" : "Thêm công nhân"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
                {error}
              </div>
            )}
            {editing && (
              <div>
                <Label>Mã đăng nhập</Label>
                <Input value={editing.code} disabled />
              </div>
            )}
            <div>
              <Label>Họ tên <span className="text-error-500">*</span></Label>
              <Input placeholder="Nguyễn Văn A" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Số điện thoại</Label>
              <Input placeholder="09xxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Ghi chú</Label>
              <Input placeholder="Ghi chú thêm..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={!!newCode} onClose={() => setNewCode(null)} className="max-w-sm m-4" showCloseButton={false}>
        <div className="p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">Đã tạo công nhân</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Báo mã đăng nhập này cho công nhân để họ đăng nhập vào app (không cần mật khẩu):
          </p>
          <div className="mb-5 flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <span className="text-2xl font-bold tracking-widest text-brand-500">{newCode}</span>
            <button
              type="button"
              title="Sao chép"
              className="text-gray-400 hover:text-brand-500"
              onClick={() => newCode && navigator.clipboard.writeText(newCode)}
            >
              <CopyIcon />
            </button>
          </div>
          <Button className="w-full" onClick={() => setNewCode(null)}>
            Đã ghi nhớ
          </Button>
        </div>
      </Modal>
    </div>
  );
}
