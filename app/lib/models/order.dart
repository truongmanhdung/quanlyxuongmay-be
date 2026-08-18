import 'customer.dart';
import 'product.dart';

class OrderDetail {
  final String id;
  final ProductRef? product;
  final String? batchId;
  final String? batchCode;
  final double quantity;
  final double unitPrice;

  OrderDetail({
    required this.id,
    required this.product,
    this.batchId,
    this.batchCode,
    required this.quantity,
    required this.unitPrice,
  });

  factory OrderDetail.fromJson(Map<String, dynamic> json) {
    final batch = json['batch'];
    return OrderDetail(
      id: json['_id'] as String,
      product: json['product'] is Map<String, dynamic> ? ProductRef.fromJson(json['product'] as Map<String, dynamic>) : null,
      batchId: batch is Map<String, dynamic> ? batch['_id'] as String? : (batch is String ? batch : null),
      batchCode: batch is Map<String, dynamic> ? batch['code'] as String? : null,
      quantity: (json['quantity'] as num).toDouble(),
      unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0,
    );
  }
}

class Order {
  final String id;
  final String code;
  final String type; // nhap | xuat
  // co the null neu khach hang da bi xoa sau khi tao don hang
  final CustomerRef? customer;
  final DateTime date;
  final String? note;
  final List<OrderDetail> details;

  Order({
    required this.id,
    required this.code,
    required this.type,
    required this.customer,
    required this.date,
    this.note,
    this.details = const [],
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: json['_id'] as String,
        code: json['code'] as String,
        type: json['type'] as String,
        customer: json['customer'] != null ? CustomerRef.fromJson(json['customer'] as Map<String, dynamic>) : null,
        date: DateTime.parse(json['date'] as String),
        note: json['note'] as String?,
        details: (json['details'] as List<dynamic>? ?? [])
            .map((e) => OrderDetail.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class StockSummaryRow {
  final ProductRef product;
  final double imported;
  final double exported;
  final double remaining;

  StockSummaryRow({required this.product, required this.imported, required this.exported, required this.remaining});

  factory StockSummaryRow.fromJson(Map<String, dynamic> json) => StockSummaryRow(
        product: ProductRef.fromJson(json['product'] as Map<String, dynamic>),
        imported: (json['imported'] as num).toDouble(),
        exported: (json['exported'] as num).toDouble(),
        remaining: (json['remaining'] as num).toDouble(),
      );
}
