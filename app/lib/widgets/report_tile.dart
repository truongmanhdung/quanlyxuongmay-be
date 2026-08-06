import 'package:flutter/material.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../models/production_report.dart';
import 'status_badge.dart';

class ReportTile extends StatelessWidget {
  final ProductionReport report;
  final bool showWorker;
  final Widget? trailingAction;

  const ReportTile({super.key, required this.report, this.showWorker = false, this.trailingAction});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${report.product?.name ?? "(mẫu hàng đã xoá)"} — ${report.processStage?.name ?? "(công đoạn đã xoá)"}',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : AppColors.gray800,
                    ),
                  ),
                ),
                StatusBadge(status: report.status),
              ],
            ),
            const SizedBox(height: 6),
            if (showWorker)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  '${report.worker.name} (${report.worker.code})',
                  style: TextStyle(fontSize: 12.5, color: AppColors.gray500),
                ),
              ),
            Text(
              'Lô ${report.batchNumber?.isNotEmpty == true ? report.batchNumber : "—"} · '
              '${formatNumber(report.quantity)} × ${formatCurrency(report.unitPrice)}',
              style: TextStyle(fontSize: 12.5, color: AppColors.gray500),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  formatCurrency(report.amount),
                  style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.brand600),
                ),
                Text(formatDateTime(report.createdAt), style: TextStyle(fontSize: 11.5, color: AppColors.gray400)),
              ],
            ),
            if (trailingAction != null) ...[const SizedBox(height: 8), trailingAction!],
          ],
        ),
      ),
    );
  }
}
