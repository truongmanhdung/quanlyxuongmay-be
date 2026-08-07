"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Badge from "@/components/ui/badge/Badge";
import { PencilIcon, TrashBinIcon, PlusIcon, CheckCircleIcon } from "@/icons";
import { useConfirmDialog } from "@/components/ui/confirm-dialog/ConfirmDialogProvider";
import { batchesApi } from "@/lib/resources/batches";
import { productsApi } from "@/lib/resources/products";
import { customersApi } from "@/lib/resources/customers";
import { Batch, Product, Customer } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { notification } from "antd";

const STATUS_LABEL: Record<Batch["status"], string> = {
  dang_lam: "Đang làm",
  chua_hoan_thanh: "Chưa hoàn thành",
  hoan_thanh: "Hoàn thành",
};

const STATUS_COLOR: Record<Batch["status"], "warning" | "light" | "success"> = {
  dang_lam: "warning",
  chua_hoan_thanh: "light",
  hoan_thanh: "success",
};

const emptyForm = { code: "", product: "", customer: "", plannedQuantity: "", note: "" };

export default function BatchesPage() {
  const confirmDialog = useConfirmDialog();
  const searchParams = useSearchParams();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") || "");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [b, p, c] = await Promise.all([
        batchesApi.list({ status: statusFilter || undefined, search: search || undefined }),
        productsApi.list(),
        customersApi.list(),
      ]);
      setBatches(b);
      setProducts(p);
      setCustomers(c);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được danh sách lô hàng");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleNewBatch = (batch: Batch) => {
      notification.info({ title: "Lô hàng mới", description: `Lô "${batch.code}" vừa được tạo`, placement: "topRight" });
      loadRef.current();
    };
    const handleUpdatedBatch = (batch: Batch) => {
      if (batch.status === "hoan_thanh") {
        notification.success({ title: "Lô hàng hoàn thành", description: `Lô "${batch.code}" đã hoàn thành`, placement: "topRight" });
      }
      loadRef.current();
    };
    socket.on("batch:new", handleNewBatch);
    socket.on("batch:updated", handleUpdatedBatch);
    return () => {
      socket.off("batch:new", handleNewBatch);
      socket.off("batch:updated", handleUpdatedBatch);
    };
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setIsOpen(true);
  }

  function openEdit(b: Batch) {
    setEditing(b);
    setForm({
      code: b.code,
      product: b.product?._id ?? "",
      customer: b.customer?._id ?? "",
      plannedQuantity: b.plannedQuantity ? String(b.plannedQuantity) : "",
      note: b.note || "",
    });
    setError(null);
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await batchesApi.update(editing._id, {
          plannedQuantity: form.plannedQuantity ? Number(form.plannedQuantity) : undefined,
          note: form.note,
        });
      } else {
        if (!form.code || !form.product || !form.customer) {
          setError("Vui lòng nhập mã lô, chọn mẫu hàng và khách hàng");
          setSaving(false);
          return;
        }
        await batchesApi.create({
          code: form.code,
          product: form.product,
          customer: form.customer,
          plannedQuantity: form.plannedQuantity ? Number(form.plannedQuantity) : undefined,
          note: form.note,
        });
      }
      setIsOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu lô hàng thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(b: Batch) {
    const ok = await confirmDialog({
      title: "Duyệt hoàn thành",
      message: `Duyệt hoàn thành lô "${b.code}"? Hãy chắc chắn đã kiểm tra chất lượng.`,
    });
    if (!ok) return;
    try {
      await batchesApi.complete(b._id);
      await load();
    } catch (err) {
      notification.error({ message: err instanceof ApiError ? err.message : "Duyệt hoàn thành thất bại" });
    }
  }

  async function handleDelete(b: Batch) {
    const ok = await confirmDialog({ message: `Xoá lô hàng "${b.code}"?`, danger: true });
    if (!ok) return;
    try {
      await batchesApi.remove(b._id);
      await load();
    } catch (err) {
      notification.error({ message: err instanceof ApiError ? err.message : "Xoá thất bại" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Lô hàng</h1>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Theo dõi tiến độ và trạng thái từng lô sản xuất
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="Tìm theo mã lô..." value={search} onChange={(e) => setSearch(e.target.value)} className="!w-44" />
          <Select
            placeholder="Tất cả trạng thái"
            className="!w-52"
            value={statusFilter}
            options={[
              { value: "dang_lam", label: "Đang làm" },
              { value: "chua_hoan_thanh", label: "Chưa hoàn thành" },
              { value: "hoan_thanh", label: "Hoàn thành" },
            ]}
            onChange={setStatusFilter}
          />
          <Button size="sm" startIcon={<PlusIcon />} onClick={openCreate}>
            Thêm lô hàng
          </Button>
        </div>
      </div>

      {error && <div className="text-error-500 text-sm">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Mã lô</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Mẫu hàng</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Khách hàng</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Tiến độ</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Đã xuất kho</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Trạng thái</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{""}</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading && (
                <TableRow>
                  <TableCell className="py-6 px-5 text-center text-gray-400" colSpan={7}>Đang tải...</TableCell>
                </TableRow>
              )}
              {!loading && batches.length === 0 && (
                <TableRow>
                  <TableCell className="py-6 px-5 text-center text-gray-400" colSpan={7}>Chưa có lô hàng nào</TableCell>
                </TableRow>
              )}
              {batches.map((b) => {
                const ready =
                  b.status !== "hoan_thanh" &&
                  !!b.plannedQuantity &&
                  b.reportedQuantity >= b.plannedQuantity;
                return (
                  <TableRow key={b._id}>
                    <TableCell className="py-3 px-5 font-medium text-gray-800 text-theme-sm dark:text-white/90">{b.code}</TableCell>
                    <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">{b.product?.name ?? "(mẫu hàng đã xoá)"}</TableCell>
                    <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">{b.customer?.name ?? "(khách hàng đã xoá)"}</TableCell>
                    <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">
                      {formatNumber(b.reportedQuantity)}
                      {b.plannedQuantity ? ` / ${formatNumber(b.plannedQuantity)}` : ""}
                      {ready && (
                        <span className="ml-2 text-xs font-medium text-brand-600 dark:text-brand-400">Đủ SL, chờ duyệt</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">
                      {b.exportedQuantity > 0 ? (
                        formatNumber(b.exportedQuantity)
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-5">
                      <Badge size="sm" color={STATUS_COLOR[b.status]}>{STATUS_LABEL[b.status]}</Badge>
                    </TableCell>
                    <TableCell className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        {b.status !== "hoan_thanh" && (
                          <button
                            onClick={() => handleComplete(b)}
                            className={ready ? "text-brand-500 hover:text-brand-600" : "text-gray-500 hover:text-brand-500 dark:text-gray-400"}
                            title="Duyệt hoàn thành"
                          >
                            <CheckCircleIcon />
                          </button>
                        )}
                        <button onClick={() => openEdit(b)} className="text-gray-500 hover:text-brand-500 dark:text-gray-400">
                          <PencilIcon />
                        </button>
                        <button onClick={() => handleDelete(b)} className="text-gray-500 hover:text-error-500 dark:text-gray-400">
                          <TrashBinIcon />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} className="max-w-md m-4">
        <div className="p-6">
          <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
            {editing ? "Sửa lô hàng" : "Thêm lô hàng"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
                {error}
              </div>
            )}
            <div>
              <Label>Mã lô {!editing && <span className="text-error-500">*</span>}</Label>
              <Input placeholder="LO001" value={form.code} disabled={!!editing} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <Label>Mẫu hàng {!editing && <span className="text-error-500">*</span>}</Label>
              {editing ? (
                <Input value={editing.product?.name ?? "(mẫu hàng đã xoá)"} disabled />
              ) : (
                <Select
                  placeholder="Chọn mẫu hàng"
                  options={products.map((p) => ({ value: p._id, label: p.name }))}
                  onChange={(value) => setForm({ ...form, product: value })}
                />
              )}
            </div>
            <div>
              <Label>Khách hàng {!editing && <span className="text-error-500">*</span>}</Label>
              {editing ? (
                <Input value={editing.customer?.name ?? "(khách hàng đã xoá)"} disabled />
              ) : (
                <Select
                  placeholder="Chọn khách hàng"
                  options={customers.map((c) => ({ value: c._id, label: `${c.code} — ${c.name}` }))}
                  onChange={(value) => setForm({ ...form, customer: value })}
                />
              )}
            </div>
            <div>
              <Label>Số lượng kế hoạch (không bắt buộc)</Label>
              <Input
                type="number"
                value={form.plannedQuantity}
                onChange={(e) => setForm({ ...form, plannedQuantity: e.target.value })}
              />
            </div>
            <div>
              <Label>Ghi chú</Label>
              <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
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
