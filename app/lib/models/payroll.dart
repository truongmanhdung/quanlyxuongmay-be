import 'worker.dart';
import 'production_report.dart';

class PayrollRow {
  final Worker? worker;
  final double totalQuantity;
  final double totalAmount;
  final int reportCount;

  PayrollRow({
    required this.worker,
    required this.totalQuantity,
    required this.totalAmount,
    required this.reportCount,
  });

  factory PayrollRow.fromJson(Map<String, dynamic> json) => PayrollRow(
        worker: json['worker'] != null ? Worker.fromJson(json['worker'] as Map<String, dynamic>) : null,
        totalQuantity: (json['totalQuantity'] as num).toDouble(),
        totalAmount: (json['totalAmount'] as num).toDouble(),
        reportCount: json['reportCount'] as int? ?? 0,
      );
}

class PayrollSummary {
  final String period;
  final List<PayrollRow> rows;

  PayrollSummary({required this.period, required this.rows});

  factory PayrollSummary.fromJson(Map<String, dynamic> json) => PayrollSummary(
        period: json['period'] as String,
        rows: (json['rows'] as List<dynamic>).map((e) => PayrollRow.fromJson(e as Map<String, dynamic>)).toList(),
      );
}

class PayrollSlip {
  final String id;
  final String period;
  final double totalQuantity;
  final double totalAmount;
  final int reportCount;
  final DateTime issuedAt;

  PayrollSlip({
    required this.id,
    required this.period,
    required this.totalQuantity,
    required this.totalAmount,
    required this.reportCount,
    required this.issuedAt,
  });

  factory PayrollSlip.fromJson(Map<String, dynamic> json) => PayrollSlip(
        id: json['_id'] as String,
        period: json['period'] as String,
        totalQuantity: (json['totalQuantity'] as num).toDouble(),
        totalAmount: (json['totalAmount'] as num).toDouble(),
        reportCount: json['reportCount'] as int? ?? 0,
        issuedAt: DateTime.parse(json['issuedAt'] as String),
      );
}

class PayrollDetail {
  final String period;
  final double totalQuantity;
  final double totalAmount;
  final List<ProductionReport> reports;

  PayrollDetail({
    required this.period,
    required this.totalQuantity,
    required this.totalAmount,
    required this.reports,
  });

  factory PayrollDetail.fromJson(Map<String, dynamic> json) => PayrollDetail(
        period: json['period'] as String,
        totalQuantity: (json['totalQuantity'] as num).toDouble(),
        totalAmount: (json['totalAmount'] as num).toDouble(),
        reports: (json['reports'] as List<dynamic>)
            .map((e) => ProductionReport.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
