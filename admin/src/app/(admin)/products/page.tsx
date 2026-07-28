"use client";
import React, { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Badge from "@/components/ui/badge/Badge";
import { PencilIcon, TrashBinIcon, PlusIcon, ListIcon } from "@/icons";
import { productsApi } from "@/lib/resources/products";
import { customersApi } from "@/lib/resources/customers";
import { Product, ProcessStage, Customer } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

const emptyForm = { code: "", name: "", customer: "", unit: "sản phẩm", standardPrice: "0" };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [stageProduct, setStageProduct] = useState<Product | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([productsApi.list({ search: search || undefined }), customersApi.list()]);
      setProducts(p);
      setCustomers(c);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được danh sách mẫu hàng");
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

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      code: p.code,
      name: p.name,
      customer: p.customer._id,
      unit: p.unit || "sản phẩm",
      standardPrice: String(p.standardPrice || 0),
    });
    setError(null);
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, standardPrice: Number(form.standardPrice) };
      if (editing) {
        await productsApi.update(editing._id, {
          name: payload.name,
          unit: payload.unit,
          standardPrice: payload.standardPrice,
        });
      } else {
        if (!payload.customer) {
          setError("Vui lòng chọn khách hàng");
          setSaving(false);
          return;
        }
        await productsApi.create(payload);
      }
      setIsOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu mẫu hàng thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: Product) {
    if (!confirm(`Xoá mẫu hàng "${p.name}"?`)) return;
    try {
      await productsApi.remove(p._id);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Xoá thất bại");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Mẫu hàng</h1>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Mã hàng gắn với khách hàng, kèm công đoạn và đơn giá
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Tìm theo tên hoặc mã..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button size="sm" startIcon={<PlusIcon />} onClick={openCreate}>
            Thêm mẫu hàng
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Mã hàng</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Tên hàng</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Khách hàng</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Đơn giá chuẩn</TableCell>
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
              {!loading && products.length === 0 && (
                <TableRow>
                  <TableCell className="py-6 px-5 text-center text-gray-400" colSpan={6}>Chưa có mẫu hàng nào</TableCell>
                </TableRow>
              )}
              {products.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="py-3 px-5 font-medium text-gray-800 text-theme-sm dark:text-white/90">{p.code}</TableCell>
                  <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">{p.name}</TableCell>
                  <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">{p.customer?.name}</TableCell>
                  <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">{formatCurrency(p.standardPrice)}</TableCell>
                  <TableCell className="py-3 px-5">
                    <Badge size="sm" color={p.active ? "success" : "light"}>{p.active ? "Hoạt động" : "Ngừng"}</Badge>
                  </TableCell>
                  <TableCell className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setStageProduct(p)} className="text-gray-500 hover:text-brand-500 dark:text-gray-400" title="Công đoạn & đơn giá">
                        <ListIcon />
                      </button>
                      <button onClick={() => openEdit(p)} className="text-gray-500 hover:text-brand-500 dark:text-gray-400">
                        <PencilIcon />
                      </button>
                      <button onClick={() => handleDelete(p)} className="text-gray-500 hover:text-error-500 dark:text-gray-400">
                        <TrashBinIcon />
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
            {editing ? "Sửa mẫu hàng" : "Thêm mẫu hàng"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
                {error}
              </div>
            )}
            <div>
              <Label>Mã hàng {!editing && <span className="text-error-500">*</span>}</Label>
              <Input placeholder="MH001" value={form.code} disabled={!!editing} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <Label>Tên hàng <span className="text-error-500">*</span></Label>
              <Input placeholder="Áo sơ mi nam" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Khách hàng {!editing && <span className="text-error-500">*</span>}</Label>
              {editing ? (
                <Input value={editing.customer.name} disabled />
              ) : (
                <Select
                  placeholder="Chọn khách hàng"
                  options={customers.map((c) => ({ value: c._id, label: `${c.code} — ${c.name}` }))}
                  onChange={(value) => setForm({ ...form, customer: value })}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Đơn vị tính</Label>
                <Input placeholder="áo, cái..." value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div>
                <Label>Đơn giá chuẩn</Label>
                <Input type="number" value={form.standardPrice} onChange={(e) => setForm({ ...form, standardPrice: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</Button>
            </div>
          </form>
        </div>
      </Modal>

      {stageProduct && (
        <StageManagerModal
          product={stageProduct}
          onClose={() => setStageProduct(null)}
        />
      )}
    </div>
  );
}

function StageManagerModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [stages, setStages] = useState<ProcessStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await productsApi.listStages(product._id);
      setStages(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được công đoạn");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product._id]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !price) return;
    setSaving(true);
    setError(null);
    try {
      await productsApi.createStage(product._id, { name, unitPrice: Number(price) });
      setName("");
      setPrice("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Thêm công đoạn thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePrice(stage: ProcessStage) {
    try {
      await productsApi.updateStage(product._id, stage._id, { unitPrice: Number(editingPrice) });
      setEditingPriceId(null);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Cập nhật đơn giá thất bại");
    }
  }

  async function handleRemove(stage: ProcessStage) {
    if (!confirm(`Xoá công đoạn "${stage.name}"?`)) return;
    try {
      await productsApi.removeStage(product._id, stage._id);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Xoá thất bại");
    }
  }

  return (
    <Modal isOpen onClose={onClose} className="max-w-lg m-4">
      <div className="p-6">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          Công đoạn & đơn giá
        </h3>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          {product.code} — {product.name}
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
            {error}
          </div>
        )}

        <div className="space-y-3 mb-5 max-h-64 overflow-y-auto">
          {loading && <p className="text-sm text-gray-400">Đang tải...</p>}
          {!loading && stages.length === 0 && <p className="text-sm text-gray-400">Chưa có công đoạn nào</p>}
          {stages.map((s) => (
            <div key={s._id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 dark:border-gray-800">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.name}</span>
              {editingPriceId === s._id ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="!h-9 !w-28"
                    value={editingPrice}
                    onChange={(e) => setEditingPrice(e.target.value)}
                  />
                  <button onClick={() => handleUpdatePrice(s)} className="text-brand-500 text-sm font-medium">Lưu</button>
                  <button onClick={() => setEditingPriceId(null)} className="text-gray-400 text-sm">Huỷ</button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{formatCurrency(s.unitPrice)}</span>
                  <button
                    onClick={() => {
                      setEditingPriceId(s._id);
                      setEditingPrice(String(s.unitPrice));
                    }}
                    className="text-gray-500 hover:text-brand-500 dark:text-gray-400"
                  >
                    <PencilIcon />
                  </button>
                  <button onClick={() => handleRemove(s)} className="text-gray-500 hover:text-error-500 dark:text-gray-400">
                    <TrashBinIcon />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAdd} className="flex items-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <div className="flex-1">
            <Label>Tên công đoạn mới</Label>
            <Input placeholder="Cắt, May thân, Đóng gói..." value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="w-32">
            <Label>Đơn giá</Label>
            <Input type="number" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <Button type="submit" size="sm" disabled={saving}>Thêm</Button>
        </form>
      </div>
    </Modal>
  );
}
