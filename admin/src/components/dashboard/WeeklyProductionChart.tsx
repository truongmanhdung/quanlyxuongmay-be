"use client";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { formatDate, formatNumber } from "@/lib/format";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function WeeklyProductionChart({
  data,
}: {
  data: { date: string; quantity: number; amount: number }[];
}) {
  const options: ApexOptions = {
    legend: { show: false },
    colors: ["#465FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: { columnWidth: "40%", borderRadius: 5 },
    },
    dataLabels: { enabled: false },
    grid: {
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      categories: data.map((d) => formatDate(d.date)),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => formatNumber(val),
      },
    },
    tooltip: {
      y: { formatter: (val: number) => `${formatNumber(val)} sản phẩm` },
    },
  };

  const series = [{ name: "Sản lượng", data: data.map((d) => d.quantity) }];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Sản lượng 7 ngày gần nhất
        </h3>
        <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
          Tổng hợp sản lượng công nhân đã gửi mỗi ngày
        </p>
      </div>
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[600px]">
          <Chart options={options} series={series} type="bar" height={280} />
        </div>
      </div>
    </div>
  );
}
