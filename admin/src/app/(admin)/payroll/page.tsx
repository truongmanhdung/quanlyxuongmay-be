"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Table as AntTable, Space, Tooltip, notification } from "antd";
import Button from "@/components/ui/button/Button";
import DateRangeFilter from "@/components/common/DateRangeFilter";
import { PaperPlaneIcon, DownloadIcon, FileIcon } from "@/icons";
import { payrollApi, PayrollSlip } from "@/lib/resources/payroll";
import { PayrollDefectComparison, PayrollDetail, PayrollRow } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber, formatDateRangeLabel, defaultDateRange } from "@/lib/format";

export default function PayrollPage() {
  const searchParams = useSearchParams();
  const [{ from, to }, setRange] = useState(() => {
    const qFrom = searchParams.get("from");
    const qTo = searchParams.get("to");
    return qFrom && qTo ? { from: qFrom, to: qTo } : defaultDateRange();
  });
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [slips, setSlips] = useState<Record<string, PayrollSlip>>({});
  const [details, setDetails] = useState<Record<string, PayrollDetail>>({});
  const [defectComparisons, setDefectComparisons] = useState<Record<string, PayrollDefectComparison>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    setError(null);
    setDetails({});
    try {
      const [res, existingSlips] = await Promise.all([
        payrollApi.summary(from, to),
        payrollApi.listSlips({ from, to }),
      ]);
      setRows(res.rows);
      setSlips(Object.fromEntries(existingSlips.map((s) => [s.worker._id, s])));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được bảng lương");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  async function handleExport(row: PayrollRow) {
    if (!row.worker) return;
    setExportingId(row.worker._id);
    try {
      const slip = await payrollApi.export(row.worker._id, from, to);
      setSlips((prev) => ({ ...prev, [row.worker!._id]: slip }));
    } catch (err) {
      notification.error({ message: err instanceof ApiError ? err.message : "Xuất phiếu lương thất bại" });
    } finally {
      setExportingId(null);
    }
  }

  async function handleDownload(row: PayrollRow, format: "pdf" | "xlsx") {
    const slip = row.worker && slips[row.worker._id];
    if (!slip) return;
    try {
      await payrollApi.downloadSlipFile(slip._id, format, `phieu-luong-${row.worker!.code}-${from}_${to}.${format}`);
    } catch (err) {
      notification.error({ message: err instanceof ApiError ? err.message : "Tải file thất bại" });
    }
  }

  async function handleExpand(expanded: boolean, row: PayrollRow) {
    if (!expanded || !row.worker || details[row.worker._id]) return;
    const workerId = row.worker._id;
    setDetailLoading((prev) => ({ ...prev, [workerId]: true }));
    try {
      const [detail, comparison] = await Promise.all([
        payrollApi.detail(workerId, from, to),
        payrollApi.defectComparison(workerId, from, to),
      ]);
      setDetails((prev) => ({ ...prev, [workerId]: detail }));
      setDefectComparisons((prev) => ({ ...prev, [workerId]: comparison }));
    } catch {
      // bo qua, khu vuc mo rong se hien "khong tai duoc"
    } finally {
      setDetailLoading((prev) => ({ ...prev, [workerId]: false }));
    }
  }

  const totalAmount = rows.reduce((sum, r) => sum + r.totalAmount, 0);
  const dataSource = rows.filter((r): r is PayrollRow & { worker: NonNullable<PayrollRow["worker"]> } => !!r.worker);

  const columns = [
    { title: "Mã CN", dataIndex: ["worker", "code"], key: "code", width: 100 },
    { title: "Công nhân", dataIndex: ["worker", "name"], key: "name" },
    {
      title: "Số lô",
      dataIndex: "reportCount",
      key: "reportCount",
      align: "right" as const,
      render: (v: number) => formatNumber(v),
    },
    {
      title: "Sản lượng",
      dataIndex: "totalQuantity",
      key: "totalQuantity",
      align: "right" as const,
      render: (v: number) => formatNumber(v),
    },
    {
      title: "Tổng lương",
      dataIndex: "totalAmount",
      key: "totalAmount",
      align: "right" as const,
      render: (v: number) => <span className="font-medium">{formatCurrency(v)}</span>,
    },
    {
      title: (
        <Tooltip title="Số lượng lỗi/hoàn trả đã ghi nhận có gắn công đoạn + công nhân này trong kỳ">
          <span>Lỗi / Hoàn trả</span>
        </Tooltip>
      ),
      dataIndex: "defectQuantity",
      key: "defectQuantity",
      align: "right" as const,
      render: (v: number) => (v > 0 ? <span className="text-error-500 font-medium">{formatNumber(v)}</span> : "—"),
    },
    {
      title: (
        <Tooltip title="Tổng lương trừ đi phần ước tính từ hàng lỗi/hoàn trả — chỉ để tham khảo, không phải số liệu trả lương chính thức">
          <span>Lương thực nhận (ước tính)</span>
        </Tooltip>
      ),
      dataIndex: "estimatedNetAmount",
      key: "estimatedNetAmount",
      align: "right" as const,
      render: (v: number, row: PayrollRow) => (
        <span className={row.defectQuantity > 0 ? "text-warning-500 font-medium" : "text-gray-400"}>
          {formatCurrency(v)}
        </span>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 130,
      render: (_: unknown, row: PayrollRow) => (
        <Space size="middle">
          <Tooltip title={slips[row.worker!._id] ? "Xuất lại phiếu lương (chốt số liệu mới nhất)" : "Xuất phiếu lương"}>
            <button
              onClick={() => handleExport(row)}
              disabled={exportingId === row.worker!._id}
              className="text-gray-500 hover:text-brand-500 dark:text-gray-400"
            >
              <PaperPlaneIcon />
            </button>
          </Tooltip>
          {slips[row.worker!._id] && (
            <>
              <Tooltip title="Tải PDF">
                <button onClick={() => handleDownload(row, "pdf")} className="text-gray-500 hover:text-brand-500 dark:text-gray-400">
                  <FileIcon />
                </button>
              </Tooltip>
              <Tooltip title="Tải Excel">
                <button onClick={() => handleDownload(row, "xlsx")} className="text-gray-500 hover:text-brand-500 dark:text-gray-400">
                  <DownloadIcon />
                </button>
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  function groupReportsByDay(reports: PayrollDetail["reports"]) {
    const sorted = [...reports].sort((a, b) => new Date(a.workDate).getTime() - new Date(b.workDate).getTime());
    const groups: { dateKey: string; date: string; reports: typeof reports; subtotal: number }[] = [];
    const byKey = new Map<string, (typeof groups)[number]>();
    sorted.forEach((r) => {
      const dateKey = r.workDate.slice(0, 10);
      let group = byKey.get(dateKey);
      if (!group) {
        group = { dateKey, date: r.workDate, reports: [], subtotal: 0 };
        byKey.set(dateKey, group);
        groups.push(group);
      }
      group.reports.push(r);
      group.subtotal += r.amount;
    });
    return groups;
  }

  const comparisonColumns = [
    {
      title: "Mẫu hàng",
      key: "product",
      render: (_: unknown, r: PayrollDefectComparison["rows"][number]) => r.product?.name || "—",
    },
    {
      title: "Công đoạn",
      key: "processStage",
      render: (_: unknown, r: PayrollDefectComparison["rows"][number]) => r.processStage?.name || "—",
    },
    {
      title: "Kê khai",
      key: "declared",
      align: "right" as const,
      render: (_: unknown, r: PayrollDefectComparison["rows"][number]) => (
        <span>
          {formatNumber(r.declaredQuantity)} <span className="text-gray-400">({formatCurrency(r.declaredAmount)})</span>
        </span>
      ),
    },
    {
      title: "Lỗi / Hoàn trả",
      key: "defect",
      align: "right" as const,
      render: (_: unknown, r: PayrollDefectComparison["rows"][number]) =>
        r.defectQuantity > 0 ? (
          <span className="text-error-500 font-medium">
            {formatNumber(r.defectQuantity)} <span className="font-normal">({formatCurrency(r.estimatedDefectAmount)})</span>
          </span>
        ) : (
          "—"
        ),
    },
    {
      title: "Thực nhận (ước tính)",
      key: "net",
      align: "right" as const,
      render: (_: unknown, r: PayrollDefectComparison["rows"][number]) => (
        <span className="font-medium">
          {formatNumber(r.netQuantity)} <span className="text-gray-400 font-normal">({formatCurrency(r.netAmount)})</span>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Tính lương</h1>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Bảng lương công nhân theo kỳ (sản lượng × đơn giá) — bấm vào từng dòng để xem chi tiết công đoạn
          </p>
        </div>
        <DateRangeFilter from={from} to={to} onChange={setRange} />
      </div>

      {error && <div className="text-error-500 text-sm">{error}</div>}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <span className="text-sm text-gray-500 dark:text-gray-400">Tổng lương {formatDateRangeLabel(from, to)}</span>
        <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{formatCurrency(totalAmount)}</h4>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto p-2">
          <AntTable
            rowKey={(r) => r.worker!._id}
            loading={loading}
            columns={columns}
            dataSource={dataSource}
            pagination={false}
            locale={{ emptyText: "Chưa có dữ liệu sản lượng trong kỳ này" }}
            expandable={{
              onExpand: handleExpand,
              expandedRowRender: (row: PayrollRow) => {
                const workerId = row.worker!._id;
                if (detailLoading[workerId]) {
                  return <div className="py-3 text-sm text-gray-400">Đang tải chi tiết...</div>;
                }
                const detail = details[workerId];
                if (!detail) {
                  return <div className="py-3 text-sm text-gray-400">Không tải được chi tiết</div>;
                }
                const comparison = defectComparisons[workerId];
                const dayGroups = groupReportsByDay(detail.reports);
                return (
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Chi tiết theo ngày — công đoạn, sản phẩm đã làm
                      </p>
                      {dayGroups.length === 0 ? (
                        <p className="py-3 text-sm text-gray-400">Không có báo cáo nào trong kỳ này</p>
                      ) : (
                        <div className="space-y-3">
                          {dayGroups.map((group) => (
                            <div key={group.dateKey} className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
                              <div className="flex items-center justify-between bg-gray-50 px-4 py-2 dark:bg-white/[0.04]">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                  Ngày {formatDate(group.date)}
                                </span>
                                <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                                  Cộng ngày: {formatCurrency(group.subtotal)}
                                </span>
                              </div>
                              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {group.reports.map((r) => (
                                  <div key={r._id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                                    <div className="text-gray-700 dark:text-gray-300">
                                      <span className="font-medium">{r.processStage?.name ?? "(công đoạn đã xoá)"}</span>
                                      <span className="text-gray-400"> — {r.product?.name ?? "(mẫu hàng đã xoá)"}</span>
                                      {r.batchNumber && <span className="text-gray-400"> · Lô {r.batchNumber}</span>}
                                    </div>
                                    <div className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                                      {formatNumber(r.quantity)} × {formatCurrency(r.unitPrice)} ={" "}
                                      <span className="font-medium text-gray-800 dark:text-white/90">{formatCurrency(r.amount)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        So sánh với hàng lỗi / hoàn trả (ước tính, không thay đổi lương chính thức)
                      </p>
                      <AntTable
                        rowKey={(r) => `${r.product?._id}-${r.processStage?._id}`}
                        size="small"
                        columns={comparisonColumns}
                        dataSource={comparison?.rows || []}
                        pagination={false}
                        locale={{ emptyText: "Không có hàng lỗi/hoàn trả nào gắn công đoạn + công nhân này trong kỳ" }}
                        summary={() =>
                          comparison && comparison.rows.length > 0 ? (
                            <AntTable.Summary.Row>
                              <AntTable.Summary.Cell index={0} colSpan={2}>
                                <span className="font-medium">Tổng</span>
                              </AntTable.Summary.Cell>
                              <AntTable.Summary.Cell index={1} align="right">
                                <span className="font-medium">{formatCurrency(comparison.totals.declaredAmount)}</span>
                              </AntTable.Summary.Cell>
                              <AntTable.Summary.Cell index={2} align="right">
                                <span className="font-medium text-error-500">
                                  {formatCurrency(comparison.totals.estimatedDefectAmount)}
                                </span>
                              </AntTable.Summary.Cell>
                              <AntTable.Summary.Cell index={3} align="right">
                                <span className="font-medium">{formatCurrency(comparison.totals.netAmount)}</span>
                              </AntTable.Summary.Cell>
                            </AntTable.Summary.Row>
                          ) : null
                        }
                      />
                    </div>
                  </div>
                );
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
