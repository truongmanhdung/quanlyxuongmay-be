import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import { ProductionReport } from "@/lib/types";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";

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

export default function RecentSubmissions({ reports }: { reports: ProductionReport[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Thông báo gửi sản lượng
        </h3>
        <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
          Các lần công nhân gửi sản lượng gần đây nhất
        </p>
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Công nhân
              </TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Mẫu hàng / Công đoạn
              </TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Sản lượng
              </TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Thành tiền
              </TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Thời gian gửi
              </TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Trạng thái
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {reports.length === 0 && (
              <TableRow>
                <TableCell className="py-6 text-center text-gray-400" colSpan={6}>
                  Chưa có báo cáo sản lượng nào
                </TableCell>
              </TableRow>
            )}
            {reports.map((r) => (
              <TableRow key={r._id}>
                <TableCell className="py-3">
                  <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{r.worker.name}</p>
                  <span className="text-gray-500 text-theme-xs dark:text-gray-400">{r.worker.code}</span>
                </TableCell>
                <TableCell className="py-3 text-gray-600 text-theme-sm dark:text-gray-300">
                  {r.product.name} — {r.processStage.name}
                  {r.batchNumber ? <span className="text-gray-400"> (Lô {r.batchNumber})</span> : null}
                </TableCell>
                <TableCell className="py-3 text-gray-600 text-theme-sm dark:text-gray-300">
                  {formatNumber(r.quantity)}
                </TableCell>
                <TableCell className="py-3 text-gray-600 text-theme-sm dark:text-gray-300">
                  {formatCurrency(r.amount)}
                </TableCell>
                <TableCell className="py-3 text-gray-500 text-theme-xs dark:text-gray-400">
                  {formatDateTime(r.createdAt)}
                </TableCell>
                <TableCell className="py-3">
                  <Badge size="sm" color={STATUS_COLOR[r.status]}>
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
