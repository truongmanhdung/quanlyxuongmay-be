import 'package:flutter/material.dart';
import '../core/format.dart';
import '../core/theme.dart';

/// Mot khoang [from, to] dung chung cho cac man hinh tim kiem theo ky (Tinh luong,
/// Tong quan...). Mac dinh: [hom nay - 1 thang, hom nay].
class DateRange {
  final DateTime from;
  final DateTime to;
  const DateRange({required this.from, required this.to});

  factory DateRange.defaultRange() {
    final to = DateTime.now();
    final from = DateTime(to.year, to.month - 1, to.day);
    return DateRange(from: from, to: to);
  }

  static String _iso(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  String get fromIso => _iso(from);
  String get toIso => _iso(to);
}

/// Nut bo loc "tu ngay - den ngay" dung chung cho toan app, thay cho chon theo thang.
/// Bam vao se mo showDateRangePicker cua Flutter (cho phep chon khoang ngan hon 1 thang).
class DateRangeFilterButton extends StatelessWidget {
  final DateRange range;
  final ValueChanged<DateRange> onChanged;

  const DateRangeFilterButton({super.key, required this.range, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: () async {
        final now = DateTime.now();
        final picked = await showDateRangePicker(
          context: context,
          firstDate: DateTime(now.year - 3),
          lastDate: now,
          initialDateRange: DateTimeRange(start: range.from, end: range.to),
        );
        if (picked != null) {
          onChanged(DateRange(from: picked.start, to: picked.end));
        }
      },
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        side: const BorderSide(color: AppColors.gray200),
      ),
      icon: const Icon(Icons.date_range_outlined, size: 18),
      label: Text('${formatDate(range.from)} - ${formatDate(range.to)}'),
    );
  }
}
