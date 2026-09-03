import 'customer.dart';

class RevenueRow {
  final CustomerRef? customer;
  final int batchCount;
  final double totalQuantity;
  final double totalAmount;

  RevenueRow({
    required this.customer,
    required this.batchCount,
    required this.totalQuantity,
    required this.totalAmount,
  });

  factory RevenueRow.fromJson(Map<String, dynamic> json) => RevenueRow(
        customer: json['customer'] != null ? CustomerRef.fromJson(json['customer'] as Map<String, dynamic>) : null,
        batchCount: json['batchCount'] as int? ?? 0,
        totalQuantity: (json['totalQuantity'] as num?)?.toDouble() ?? 0,
        totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0,
      );
}

class RevenueSummary {
  final String from;
  final String to;
  final List<RevenueRow> rows;

  RevenueSummary({required this.from, required this.to, required this.rows});

  factory RevenueSummary.fromJson(Map<String, dynamic> json) => RevenueSummary(
        from: json['from'] as String,
        to: json['to'] as String,
        rows: (json['rows'] as List<dynamic>).map((e) => RevenueRow.fromJson(e as Map<String, dynamic>)).toList(),
      );
}

class RevenueBatchLine {
  final String batchId;
  final String code;
  final String productName;
  final DateTime? completedAt;
  final double quantity;
  final double unitPrice;
  final double amount;

  RevenueBatchLine({
    required this.batchId,
    required this.code,
    required this.productName,
    required this.completedAt,
    required this.quantity,
    required this.unitPrice,
    required this.amount,
  });

  factory RevenueBatchLine.fromJson(Map<String, dynamic> json) => RevenueBatchLine(
        batchId: json['batch'] as String? ?? '',
        code: json['code'] as String? ?? '',
        productName: json['productName'] as String? ?? '',
        completedAt: json['completedAt'] != null ? DateTime.parse(json['completedAt'] as String) : null,
        quantity: (json['quantity'] as num?)?.toDouble() ?? 0,
        unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0,
        amount: (json['amount'] as num?)?.toDouble() ?? 0,
      );
}

class RevenueDetail {
  final String from;
  final String to;
  final CustomerRef? customer;
  final double totalQuantity;
  final double totalAmount;
  final List<RevenueBatchLine> lines;

  RevenueDetail({
    required this.from,
    required this.to,
    required this.customer,
    required this.totalQuantity,
    required this.totalAmount,
    required this.lines,
  });

  factory RevenueDetail.fromJson(Map<String, dynamic> json) => RevenueDetail(
        from: json['from'] as String,
        to: json['to'] as String,
        customer: json['customer'] != null ? CustomerRef.fromJson(json['customer'] as Map<String, dynamic>) : null,
        totalQuantity: (json['totalQuantity'] as num?)?.toDouble() ?? 0,
        totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0,
        lines: (json['lines'] as List<dynamic>? ?? [])
            .map((e) => RevenueBatchLine.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class RevenueSlip {
  final String id;
  final DateTime periodFrom;
  final DateTime periodTo;
  final double totalQuantity;
  final double totalAmount;
  final int batchCount;
  final DateTime issuedAt;

  RevenueSlip({
    required this.id,
    required this.periodFrom,
    required this.periodTo,
    required this.totalQuantity,
    required this.totalAmount,
    required this.batchCount,
    required this.issuedAt,
  });

  factory RevenueSlip.fromJson(Map<String, dynamic> json) => RevenueSlip(
        id: json['_id'] as String,
        periodFrom: DateTime.parse(json['periodFrom'] as String),
        periodTo: DateTime.parse(json['periodTo'] as String),
        totalQuantity: (json['totalQuantity'] as num?)?.toDouble() ?? 0,
        totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0,
        batchCount: json['batchCount'] as int? ?? 0,
        issuedAt: DateTime.parse(json['issuedAt'] as String),
      );
}
