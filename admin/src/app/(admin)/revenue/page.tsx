"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Table as AntTable, Space, Tooltip, notification } from "antd";
import DateRangeFilter from "@/components/common/DateRangeFilter";
import { PaperPlaneIcon, DownloadIcon, FileIcon } from "@/icons";
import { revenueApi, RevenueSlip } from "@/lib/resources/revenue";
import { RevenueDetail, RevenueRow } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber, formatDateRangeLabel, defaultDateRange } from "@/lib/format";

export default function RevenuePage() {
  const searchParams = useSearchParams();
  const [{ from, to }, setRange] = useState(() => {
    const qFrom = searchParams.get("from");
    const qTo = searchParams.get("to");
    return qFrom && qTo ? { from: qFrom, to: qTo } : defaultDateRange();
  });
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [slips, setSlips] = useState<Record<string, RevenueSlip>>({});
  const [details, setDetails] = useState<Record<string, RevenueDetail>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    setError(null);
    setDetails({});
    try {
      const [res, existingSlips] = await Promise.all([
        revenueApi.summary(from, to),
        revenueApi.listSlips({ from, to }),
      ]);
      setRows(res.rows);
      setSlips(Object.fromEntries(existingSlips.filter((s) => s.customer).map((s) => [s.customer!._id, s])));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được bảng doanh thu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  async function handleExport(row: RevenueRow) {
    if (!row.customer) return;
    setExportingId(row.customer._id);
    try {
      const slip = await revenueApi.export(row.customer._id, from, to);
      setSlips((prev) => ({ ...prev, [row.customer!._id]: slip }));
    } catch (err) {
      notification.error({ message: err instanceof ApiError ? err.message : "Chốt phiếu doanh thu thất bại" });
    } finally {
      setExportingId(null);
    }
  }

  async function handleDownload(row: RevenueRow, format: "pdf" | "xlsx") {
    const slip = row.customer && slips[row.customer._id];
    if (!slip) return;
    try {
      await revenueApi.downloadSlipFile(slip._id, format, `doanh-thu-${row.customer!.code}-${from}_${to}.${format}`);
    } catch (err) {
      notification.error({ message: err instanceof ApiError ? err.message : "Tải file thất bại" });
    }
  }

  async function handleExpand(expanded: boolean, row: RevenueRow) {
    if (!expanded || !row.customer || details[row.customer._id]) return;
    const customerId = row.customer._id;
    setDetailLoading((prev) => ({ ...prev, [customerId]: true }));
    try {
      const detail = await revenueApi.detail(customerId, from, to);
      setDetails((prev) => ({ ...prev, [customerId]: detail }));
    } catch {
      // bo qua, khu vuc mo rong se hien "khong tai duoc"
    } finally {
      setDetailLoading((prev) => ({ ...prev, [customerId]: false }));
    }
  }

  const totalAmount = rows.reduce((sum, r) => sum + r.totalAmount, 0);
  const dataSource = rows.filter((r): r is RevenueRow & { customer: NonNullable<RevenueRow["customer"]> } => !!r.customer);

  const columns = [
    { title: "Mã KH", dataIndex: ["customer", "code"], key: "code", width: 100 },
    { title: "Khách hàng", dataIndex: ["customer", "name"], key: "name" },
    {
      title: "Số phiếu xuất",
      dataIndex: "orderCount",
      key: "orderCount",
      align: "right" as const,
      render: (v: number) => formatNumber(v),
    },
    {
      title: "Sản lượng xuất",
      dataIndex: "totalQuantity",
      key: "totalQuantity",
      align: "right" as const,
      render: (v: number) => formatNumber(v),
    },
    {
      title: "Tổng doanh thu",
      dataIndex: "totalAmount",
      key: "totalAmount",
      align: "right" as const,
      render: (v: number) => <span className="font-medium">{formatCurrency(v)}</span>,
    },
    {
      title: "",
      key: "actions",
      width: 130,
      render: (_: unknown, row: RevenueRow) => (
        <Space size="middle">
          <Tooltip title={slips[row.customer!._id] ? "Chốt lại phiếu doanh thu (số liệu mới nhất)" : "Chốt phiếu doanh thu"}>
            <button
              onClick={() => handleExport(row)}
              disabled={exportingId === row.customer!._id}
              className="text-gray-500 hover:text-brand-500 dark:text-gray-400"
            >
              <PaperPlaneIcon />
            </button>
          </Tooltip>
          {slips[row.customer!._id] && (
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Doanh thu khách hàng</h1>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Doanh thu theo kỳ = tổng các phiếu Xuất (trả hàng thành phẩm cho khách) — bấm vào từng dòng để xem chi tiết
          </p>
        </div>
        <DateRangeFilter from={from} to={to} onChange={setRange} />
      </div>

      {error && <div className="text-error-500 text-sm">{error}</div>}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <span className="text-sm text-gray-500 dark:text-gray-400">Tổng doanh thu {formatDateRangeLabel(from, to)}</span>
        <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{formatCurrency(totalAmount)}</h4>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto p-2">
          <AntTable
            rowKey={(r) => r.customer!._id}
            loading={loading}
            columns={columns}
            dataSource={dataSource}
            pagination={false}
            locale={{ emptyText: "Chưa có phiếu Xuất nào trong kỳ này" }}
            expandable={{
              onExpand: handleExpand,
              expandedRowRender: (row: RevenueRow) => {
                const customerId = row.customer!._id;
                if (detailLoading[customerId]) {
                  return <div className="py-3 text-sm text-gray-400">Đang tải chi tiết...</div>;
                }
                const detail = details[customerId];
                if (!detail) {
                  return <div className="py-3 text-sm text-gray-400">Không tải được chi tiết</div>;
                }
                return (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Chi tiết theo dòng phiếu Xuất
                    </p>
                    {detail.lines.length === 0 ? (
                      <p className="py-3 text-sm text-gray-400">Không có phiếu Xuất nào trong kỳ này</p>
                    ) : (
                      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                          {detail.lines.map((l, i) => (
                            <div key={`${l.order}-${l.productName}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                              <div className="text-gray-700 dark:text-gray-300">
                                <span className="font-medium">{l.productName}</span>
                                <span className="text-gray-400"> · Phiếu {l.orderCode}</span>
                                {l.date && <span className="text-gray-400"> · {formatDate(l.date)}</span>}
                              </div>
                              <div className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                                {formatNumber(l.quantity)} × {formatCurrency(l.unitPrice)} ={" "}
                                <span className="font-medium text-gray-800 dark:text-white/90">
                                  {formatCurrency(l.amount)}
                                </span>
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center justify-between gap-3 bg-gray-50 px-4 py-2.5 text-sm dark:bg-white/[0.04]">
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                              Tổng tiền {row.customer!.name}
                            </span>
                            <span className="font-semibold text-brand-600 dark:text-brand-400">
                              {formatCurrency(detail.totalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
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
