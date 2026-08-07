"use client";
import React, { useEffect, useRef, useState } from "react";
import { Tabs, Table as AntTable, notification } from "antd";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Badge from "@/components/ui/badge/Badge";
import DateRangeFilter from "@/components/common/DateRangeFilter";
import { PlusIcon, TrashBinIcon } from "@/icons";
import { useConfirmDialog } from "@/components/ui/confirm-dialog/ConfirmDialogProvider";
import { defectsApi } from "@/lib/resources/defects";
import { productsApi } from "@/lib/resources/products";
import { customersApi } from "@/lib/resources/customers";
import { workersApi } from "@/lib/resources/workers";
import { DefectComparisonRow, DefectReport, Product, ProcessStage, Customer, Worker } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { formatNumber, formatDateTime, formatDateRangeLabel, defaultDateRange } from "@/lib/format";
import { getSocket } from "@/lib/socket";

const TYPE_LABEL: Record<DefectReport["type"], string> = {
  hong: "Hàng hỏng",
  tra_lai: "Khách trả lại",
};

const TYPE_COLOR: Record<DefectReport["type"], "error" | "warning"> = {
  hong: "error",
  tra_lai: "warning",
};

const emptyForm = {
  product: "",
  customer: "",
  processStage: "",
  worker: "",
  quantity: "",
  type: "hong" as DefectReport["type"],
  reason: "",
};

