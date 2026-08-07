"use client";
import { DatePicker } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  className?: string;
}

// Bo loc "tu ngay - den ngay" dung chung cho cac trang tim kiem theo ky (Tong quan, Tinh
// luong, Hang loi, Cham cong). Cho phep chon khoang ngan hon 1 thang, khong bat buoc du 1 thang.
export default function DateRangeFilter({ from, to, onChange, className }: DateRangeFilterProps) {
  return (
    <RangePicker
      value={[dayjs(from), dayjs(to)]}
      format="DD/MM/YYYY"
      allowClear={false}
      className={className}
      onChange={(dates) => {
        if (!dates || !dates[0] || !dates[1]) return;
        onChange({ from: dates[0].format("YYYY-MM-DD"), to: dates[1].format("YYYY-MM-DD") });
      }}
    />
  );
}
