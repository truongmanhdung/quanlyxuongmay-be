"use client";
import React, { useEffect, useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Select from "@/components/form/Select";
import Badge from "@/components/ui/badge/Badge";
import { CheckLineIcon, CloseLineIcon } from "@/icons";
import { reportsApi } from "@/lib/resources/reports";
import { workersApi } from "@/lib/resources/workers";
import { ProductionReport, Worker } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { notification } from "antd";

const STATUS_LABEL: Record<ProductionReport["status"], string> = {
  pending: "Chờ duyệt",
  confirmed: "Đã xác nhận",
  rejected: "Từ chối",
};

const STATUS_COLOR: Record<ProductionReport["status"], "warning" | "success" | "error"> = {
  pending: "warning",
  confirmed: "success",
  rejected: "error",
};

export default function NotificationsPage() {
  const [reports, setReports] = useState<ProductionReport[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerFilter, setWorkerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [r, w] = await Promise.all([
        reportsApi.list({ worker: workerFilter || undefined, status: statusFilter || undefined }),
        workers.length ? Promise.resolve(workers) : workersApi.list(),
      ]);
      setReports(r);
      if (!workers.length) setWorkers(w);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được thông báo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerFilter, statusFilter]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleNewReport = (report: ProductionReport) => {
      notification.info({
        title: "Báo cáo sản lượng mới",
        description: `${report.worker.name} vừa gửi ${formatNumber(report.quantity)} sp — ${report.product?.name ?? "(mẫu hàng đã xoá)"} / ${report.processStage?.name ?? "(công đoạn đã xoá)"}`,
        placement: "topRight",
      });
      loadRef.current();
    };
    socket.on("report:new", handleNewReport);
    return () => {
      socket.off("report:new", handleNewReport);
    };
  }, []);

  async function handleStatus(report: ProductionReport, status: "confirmed" | "rejected") {
    try {
      await reportsApi.setStatus(report._id, status);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Cập nhật trạng thái thất bại");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Duyệt sản lượng</h1>
        <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
          Các lần công nhân gửi sản lượng theo lô hàng — xác nhận hoặc từ chối từng báo cáo tại đây
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-lg">
        <Select
          placeholder="Tất cả công nhân"
          options={workers.map((w) => ({ value: w._id, label: `${w.code} — ${w.name}` }))}
          onChange={setWorkerFilter}
        />
        <Select
          placeholder="Tất cả trạng thái"
          options={[
            { value: "pending", label: "Chờ duyệt" },
            { value: "confirmed", label: "Đã xác nhận" },
            { value: "rejected", label: "Từ chối" },
          ]}
          onChange={setStatusFilter}
        />
      </div>

      {error && <div className="text-error-500 text-sm">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Công nhân</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Mẫu hàng / Công đoạn</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Lô</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Sản lượng</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Thành tiền</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Ngày giờ gửi</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Trạng thái</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{""}</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading && (
                <TableRow>
                  <TableCell className="py-6 px-5 text-center text-gray-400" colSpan={8}>Đang tải...</TableCell>
                </TableRow>
              )}
              {!loading && reports.length === 0 && (
                <TableRow>
                  <TableCell className="py-6 px-5 text-center text-gray-400" colSpan={8}>Không có báo cáo nào</TableCell>
                </TableRow>
              )}
              {reports.map((r) => (
                <TableRow key={r._id}>
                  <TableCell className="py-3 px-5">
                    <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{r.worker.name}</p>
                    <span className="text-gray-500 text-theme-xs dark:text-gray-400">{r.worker.code}</span>
                  </TableCell>
                  <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">
                    {r.product?.name ?? "(mẫu hàng đã xoá)"} — {r.processStage?.name ?? "(công đoạn đã xoá)"}
                  </TableCell>
                  <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">{r.batchNumber || "—"}</TableCell>
                  <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">{formatNumber(r.quantity)}</TableCell>
                  <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">{formatCurrency(r.amount)}</TableCell>
                  <TableCell className="py-3 px-5 text-gray-500 text-theme-xs dark:text-gray-400">{formatDateTime(r.createdAt)}</TableCell>
                  <TableCell className="py-3 px-5">
                    <Badge size="sm" color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                  </TableCell>
                  <TableCell className="py-3 px-5">
                    {r.status === "pending" && (
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleStatus(r, "confirmed")} className="text-gray-500 hover:text-success-500 dark:text-gray-400" title="Xác nhận">
                          <CheckLineIcon />
                        </button>
                        <button onClick={() => handleStatus(r, "rejected")} className="text-gray-500 hover:text-error-500 dark:text-gray-400" title="Từ chối">
                          <CloseLineIcon />
                        </button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