export default function DefectsPage() {
  const confirmDialog = useConfirmDialog();
  const [defects, setDefects] = useState<DefectReport[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [{ from, to }, setRange] = useState(defaultDateRange);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState({ totalHong: 0, totalTraLai: 0 });

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [stageOptions, setStageOptions] = useState<ProcessStage[]>([]);
  const [workerOptions, setWorkerOptions] = useState<Worker[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [d, p, c, summary] = await Promise.all([
        defectsApi.list({ type: typeFilter || undefined }),
        productsApi.list(),
        customersApi.list(),
        defectsApi.summary(from, to),
      ]);
      setDefects(d);
      setProducts(p);
      setCustomers(c);
      setTotals({ totalHong: summary.totalHong, totalTraLai: summary.totalTraLai });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được danh sách hàng lỗi/hoàn trả");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, from, to]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleNewDefect = (defect: DefectReport) => {
      notification.info({
        title: TYPE_LABEL[defect.type],
        description: `${defect.product?.name ?? "(mẫu hàng đã xoá)"} — ${formatNumber(defect.quantity)} sp`,
        placement: "topRight",
      });
      loadRef.current();
    };
    const handleUpdatedDefect = () => loadRef.current();
    socket.on("defect:new", handleNewDefect);
    socket.on("defect:updated", handleUpdatedDefect);
    return () => {
      socket.off("defect:new", handleNewDefect);
      socket.off("defect:updated", handleUpdatedDefect);
    };
  }, []);

  // Mẫu hàng => tải danh sách công đoạn của mẫu hàng đó
  useEffect(() => {
    if (!form.product) {
      setStageOptions([]);
      return;
    }
    productsApi.listStages(form.product).then(setStageOptions).catch(() => setStageOptions([]));
  }, [form.product]);

  // Công đoạn => tải công nhân từng làm công đoạn này của mẫu hàng, fallback toàn bộ danh sách
  useEffect(() => {
    if (!form.product || !form.processStage) {
      workersApi.list().then(setWorkerOptions).catch(() => setWorkerOptions([]));
      return;
    }
    defectsApi
      .workersForStage(form.product, form.processStage)
      .then((ws) => (ws.length > 0 ? setWorkerOptions(ws) : workersApi.list().then(setWorkerOptions)))
      .catch(() => setWorkerOptions([]));
  }, [form.product, form.processStage]);

  function openCreate() {
    setForm(emptyForm);
    setFormError(null);
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product || !form.customer || !form.quantity) {
      setFormError("Vui lòng chọn mẫu hàng, khách hàng và nhập số lượng");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await defectsApi.create({
        product: form.product,
        customer: form.customer,
        processStage: form.processStage || undefined,
        worker: form.worker || undefined,
        quantity: Number(form.quantity),
        type: form.type,
        reason: form.reason || undefined,
      });
      setIsOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Ghi nhận thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(d: DefectReport) {
    const ok = await confirmDialog({ message: "Xoá bản ghi này?", danger: true });
    if (!ok) return;
    try {
      await defectsApi.remove(d._id);
      await load();
    } catch (err) {
      notification.error({ message: err instanceof ApiError ? err.message : "Xoá thất bại" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Hàng lỗi / Hoàn trả</h1>
        <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
          Thống kê riêng, không tự động trừ vào lương công nhân
        </p>
      </div>

      <Tabs
        defaultActiveKey="list"
        items={[
          {
            key: "list",
            label: "Danh sách",
            children: (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <DateRangeFilter from={from} to={to} onChange={setRange} />
                  <div className="flex flex-wrap items-center gap-3">
                    <Select
                      placeholder="Tất cả loại"
                      className="!w-48"
                      options={[
                        { value: "hong", label: "Hàng hỏng" },
                        { value: "tra_lai", label: "Khách trả lại" },
                      ]}
                      onChange={setTypeFilter}
                    />
                    <Button size="sm" startIcon={<PlusIcon />} onClick={openCreate}>
                      Ghi nhận
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Tổng hàng hỏng {formatDateRangeLabel(from, to)}</span>
                    <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{formatNumber(totals.totalHong)}</h4>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Tổng khách trả lại {formatDateRangeLabel(from, to)}</span>
                    <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{formatNumber(totals.totalTraLai)}</h4>
                  </div>
                </div>

                {error && <div className="text-error-500 text-sm">{error}</div>}

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="max-w-full overflow-x-auto">
                    <Table>
                      <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
                        <TableRow>
                          <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Mẫu hàng</TableCell>
                          <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Khách hàng</TableCell>
                          <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Công đoạn / Công nhân</TableCell>
                          <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Loại</TableCell>
                          <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Số lượng</TableCell>
                          <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Lý do</TableCell>
                          <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Ngày</TableCell>
                          <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{""}</TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {loading && (
                          <TableRow>
                            <TableCell className="py-6 px-5 text-center text-gray-400" colSpan={8}>Đang tải...</TableCell>
                          </TableRow>
                        )}
                        {!loading && defects.length === 0 && (
                          <TableRow>
                            <TableCell className="py-6 px-5 text-center text-gray-400" colSpan={8}>Chưa có bản ghi nào</TableCell>
                          </TableRow>
                        )}
                        {defects.map((d) => (
                          <TableRow key={d._id}>
                            <TableCell className="py-3 px-5 font-medium text-gray-800 text-theme-sm dark:text-white/90">{d.product?.name ?? "(mẫu hàng đã xoá)"}</TableCell>
                            <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">{d.customer?.name ?? "(khách hàng đã xoá)"}</TableCell>
                            <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">
                              {d.processStage || d.worker ? (
                                <>
                                  {d.processStage?.name}
                                  {d.processStage && d.worker ? " — " : ""}
                                  {d.worker ? `${d.worker.code} ${d.worker.name}` : ""}
                                </>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="py-3 px-5">
                              <Badge size="sm" color={TYPE_COLOR[d.type]}>{TYPE_LABEL[d.type]}</Badge>
                            </TableCell>
                            <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">{formatNumber(d.quantity)}</TableCell>
                            <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">{d.reason || "—"}</TableCell>
                            <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">{formatDateTime(d.reportedAt)}</TableCell>
                            <TableCell className="py-3 px-5">
                              <button onClick={() => handleDelete(d)} className="text-gray-500 hover:text-error-500 dark:text-gray-400">
                                <TrashBinIcon />
                              </button>
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
            key: "compare",
            label: "So sánh sản lượng",
            children: <ComparisonPanel products={products} />,
          },
        ]}
      />

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} className="max-w-md m-4">
        <div className="p-6">
          <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">Ghi nhận hàng lỗi / hoàn trả</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
                {formError}
              </div>
            )}
            <div>
              <Label>Loại <span className="text-error-500">*</span></Label>
              <Select
                placeholder="Chọn loại"
                defaultValue="hong"
                options={[
                  { value: "hong", label: "Hàng hỏng" },
                  { value: "tra_lai", label: "Khách trả lại" },
                ]}
                onChange={(value) => setForm({ ...form, type: value as DefectReport["type"] })}
              />
            </div>
            <div>
              <Label>Mẫu hàng <span className="text-error-500">*</span></Label>
              <Select
                placeholder="Chọn mẫu hàng"
                value={form.product}
                options={products.map((p) => ({ value: p._id, label: p.name }))}
                onChange={(value) => setForm({ ...form, product: value, processStage: "", worker: "" })}
              />
            </div>
            <div>
              <Label>Khách hàng <span className="text-error-500">*</span></Label>
              <Select
                placeholder="Chọn khách hàng"
                value={form.customer}
                options={customers.map((c) => ({ value: c._id, label: `${c.code} — ${c.name}` }))}
                onChange={(value) => setForm({ ...form, customer: value })}
              />
            </div>
            <div>
              <Label>Công đoạn (không bắt buộc)</Label>
              <Select
                placeholder={form.product ? "Chọn công đoạn" : "Chọn mẫu hàng trước"}
                value={form.processStage}
                disabled={!form.product}
                options={stageOptions.map((s) => ({ value: s._id, label: s.name }))}
                onChange={(value) => setForm({ ...form, processStage: value, worker: "" })}
              />
            </div>
            <div>
              <Label>Công nhân (không bắt buộc)</Label>
              <Select
                placeholder="Chọn công nhân"
                value={form.worker}
                options={workerOptions.map((w) => ({ value: w._id, label: `${w.code} — ${w.name}` }))}
                onChange={(value) => setForm({ ...form, worker: value })}
              />
            </div>
            <div>
              <Label>Số lượng <span className="text-error-500">*</span></Label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <Label>Lý do</Label>
              <Input placeholder="VD: lỗi đường may, sai màu..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
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

function ComparisonPanel({ products }: { products: Product[] }) {
  const [product, setProduct] = useState("");
  const [{ from, to }, setRange] = useState(defaultDateRange);
  const [rows, setRows] = useState<DefectComparisonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    defectsApi
      .comparison(product, from, to)
      .then((res) => setRows(res.rows))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Không tải được dữ liệu so sánh"))
      .finally(() => setLoading(false));
  }, [product, from, to]);

  // gop nhom hien thi theo cong doan bang rowSpan
  const sorted = [...rows].sort((a, b) => {
    const stageCmp = (a.processStage?.name || "").localeCompare(b.processStage?.name || "");
    if (stageCmp !== 0) return stageCmp;
    return (a.worker?.name || "").localeCompare(b.worker?.name || "");
  });
  // tinh rowSpan de gop cell "Cong doan" cho cac dong lien tiep cung 1 cong doan
  const spans: number[] = new Array(sorted.length).fill(1);
  for (let i = 0; i < sorted.length; ) {
    let j = i + 1;
    while (j < sorted.length && sorted[j].processStage?._id === sorted[i].processStage?._id) j++;
    spans[i] = j - i;
    for (let k = i + 1; k < j; k++) spans[k] = 0;
    i = j;
  }

  const columns = [
    {
      title: "Công đoạn",
      key: "processStage",
      render: (_: unknown, r: DefectComparisonRow) => r.processStage?.name || "—",
      onCell: (_: DefectComparisonRow, index?: number) => ({ rowSpan: index !== undefined ? spans[index] : 1 }),
    },
    {
      title: "Công nhân",
      key: "worker",
      render: (_: unknown, r: DefectComparisonRow) => (r.worker ? `${r.worker.code} — ${r.worker.name}` : "—"),
    },
    {
      title: "Kê khai",
      dataIndex: "declaredQuantity",
      key: "declaredQuantity",
      align: "right" as const,
      render: (v: number) => formatNumber(v),
    },
    {
      title: "Lỗi / Hoàn trả",
      dataIndex: "defectQuantity",
      key: "defectQuantity",
      align: "right" as const,
      render: (v: number) => <span className={v > 0 ? "text-error-500 font-medium" : ""}>{formatNumber(v)}</span>,
    },
    {
      title: "Chênh lệch",
      dataIndex: "difference",
      key: "difference",
      align: "right" as const,
      render: (v: number) => formatNumber(v),
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Chọn mẫu hàng → hệ thống thống kê theo từng công đoạn → từng công nhân, so sánh sản lượng kê khai và
        số lượng lỗi/hoàn trả đã ghi nhận (chỉ tính các bản ghi có gắn công đoạn + công nhân).
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Select
          placeholder="Chọn mẫu hàng"
          className="!w-64"
          value={product}
          options={products.map((p) => ({ value: p._id, label: p.name }))}
          onChange={setProduct}
        />
        <DateRangeFilter from={from} to={to} onChange={setRange} />
      </div>

      {error && <div className="text-error-500 text-sm">{error}</div>}

      {!product && <p className="text-sm text-gray-400">Chọn mẫu hàng để xem thống kê so sánh.</p>}

      {product && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-2">
          <AntTable
            rowKey={(r) => `${r.processStage?._id}-${r.worker?._id}`}
            loading={loading}
            columns={columns}
            dataSource={sorted}
            pagination={false}
            locale={{ emptyText: "Chưa có dữ liệu công đoạn/công nhân trong kỳ này để so sánh" }}
          />
        </div>
      )}
    </div>
  );
}
