"use client";
import React, { useEffect, useState } from "react";
import { Table as AntTable, notification } from "antd";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Badge from "@/components/ui/badge/Badge";
import { PencilIcon, TrashBinIcon, PlusIcon, ListIcon } from "@/icons";
import { useConfirmDialog } from "@/components/ui/confirm-dialog/ConfirmDialogProvider";
import { productsApi } from "@/lib/resources/products";
import { customersApi } from "@/lib/resources/customers";
import { Product, ProcessStage, Customer } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

const emptyForm = { name: "", customer: "", unit: "sản phẩm", standardPrice: "0" };

type StageRow = { name: string; price: string };
type FormErrors = { name?: string; customer?: string };
type StageRowErrors = Record<number, { name?: string; price?: string }>;

function emptyStageRow(): StageRow {
  return { name: "", price: "" };
}

// Do rong cot dung chung giua bang mau hang va bang cong doan mo rong ben duoi,
// de 2 bang thang hang voi nhau khi expand
const PRODUCT_COL_WIDTH = { customer: 200, price: 140, status: 130 };

export default function ProductsPage() {
  const confirmDialog = useConfirmDialog();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [stageRows, setStageRows] = useState<StageRow[]>([emptyStageRow()]);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [stageRowErrors, setStageRowErrors] = useState<StageRowErrors>({});

  const [stageProduct, setStageProduct] = useState<Product | null>(null);
  const [stagesByProduct, setStagesByProduct] = useState<Record<string, ProcessStage[]>>({});
  const [stagesLoading, setStagesLoading] = useState<Record<string, boolean>>({});

  async function handleExpand(expanded: boolean, product: Product) {
    if (!expanded || stagesByProduct[product._id]) return;
    setStagesLoading((prev) => ({ ...prev, [product._id]: true }));
    try {
      const data = await productsApi.listStages(product._id);
      setStagesByProduct((prev) => ({ ...prev, [product._id]: data }));
    } catch {
      // bo qua, khu vuc mo rong se hien "khong tai duoc"
    } finally {
      setStagesLoading((prev) => ({ ...prev, [product._id]: false }));
    }
  }

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
    setStageRows([emptyStageRow()]);
    setFieldErrors({});
    setStageRowErrors({});
    setError(null);
    setIsOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      customer: p.customer?._id ?? "",
      unit: p.unit || "sản phẩm",
      standardPrice: String(p.standardPrice || 0),
    });
    setFieldErrors({});
    setStageRowErrors({});
    setError(null);
    setIsOpen(true);
  }

  function addStageRow() {
    setStageRows((rows) => [...rows, emptyStageRow()]);
  }

  function removeStageRow(idx: number) {
    setStageRows((rows) => rows.filter((_, i) => i !== idx));
  }

  function updateStageRow(idx: number, patch: Partial<StageRow>) {
    setStageRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function validate(): boolean {
    const errors: FormErrors = {};
    if (!form.name.trim()) errors.name = "Vui lòng nhập tên hàng";
    if (!editing && !form.customer) errors.customer = "Vui lòng chọn khách hàng";

    const rowErrors: StageRowErrors = {};
    if (!editing) {
      stageRows.forEach((row, idx) => {
        const hasName = row.name.trim() !== "";
        const hasPrice = row.price.trim() !== "";
        if (hasName !== hasPrice) {
          rowErrors[idx] = {
            name: !hasName ? "Nhập tên công đoạn" : undefined,
            price: !hasPrice ? "Nhập đơn giá" : undefined,
          };
        }
      });
    }

    setFieldErrors(errors);
    setStageRowErrors(rowErrors);
    return !errors.name && !errors.customer && Object.keys(rowErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await productsApi.update(editing._id, {
          name: form.name,
          unit: form.unit,
          standardPrice: Number(form.standardPrice),
        });
      } else {
        const stages = stageRows
          .filter((r) => r.name.trim() !== "" && r.price.trim() !== "")
          .map((r) => ({ name: r.name.trim(), unitPrice: Number(r.price) }));
        await productsApi.create({
          name: form.name,
          customer: form.customer,
          unit: form.unit,
          standardPrice: Number(form.standardPrice),
          stages,
        });
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
    const ok = await confirmDialog({ message: `Xoá mẫu hàng "${p.name}"?`, danger: true });
    if (!ok) return;
    try {
      await productsApi.remove(p._id);
      await load();
    } catch (err) {
      notification.error({ message: err instanceof ApiError ? err.message : "Xoá thất bại" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Mẫu hàng</h1>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Mẫu hàng gắn với khách hàng, kèm công đoạn và đơn giá
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Tìm theo tên..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button size="sm" startIcon={<PlusIcon />} onClick={openCreate}>
            Thêm mẫu hàng
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto p-2">
          <AntTable
            rowKey="_id"
            loading={loading}
            dataSource={products}
            pagination={false}
            tableLayout="fixed"
            locale={{ emptyText: "Chưa có mẫu hàng nào" }}
            expandable={{
              onExpand: handleExpand,
              expandedRowRender: (p: Product) => {
                if (stagesLoading[p._id]) {
                  return <div className="py-3 text-sm text-gray-400">Đang tải công đoạn...</div>;
                }
                const stages = stagesByProduct[p._id] || [];
                if (stages.length === 0) {
                  return <div className="py-3 text-sm text-gray-400">Chưa có công đoạn nào</div>;
                }
                return (
                  <AntTable
                    rowKey="_id"
                    size="small"
                    pagination={false}
                    tableLayout="fixed"
                    dataSource={stages}
                    columns={[
                      { title: "Tên công đoạn", dataIndex: "name", key: "name" },
                      // cot rong de thang hang voi cot "Khach hang" cua bang cha
                      { title: "", key: "spacer", width: PRODUCT_COL_WIDTH.customer },
                      {
                        title: "Đơn giá",
                        dataIndex: "unitPrice",
                        key: "unitPrice",
                        width: PRODUCT_COL_WIDTH.price,
                        align: "right" as const,
                        render: (v: number) => formatCurrency(v),
                      },
                      {
                        title: "Trạng thái",
                        dataIndex: "active",
                        key: "active",
                        width: PRODUCT_COL_WIDTH.status,
                        render: (v: boolean) => (
                          <Badge size="sm" color={v ? "success" : "light"}>{v ? "Hoạt động" : "Ngừng"}</Badge>
                        ),
                      },
                      // cot rong de bu vao cho cot "actions" (110px) cua bang cha, giup cot linh hoat
                      // "Ten cong doan" tinh dung do rong bang voi "Ten hang"
                      { title: "", key: "spacer-end", width: 110 },
                    ]}
                  />
                );
              },
            }}
            columns={[
              { title: "Tên hàng", dataIndex: "name", key: "name" },
              {
                title: "Khách hàng",
                key: "customer",
                width: PRODUCT_COL_WIDTH.customer,
                render: (_: unknown, p: Product) => p.customer?.name,
              },
              {
                title: "Đơn giá chuẩn",
                dataIndex: "standardPrice",
                key: "standardPrice",
                width: PRODUCT_COL_WIDTH.price,
                align: "right" as const,
                render: (v: number) => formatCurrency(v),
              },
              {
                title: "Trạng thái",
                dataIndex: "active",
                key: "active",
                width: PRODUCT_COL_WIDTH.status,
                render: (v: boolean) => <Badge size="sm" color={v ? "success" : "light"}>{v ? "Hoạt động" : "Ngừng"}</Badge>,
              },
              {
                title: "",
                key: "actions",
                width: 110,
                render: (_: unknown, p: Product) => (
                  <div className="flex items-center gap-3">
                    <button onClick={() => setStageProduct(p)} className="text-gray-500 hover:text-brand-500 dark:text-gray-400" title="Quản lý công đoạn & đơn giá">
                      <ListIcon />
                    </button>
                    <button onClick={() => openEdit(p)} title="Sửa" className="text-gray-500 hover:text-brand-500 dark:text-gray-400">
                      <PencilIcon />
                    </button>
                    <button onClick={() => handleDelete(p)} title="Xoá" className="text-gray-500 hover:text-error-500 dark:text-gray-400">
                      <TrashBinIcon />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} className="max-w-lg m-4">
        <div className="p-6 max-h-[85vh] overflow-y-auto">
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
              <Label>Tên hàng <span className="text-error-500">*</span></Label>
              <Input
                placeholder="Áo sơ mi nam"
                value={form.name}
                error={!!fieldErrors.name}
                hint={fieldErrors.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Khách hàng {!editing && <span className="text-error-500">*</span>}</Label>
              {editing ? (
                <Input value={editing.customer?.name ?? "(khách hàng đã xoá)"} disabled />
              ) : (
                <Select
                  placeholder="Chọn khách hàng"
                  value={form.customer}
                  error={!!fieldErrors.customer}
                  hint={fieldErrors.customer}
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

            {!editing && (
              <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
                <Label>Công đoạn & đơn giá</Label>
                <div className="space-y-3">
                  {stageRows.map((row, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="Cắt, May thân, Đóng gói..."
                          value={row.name}
                          error={!!stageRowErrors[idx]?.name}
                          hint={stageRowErrors[idx]?.name}
                          onChange={(e) => updateStageRow(idx, { name: e.target.value })}
                        />
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          placeholder="Đơn giá"
                          value={row.price}
                          error={!!stageRowErrors[idx]?.price}
                          hint={stageRowErrors[idx]?.price}
                          onChange={(e) => updateStageRow(idx, { price: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStageRow(idx)}
                        className="mt-2.5 text-gray-400 hover:text-error-500"
                        title="Xoá công đoạn này"
                      >
                        <TrashBinIcon />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addStageRow}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600"
                >
                  <PlusIcon /> Thêm công đoạn
                </button>
              </div>
            )}

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
          onClose={() => {
            // xoa cache de dong mo rong hien lai du lieu moi nhat sau khi sua trong modal
            setStagesByProduct((prev) => {
              const next = { ...prev };
              delete next[stageProduct._id];
              return next;
            });
            setStageProduct(null);
          }}
        />
      )}
    </div>
  );
}

function StageManagerModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const confirmDialog = useConfirmDialog();
  const [stages, setStages] = useState<ProcessStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; price?: string }>({});
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingPrice, setEditingPrice] = useState("");
  const [editingErrors, setEditingErrors] = useState<{ name?: string; price?: string }>({});

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
    const errors: { name?: string; price?: string } = {};
    if (!name.trim()) errors.name = "Nhập tên công đoạn";
    if (!price.trim()) errors.price = "Nhập đơn giá";
    setFieldErrors(errors);
    if (errors.name || errors.price) return;

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

  async function handleUpdateStage(stage: ProcessStage) {
    const errors: { name?: string; price?: string } = {};
    if (!editingName.trim()) errors.name = "Nhập tên công đoạn";
    if (!editingPrice.trim()) errors.price = "Nhập đơn giá";
    setEditingErrors(errors);
    if (errors.name || errors.price) return;

    try {
      await productsApi.updateStage(product._id, stage._id, { name: editingName.trim(), unitPrice: Number(editingPrice) });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cập nhật công đoạn thất bại");
    }
  }

  async function handleRemove(stage: ProcessStage) {
    const ok = await confirmDialog({ message: `Xoá công đoạn "${stage.name}"?`, danger: true });
    if (!ok) return;
    try {
      await productsApi.removeStage(product._id, stage._id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xoá thất bại");
    }
  }

  return (
    <Modal isOpen onClose={onClose} className="max-w-lg m-4">
      <div className="p-6">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          Công đoạn & đơn giá
        </h3>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          {product.name}
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
            {error}
          </div>
        )}

        <div className="space-y-3 mb-5 max-h-64 overflow-y-auto">
          {loading && <p className="text-sm text-gray-400">Đang tải...</p>}
          {!loading && stages.length === 0 && <p className="text-sm text-gray-400">Chưa có công đoạn nào</p>}
          {stages.map((s) =>
            editingId === s._id ? (
              <div key={s._id} className="rounded-lg border border-gray-200 px-4 py-2.5 dark:border-gray-800">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      className="!h-9"
                      value={editingName}
                      error={!!editingErrors.name}
                      hint={editingErrors.name}
                      onChange={(e) => setEditingName(e.target.value)}
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      className="!h-9"
                      value={editingPrice}
                      error={!!editingErrors.price}
                      hint={editingErrors.price}
                      onChange={(e) => setEditingPrice(e.target.value)}
                    />
                  </div>
                  <button onClick={() => handleUpdateStage(s)} className="mt-2 text-brand-500 text-sm font-medium">Lưu</button>
                  <button onClick={() => setEditingId(null)} className="mt-2 text-gray-400 text-sm">Huỷ</button>
                </div>
              </div>
            ) : (
              <div key={s._id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 dark:border-gray-800">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{formatCurrency(s.unitPrice)}</span>
                  <button
                    onClick={() => {
                      setEditingId(s._id);
                      setEditingName(s.name);
                      setEditingPrice(String(s.unitPrice));
                      setEditingErrors({});
                    }}
                    title="Sửa"
                    className="text-gray-500 hover:text-brand-500 dark:text-gray-400"
                  >
                    <PencilIcon />
                  </button>
                  <button onClick={() => handleRemove(s)} title="Xoá" className="text-gray-500 hover:text-error-500 dark:text-gray-400">
                    <TrashBinIcon />
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        <form onSubmit={handleAdd} className="flex items-start gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <div className="flex-1">
            <Label>Tên công đoạn mới</Label>
            <Input
              placeholder="Cắt, May thân, Đóng gói..."
              value={name}
              error={!!fieldErrors.name}
              hint={fieldErrors.name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="w-32">
            <Label>Đơn giá</Label>
            <Input
              type="number"
              placeholder="0"
              value={price}
              error={!!fieldErrors.price}
              hint={fieldErrors.price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" className="mt-6.5" disabled={saving}>Thêm</Button>
        </form>
      </div>
    </Modal>
  );
}
