import 'customer.dart';

class RevenueRow {
  final CustomerRef? customer;
  final int orderCount;
  final double totalQuantity;
  final double totalAmount;

  RevenueRow({
    required this.customer,
    required this.orderCount,
    required this.totalQuantity,
    required this.totalAmount,
  });

  factory RevenueRow.fromJson(Map<String, dynamic> json) => RevenueRow(
        customer: json['customer'] != null ? CustomerRef.fromJson(json['customer'] as Map<String, dynamic>) : null,
        orderCount: json['orderCount'] as int? ?? 0,
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

class RevenueStage {
  final String name;
  final double unitPrice;
  RevenueStage({required this.name, required this.unitPrice});

  factory RevenueStage.fromJson(Map<String, dynamic> json) => RevenueStage(
        name: json['name'] as String? ?? '',
        unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0,
      );
}

class RevenueExportLine {
  final String orderId;
  final String orderCode;
  final DateTime? date;
  final String productName;
  final double quantity;
  final double unitPrice;
  final double amount;
  final List<RevenueStage> stages;
  final double stageCost; // tong don gia gia cong 1 sp
  final double grossMargin; // don gia ban - chi phi cong doan

  RevenueExportLine({
    required this.orderId,
    required this.orderCode,
    required this.date,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    required this.amount,
    required this.stages,
    required this.stageCost,
    required this.grossMargin,
  });

  factory RevenueExportLine.fromJson(Map<String, dynamic> json) => RevenueExportLine(
        orderId: json['order'] as String? ?? '',
        orderCode: json['orderCode'] as String? ?? '',
        date: json['date'] != null ? DateTime.parse(json['date'] as String) : null,
        productName: json['productName'] as String? ?? '',
        quantity: (json['quantity'] as num?)?.toDouble() ?? 0,
        unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0,
        amount: (json['amount'] as num?)?.toDouble() ?? 0,
        stages: (json['stages'] as List<dynamic>? ?? [])
            .map((e) => RevenueStage.fromJson(e as Map<String, dynamic>))
            .toList(),
        stageCost: (json['stageCost'] as num?)?.toDouble() ?? 0,
        grossMargin: (json['grossMargin'] as num?)?.toDouble() ?? 0,
      );
}

class RevenueDetail {
  final String from;
  final String to;
  final CustomerRef? customer;
  final double totalQuantity;
  final double totalAmount;
  final List<RevenueExportLine> lines;

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
            .map((e) => RevenueExportLine.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class RevenueSlip {
  final String id;
  final DateTime periodFrom;
  final DateTime periodTo;
  final double totalQuantity;
  final double totalAmount;
  final int orderCount;
  final DateTime issuedAt;

  RevenueSlip({
    required this.id,
    required this.periodFrom,
    required this.periodTo,
    required this.totalQuantity,
    required this.totalAmount,
    required this.orderCount,
    required this.issuedAt,
  });

  factory RevenueSlip.fromJson(Map<String, dynamic> json) => RevenueSlip(
        id: json['_id'] as String,
        periodFrom: DateTime.parse(json['periodFrom'] as String),
        periodTo: DateTime.parse(json['periodTo'] as String),
        totalQuantity: (json['totalQuantity'] as num?)?.toDouble() ?? 0,
        totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0,
        orderCount: json['orderCount'] as int? ?? 0,
        issuedAt: DateTime.parse(json['issuedAt'] as String),
      );
}
