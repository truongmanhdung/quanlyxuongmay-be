"use client";
import React, { useEffect, useRef, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import WeeklyProductionChart from "@/components/dashboard/WeeklyProductionChart";
import RecentSubmissions from "@/components/dashboard/RecentSubmissions";
import { dashboardApi } from "@/lib/resources/dashboard";
import { DashboardOverview } from "@/lib/types";
import { formatCurrency, formatNumber, currentPeriod } from "@/lib/format";
import { DollarLineIcon, BoxIcon, GroupIcon, TaskIcon } from "@/icons";
import { getSocket } from "@/lib/socket";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    dashboardApi
      .overview(currentPeriod())
      .then(setData)
      .catch((err) => setError(err.message || "Không tải được dữ liệu tổng quan"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => loadRef.current();
    socket.on("report:new", refresh);
    socket.on("batch:updated", refresh);
    socket.on("defect:new", refresh);
    return () => {
      socket.off("report:new", refresh);
      socket.off("batch:updated", refresh);
      socket.off("defect:new", refresh);
    };
  }, []);

  if (loading) return <div className="text-gray-500 dark:text-gray-400">Đang tải dữ liệu...</div>;
  if (error) return <div className="text-error-500">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Tổng quan</h1>
        <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
          Kỳ {data.period} — cập nhật theo thời gian thực
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <StatCard
          icon={<DollarLineIcon className="text-brand-500 size-6" />}
          label="Tổng lương công nhân đã hoàn thành"
          value={formatCurrency(data.totalAmount)}
          href={`/payroll?period=${data.period}`}
        />
        <StatCard
          icon={<BoxIcon className="text-brand-500 size-6" />}
          label="Tổng sản lượng hoàn thành"
          value={`${formatNumber(data.totalQuantity)} sản phẩm`}
          href="/batches"
        />
        <StatCard
          icon={<TaskIcon className="text-brand-500 size-6" />}
          label="Số lô hàng hoàn thành"
          value={formatNumber(data.batchCount)}
          href="/batches?status=hoan_thanh"
        />
        <StatCard
          icon={<GroupIcon className="text-brand-500 size-6" />}
          label="Công nhân đang hoạt động"
          value={formatNumber(data.activeWorkerCount)}
          caption={`/ ${formatNumber(data.totalWorkerCount)} công nhân`}
          href="/workers"
        />
      </div>

      <WeeklyProductionChart data={data.last7Days} />

      <RecentSubmissions reports={data.recentSubmissions} />
    </div>
  );
}
