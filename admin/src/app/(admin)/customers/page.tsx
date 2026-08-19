"use client";
import React, { useEffect, useState } from "react";
import { notification } from "antd";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Badge from "@/components/ui/badge/Badge";
import { PencilIcon, TrashBinIcon, PlusIcon, CheckCircleIcon } from "@/icons";
import { useConfirmDialog } from "@/components/ui/confirm-dialog/ConfirmDialogProvider";
import { customersApi } from "@/lib/resources/customers";
import { Customer } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";

const emptyForm = { name: "", phone: "", note: "" };

export default function CustomersPage() {
  const confirmDialog = useConfirmDialog();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await customersApi.list(search || undefined);
      setCustomers(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được danh sách khách hàng");
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

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || "", note: c.note || "" });
    setError(null);
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await customersApi.update(editing._id, { name: form.name, phone: form.phone, note: form.note });
      } else {
        await customersApi.create(form);
      }
      setIsOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu khách hàng thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(c: Customer) {
    if (c.active) {
      const ok = await confirmDialog({
        title: "Xác nhận vô hiệu hoá",
        message: `Vô hiệu hoá khách hàng "${c.name}"?`,
        confirmText: "Vô hiệu hoá",
        danger: true,
      });
      if (!ok) return;
    }
    try {
      if (c.active) {
        await customersApi.remove(c._id);
      } else {
        await customersApi.update(c._id, { active: true });
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
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Khách hàng</h1>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Danh sách khách hàng đặt gia công
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Tìm theo tên hoặc mã..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button size="sm" startIcon={<PlusIcon />} onClick={openCreate}>
            Thêm khách hàng
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Mã KH</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Tên khách hàng</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">SĐT</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Ngày tạo</TableCell>
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
              {!loading && customers.length === 0 && (
                <TableRow>
                  <TableCell className="py-6 px-5 text-center text-gray-400" colSpan={6}>Chưa có khách hàng nào</TableCell>
                </TableRow>
              )}
              {customers.map((c) => (
                <TableRow key={c._id}>
                  <TableCell className="py-3 px-5 font-medium text-gray-800 text-theme-sm dark:text-white/90">{c.code}</TableCell>
                  <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">{c.name}</TableCell>
                  <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">{c.phone || "—"}</TableCell>
                  <TableCell className="py-3 px-5 text-gray-500 text-theme-xs dark:text-gray-400">{formatDate(c.createdAt)}</TableCell>
                  <TableCell className="py-3 px-5">
                    <Badge size="sm" color={c.active ? "success" : "light"}>{c.active ? "Hoạt động" : "Ngừng"}</Badge>
                  </TableCell>
                  <TableCell className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(c)} title="Sửa" className="text-gray-500 hover:text-brand-500 dark:text-gray-400">
                        <PencilIcon />
                      </button>
                      <button
                        onClick={() => handleToggleActive(c)}
                        title={c.active ? "Vô hiệu hoá" : "Kích hoạt lại"}
                        className={
                          c.active
                            ? "text-gray-500 hover:text-error-500 dark:text-gray-400"
                            : "text-gray-500 hover:text-success-500 dark:text-gray-400"
                        }
                      >
                        {c.active ? <TrashBinIcon /> : <CheckCircleIcon />}
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
            {editing ? "Sửa khách hàng" : "Thêm khách hàng"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
                {error}
              </div>
            )}
            {editing && (
              <div>
                <Label>Mã khách hàng</Label>
                <Input value={editing.code} disabled />
              </div>
            )}
            <div>
              <Label>Tên khách hàng <span className="text-error-500">*</span></Label>
              <Input placeholder="Công ty ABC" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
    </div>
  );
}
