"use client";
import React, { useEffect, useState } from "react";
import { Tabs, Table as AntTable, notification } from "antd";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Badge from "@/components/ui/badge/Badge";
import { PlusIcon, TrashBinIcon, EyeIcon, LockIcon, UnlockIcon } from "@/icons";
import { useConfirmDialog } from "@/components/ui/confirm-dialog/ConfirmDialogProvider";
import { ordersApi } from "@/lib/resources/orders";
import { customersApi } from "@/lib/resources/customers";
import { productsApi } from "@/lib/resources/products";
import { Order, Customer, Product, StockSummaryRow } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

type DetailRow = { product: string; productLabel: string; quantity: string };

export default function OrdersPage() {
  const confirmDialog = useConfirmDialog();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"" | "nhap" | "xuat">("");
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [viewing, setViewing] = useState<Order | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [o, c] = await Promise.all([
        ordersApi.list(typeFilter ? { type: typeFilter } : undefined),
        customersApi.list(),
      ]);
      setOrders(o);
      setCustomers(c);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  async function openView(order: Order) {
    const full = await ordersApi.get(order._id);
    setViewing(full);
  }

  async function handleToggleActive(o: Order) {
    if (o.active) {
      const ok = await confirmDialog({
        title: "Xác nhận vô hiệu hoá",
        message: `Vô hiệu hoá phiếu ${o.code}?`,
        confirmText: "Vô hiệu hoá",
        danger: true,
      });
      if (!ok) return;
    }
    try {
      if (o.active) {
        await ordersApi.remove(o._id);
      } else {
        await ordersApi.update(o._id, { active: true });
      }
      await load();
    } catch (err) {
      notification.error({ message: err instanceof ApiError ? err.message : "Cập nhật trạng thái thất bại" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Nhập / Xuất</h1>
        <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
          Nhập = khách giao vải / bán thành phẩm vào xưởng · Xuất = xưởng trả hàng thành phẩm cho khách. Tồn = số đang gia công dở.
        </p>
      </div>

      <Tabs
        defaultActiveKey="list"
        items={[
          {
            key: "list",
            label: "Phiếu Nhập / Xuất",
            children: (
              <div className="space-y-6">
                <div className="flex items-center justify-end gap-3">
                  <div className="flex rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                    {[
                      { v: "", l: "Tất cả" },
                      { v: "nhap", l: "Nhập" },
                      { v: "xuat", l: "Xuất" },
                    ].map((t) => (
                      <button
                        key={t.v}
                        onClick={() => setTypeFilter(t.v as "" | "nhap" | "xuat")}
                        className={`px-4 py-2 text-sm font-medium ${
                          typeFilter === t.v
                            ? "bg-brand-500 text-white"
                            : "bg-white text-gray-600 dark:bg-gray-900 dark:text-gray-400"
                        }`}
                      >
                        {t.l}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" startIcon={<PlusIcon />} onClick={() => setIsOpen(true)}>
                    Tạo phiếu
                  </Button>
                </div>

                {error && <div className="text-error-500 text-sm">{error}</div>}

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="max-w-full overflow-x-auto">
                    <Table>
                      <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
                        <TableRow>
                          <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Mã phiếu</TableCell>
                          <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Loại</TableCell>
                          <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Khách hàng</TableCell>
                          <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Ngày</TableCell>
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
                        {!loading && orders.length === 0 && (
                          <TableRow>
                            <TableCell className="py-6 px-5 text-center text-gray-400" colSpan={6}>Chưa có phiếu nào</TableCell>
                          </TableRow>
                        )}
                        {orders.map((o) => (
                          <TableRow key={o._id}>
                            <TableCell className="py-3 px-5 font-medium text-gray-800 text-theme-sm dark:text-white/90">{o.code}</TableCell>
                            <TableCell className="py-3 px-5">
                              <Badge size="sm" color={o.type === "nhap" ? "info" : "warning"}>
                                {o.type === "nhap" ? "Nhập" : "Xuất"}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">{o.customer?.name}</TableCell>
                            <TableCell className="py-3 px-5 text-gray-500 text-theme-xs dark:text-gray-400">{formatDate(o.date)}</TableCell>
                            <TableCell className="py-3 px-5">
                              <Badge size="sm" color={o.active ? "success" : "light"}>{o.active ? "Hoạt động" : "Ngừng"}</Badge>
                            </TableCell>
                            <TableCell className="py-3 px-5">
                              <div className="flex items-center gap-3">
                                <button onClick={() => openView(o)} className="text-gray-500 hover:text-brand-500 dark:text-gray-400">
                                  <EyeIcon />
                                </button>
                                <button
                                  onClick={() => handleToggleActive(o)}
                                  title={o.active ? "Vô hiệu hoá" : "Kích hoạt lại"}
                                  className={
                                    o.active
                                      ? "text-gray-500 hover:text-error-500 dark:text-gray-400"
                                      : "text-gray-500 hover:text-success-500 dark:text-gray-400"
                                  }
                                >
                                  {o.active ? <LockIcon /> : <UnlockIcon />}
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "stock",
            label: "Tồn kho",
            children: <StockPanel customers={customers} />,
          },
        ]}
      />

      {isOpen && (
        <CreateOrderModal
          customers={customers.filter((c) => c.active)}
          onClose={() => setIsOpen(false)}
          onCreated={() => {
            setIsOpen(false);
            load();
          }}
        />
      )}

      {viewing && <ViewOrderModal order={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function StockPanel({ customers }: { customers: Customer[] }) {
  const [customer, setCustomer] = useState("");
  const [rows, setRows] = useState<StockSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customer) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    ordersApi
      .stockSummary(customer)
      .then((res) => setRows(res.rows))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Không tải được tồn kho"))
      .finally(() => setLoading(false));
  }, [customer]);

  const columns = [
    { title: "Tên hàng", dataIndex: ["product", "name"], key: "name" },
    { title: "Đã nhập", dataIndex: "imported", key: "imported", align: "right" as const, render: (v: number) => formatNumber(v) },
    { title: "Đã xuất", dataIndex: "exported", key: "exported", align: "right" as const, render: (v: number) => formatNumber(v) },
    {
      title: "Còn lại",
      dataIndex: "remaining",
      key: "remaining",
      align: "right" as const,
      render: (v: number) => <span className={`font-medium ${v < 0 ? "text-error-500" : ""}`}>{formatNumber(v)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <Select
        placeholder="Chọn khách hàng để xem tồn kho"
        className="!w-64"
        value={customer}
        options={customers.map((c) => ({ value: c._id, label: `${c.code} — ${c.name}` }))}
        onChange={setCustomer}
      />

      {error && <div className="text-error-500 text-sm">{error}</div>}

      {!customer && <p className="text-sm text-gray-400">Chọn khách hàng để xem tồn kho theo từng mã hàng.</p>}

      {customer && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-2">
          <AntTable
            rowKey={(r) => r.product._id}
            loading={loading}
            columns={columns}
            dataSource={rows}
            pagination={false}
            locale={{ emptyText: "Khách hàng này chưa có phiếu nhập/xuất nào" }}
          />
        </div>
      )}
    </div>
  );
}

function CreateOrderModal({
  customers,
  onClose,
  onCreated,
}: {
  customers: Customer[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [type, setType] = useState<"nhap" | "xuat">("nhap");
  const [customer, setCustomer] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<DetailRow[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!customer) {
      setProducts([]);
      return;
    }
    productsApi.list({ customer, active: true }).then(setProducts).catch(() => setProducts([]));
  }, [customer]);

  // Khi xuat hang: tai ton kho kha dung cho tung ma hang dang co trong danh sach dong de canh bao
  useEffect(() => {
    if (type !== "xuat" || !customer) return;
    const productIds = [...new Set(rows.map((r) => r.product).filter(Boolean))];
    productIds
      .filter((id) => !(id in stockMap))
      .forEach((id) => {
        ordersApi
          .stock(customer, id)
          .then((res) => setStockMap((prev) => ({ ...prev, [id]: res.remaining })))
          .catch(() => {});
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, customer, rows]);

  function addRow() {
    if (products.length === 0) return;
    const p = products[0];
    setRows([...rows, { product: p._id, productLabel: p.name, quantity: "1" }]);
  }

  function updateRow(idx: number, patch: Partial<DetailRow>) {
    setRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeRow(idx: number) {
    setRows(rows.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) {
      setError("Vui lòng chọn khách hàng");
      return;
    }
    if (type === "xuat") {
      const requestedByProduct = new Map<string, number>();
      rows.forEach((r) => {
        requestedByProduct.set(r.product, (requestedByProduct.get(r.product) || 0) + Number(r.quantity || 0));
      });
      for (const [productId, requestedQty] of requestedByProduct) {
        const remaining = stockMap[productId];
        if (remaining !== undefined && requestedQty > remaining) {
          const p = products.find((pp) => pp._id === productId);
          setError(`Xuất vượt quá tồn kho mẫu hàng ${p ? p.name : productId} (còn lại: ${remaining})`);
          return;
        }
      }
    }
    setSaving(true);
    setError(null);
    try {
      await ordersApi.create({
        type,
        customer,
        date,
        note,
        details: rows.map((r) => ({
          product: r.product,
          quantity: Number(r.quantity),
        })),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tạo phiếu thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} className="max-w-2xl m-4">
      <div className="p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">Tạo phiếu nhập / xuất</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Loại phiếu</Label>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden h-11">
                <button
                  type="button"
                  onClick={() => setType("nhap")}
                  className={`flex-1 text-sm font-medium ${type === "nhap" ? "bg-brand-500 text-white" : "bg-transparent text-gray-600 dark:text-gray-400"}`}
                >
                  Nhập
                </button>
                <button
                  type="button"
                  onClick={() => setType("xuat")}
                  className={`flex-1 text-sm font-medium ${type === "xuat" ? "bg-brand-500 text-white" : "bg-transparent text-gray-600 dark:text-gray-400"}`}
                >
                  Xuất
                </button>
              </div>
            </div>
            <div>
              <Label>Khách hàng <span className="text-error-500">*</span></Label>
              <Select
                placeholder="Chọn khách hàng"
                options={customers.map((c) => ({ value: c._id, label: `${c.code} — ${c.name}` }))}
                onChange={setCustomer}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Ngày</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Ghi chú</Label>
              <Input placeholder="Ghi chú..." value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="mb-0">Chi tiết mặt hàng</Label>
              <Button type="button" size="sm" variant="outline" onClick={addRow} disabled={!customer || products.length === 0}>
                + Thêm dòng
              </Button>
            </div>
            {!customer && <p className="text-sm text-gray-400">Chọn khách hàng để thêm mặt hàng</p>}
            {customer && rows.length > 0 && (
              <div className="mb-1.5 flex items-center gap-2 px-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                <span className="flex-1">Mẫu hàng</span>
                <span className="w-28 text-right">Số lượng</span>
                <span className="w-6" />
              </div>
            )}
            <div className="space-y-2">
              {rows.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <select
                      className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      value={r.product}
                      onChange={(e) => {
                        const p = products.find((pp) => pp._id === e.target.value);
                        updateRow(idx, { product: e.target.value, productLabel: p ? p.name : "" });
                      }}
                    >
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {type === "xuat" && r.product in stockMap && (
                      <span className={`mt-1 block text-xs ${stockMap[r.product] < Number(r.quantity || 0) ? "text-error-500" : "text-gray-400"}`}>
                        Tồn kho khả dụng: {formatNumber(stockMap[r.product])}
                      </span>
                    )}
                  </div>
                  <Input
                    type="number"
                    className="!w-28 text-right"
                    placeholder="Số lượng"
                    value={r.quantity}
                    onChange={(e) => updateRow(idx, { quantity: e.target.value })}
                  />
                  <button type="button" onClick={() => removeRow(idx)} className="text-gray-500 hover:text-error-500 dark:text-gray-400">
                    <TrashBinIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Huỷ</Button>
            <Button type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Tạo phiếu"}</Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function ViewOrderModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const details = order.details || [];
  const total = details.reduce((sum, d) => sum + (d.amount ?? d.quantity * d.unitPrice), 0);

  return (
    <Modal isOpen onClose={onClose} className="max-w-xl m-4">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{order.code}</h3>
          <Badge size="sm" color={order.type === "nhap" ? "info" : "warning"}>
            {order.type === "nhap" ? "Nhập" : "Xuất"}
          </Badge>
        </div>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          {order.customer?.name} — {formatDate(order.date)}
        </p>

        <div className="space-y-2 mb-4">
          {details.length === 0 && <p className="text-sm text-gray-400">Chưa có chi tiết mặt hàng</p>}
          {details.map((d) => {
            const p = typeof d.product === "string" ? null : d.product;
            return (
              <div key={d._id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800">
                <span className="text-gray-700 dark:text-gray-300">
                  {p ? p.name : "—"}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {formatNumber(d.quantity)} × {formatCurrency(d.unitPrice)}
                </span>
              </div>
            );
          })}
        </div>

        {details.length > 0 && (
          <div className="flex justify-between border-t border-gray-200 pt-3 text-sm font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90">
            <span>Tổng cộng</span>
            <span>{formatCurrency(total)}</span>
          </div>
        )}

        {order.note && <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Ghi chú: {order.note}</p>}
      </div>
    </Modal>
  );
}
