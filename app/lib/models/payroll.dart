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
  final String from;
  final String to;
  final List<PayrollRow> rows;

  PayrollSummary({required this.from, required this.to, required this.rows});

  factory PayrollSummary.fromJson(Map<String, dynamic> json) => PayrollSummary(
        from: json['from'] as String,
        to: json['to'] as String,
        rows: (json['rows'] as List<dynamic>).map((e) => PayrollRow.fromJson(e as Map<String, dynamic>)).toList(),
      );
}

class PayrollSlip {
  final String id;
  final DateTime periodFrom;
  final DateTime periodTo;
  final double totalQuantity;
  final double totalAmount;
  final int reportCount;
  final DateTime issuedAt;

  PayrollSlip({
    required this.id,
    required this.periodFrom,
    required this.periodTo,
    required this.totalQuantity,
    required this.totalAmount,
    required this.reportCount,
    required this.issuedAt,
  });

  factory PayrollSlip.fromJson(Map<String, dynamic> json) => PayrollSlip(
        id: json['_id'] as String,
        periodFrom: DateTime.parse(json['periodFrom'] as String),
        periodTo: DateTime.parse(json['periodTo'] as String),
        totalQuantity: (json['totalQuantity'] as num).toDouble(),
        totalAmount: (json['totalAmount'] as num).toDouble(),
        reportCount: json['reportCount'] as int? ?? 0,
        issuedAt: DateTime.parse(json['issuedAt'] as String),
      );
}

class PayrollDetail {
  final String from;
  final String to;
  final double totalQuantity;
  final double totalAmount;
  final List<ProductionReport> reports;

  PayrollDetail({
    required this.from,
    required this.to,
    required this.totalQuantity,
    required this.totalAmount,
    required this.reports,
  });

  factory PayrollDetail.fromJson(Map<String, dynamic> json) => PayrollDetail(
        from: json['from'] as String,
        to: json['to'] as String,
        totalQuantity: (json['totalQuantity'] as num).toDouble(),
        totalAmount: (json['totalAmount'] as num).toDouble(),
        reports: (json['reports'] as List<dynamic>)
            .map((e) => ProductionReport.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
