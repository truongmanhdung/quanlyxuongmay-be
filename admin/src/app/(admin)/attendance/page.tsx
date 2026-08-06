"use client";
import React, { useEffect, useRef, useState } from "react";
import { Tabs, DatePicker, Table as AntTable, notification } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import { attendanceApi } from "@/lib/resources/attendance";
import { AttendanceDayRow, AttendanceRecord, AttendanceSummaryRow } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { formatTime, currentPeriod } from "@/lib/format";
import { getSocket } from "@/lib/socket";

function statusOf(attendance: AttendanceRecord | null): { label: string; color: "light" | "warning" | "success" } {
  if (!attendance || !attendance.checkInAt) return { label: "Chưa chấm công", color: "light" };
  if (!attendance.checkOutAt) return { label: "Đang làm việc", color: "warning" };
  return { label: "Đã chấm công ra", color: "success" };
}

function DayTab() {
  const [date, setDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [rows, setRows] = useState<AttendanceDayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await attendanceApi.day(date);
      setRows(res.rows);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được điểm danh");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const isToday = date === dayjs().format("YYYY-MM-DD");
    const handle = (record: AttendanceRecord) => {
      if (!isToday) return;
      notification.info({
        message: "Chấm công",
        description: `${record.worker.code} - ${record.worker.name} vừa chấm công`,
        placement: "topRight",
      });
      loadRef.current();
    };
    socket.on("attendance:new", handle);
    socket.on("attendance:updated", handle);
    return () => {
      socket.off("attendance:new", handle);
      socket.off("attendance:updated", handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const presentCount = rows.filter((r) => r.attendance?.checkInAt).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <span className="text-sm text-gray-500 dark:text-gray-400">Đã chấm công ngày {date}</span>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {presentCount} / {rows.length} công nhân
          </h4>
        </div>
        <DatePicker
          picker="date"
          format="DD/MM/YYYY"
          allowClear={false}
          value={dayjs(date)}
          onChange={(d: Dayjs | null) => d && setDate(d.format("YYYY-MM-DD"))}
          className="!w-40"
        />
      </div>

      {error && <div className="text-error-500 text-sm">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Mã CN</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Công nhân</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Giờ vào</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Giờ ra</TableCell>
                <TableCell isHeader className="py-3 px-5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Trạng thái</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading && (
                <TableRow>
                  <TableCell className="py-6 px-5 text-center text-gray-400" colSpan={5}>Đang tải...</TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell className="py-6 px-5 text-center text-gray-400" colSpan={5}>Chưa có công nhân nào</TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const status = statusOf(r.attendance);
                return (
                  <TableRow key={r.worker._id}>
                    <TableCell className="py-3 px-5 font-medium text-gray-800 text-theme-sm dark:text-white/90">{r.worker.code}</TableCell>
                    <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">{r.worker.name}</TableCell>
                    <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">
                      {r.attendance?.checkInAt ? formatTime(r.attendance.checkInAt) : "—"}
                    </TableCell>
                    <TableCell className="py-3 px-5 text-gray-600 text-theme-sm dark:text-gray-300">
                      {r.attendance?.checkOutAt ? formatTime(r.attendance.checkOutAt) : "—"}
                    </TableCell>
                    <TableCell className="py-3 px-5">
                      <Badge size="sm" color={status.color}>{status.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function MonthTab() {
  const [period, setPeriod] = useState(() => currentPeriod());
  const [rows, setRows] = useState<AttendanceSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, AttendanceRecord[]>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    setError(null);
    setDetails({});
    try {
      const res = await attendanceApi.summary(period);
      setRows(res.rows);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được tổng hợp chấm công");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function handleExpand(expanded: boolean, row: AttendanceSummaryRow) {
    if (!expanded || !row.worker || details[row.worker._id]) return;
    const workerId = row.worker._id;
    setDetailLoading((prev) => ({ ...prev, [workerId]: true }));
    try {
      const records = await attendanceApi.list(workerId, period);
      setDetails((prev) => ({ ...prev, [workerId]: records }));
    } catch {
      // bo qua, khu vuc mo rong se hien "khong tai duoc"
    } finally {
      setDetailLoading((prev) => ({ ...prev, [workerId]: false }));
    }
  }

  const dataSource = rows.filter((r): r is AttendanceSummaryRow & { worker: NonNullable<AttendanceSummaryRow["worker"]> } => !!r.worker);

  const columns = [
    { title: "Mã CN", dataIndex: ["worker", "code"], key: "code", width: 100 },
    { title: "Công nhân", dataIndex: ["worker", "name"], key: "name" },
    { title: "Số ngày công", dataIndex: "daysPresent", key: "daysPresent", align: "right" as const },
  ];

  const detailColumns = [
    { title: "Ngày", dataIndex: "date", key: "date", render: (v: string) => dayjs(v).format("DD/MM/YYYY") },
    { title: "Giờ vào", dataIndex: "checkInAt", key: "checkInAt", render: (v?: string) => (v ? formatTime(v) : "—") },
    { title: "Giờ ra", dataIndex: "checkOutAt", key: "checkOutAt", render: (v?: string) => (v ? formatTime(v) : "—") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <DatePicker
          picker="month"
          format="MM/YYYY"
          allowClear={false}
          value={dayjs(`${period}-01`)}
          onChange={(date: Dayjs | null) => date && setPeriod(date.format("YYYY-MM"))}
          className="!w-36"
        />
      </div>

      {error && <div className="text-error-500 text-sm">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto p-2">
          <AntTable
            rowKey={(r) => r.worker!._id}
            loading={loading}
            columns={columns}
            dataSource={dataSource}
            pagination={false}
            locale={{ emptyText: "Chưa có dữ liệu chấm công trong kỳ này" }}
            expandable={{
              onExpand: handleExpand,
              expandedRowRender: (row: AttendanceSummaryRow) => {
                const workerId = row.worker!._id;
                if (detailLoading[workerId]) {
                  return <div className="py-3 text-sm text-gray-400">Đang tải chi tiết...</div>;
                }
                const records = details[workerId];
                if (!records) {
                  return <div className="py-3 text-sm text-gray-400">Không tải được chi tiết</div>;
                }
                return (
                  <AntTable
                    rowKey="_id"
                    size="small"
                    columns={detailColumns}
                    dataSource={records}
                    pagination={false}
                    locale={{ emptyText: "Không có bản ghi chấm công nào trong kỳ này" }}
                  />
                );
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Chấm công</h1>
        <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
          Công nhân tự chấm công vào/ra trên app — chỉ để theo dõi/đối chiếu, không ảnh hưởng tính lương
        </p>
      </div>

      <Tabs
        defaultActiveKey="day"
        items={[
          { key: "day", label: "Theo ngày", children: <DayTab /> },
          { key: "month", label: "Theo tháng", children: <MonthTab /> },
        ]}
      />
    </div>
  );
}
