import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/production_report.dart';
import 'pill_badge.dart';

class StatusBadge extends StatelessWidget {
  final ReportStatus status;
  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    late Color color;
    late String label;
    switch (status) {
      case ReportStatus.pending:
        color = AppColors.warning500;
        label = 'Chờ duyệt';
        break;
      case ReportStatus.confirmed:
        color = AppColors.success500;
        label = 'Đã xác nhận';
        break;
      case ReportStatus.rejected:
        color = AppColors.error500;
        label = 'Từ chối';
        break;
    }
    return PillBadge(label: label, color: color);
  }
}
