import 'customer.dart';
import 'product.dart';

class OrderDetail {
  final String id;
  final ProductRef? product;
  final double quantity;
  final double unitPrice;

  OrderDetail({required this.id, required this.product, required this.quantity, required this.unitPrice});

  factory OrderDetail.fromJson(Map<String, dynamic> json) => OrderDetail(
        id: json['_id'] as String,
        product: json['product'] is Map<String, dynamic> ? ProductRef.fromJson(json['product'] as Map<String, dynamic>) : null,
        quantity: (json['quantity'] as num).toDouble(),
        unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0,
      );
}

class Order {
  final String id;
  final String code;
  final String type; // nhap | xuat
  final CustomerRef customer;
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
        customer: CustomerRef.fromJson(json['customer'] as Map<String, dynamic>),
        date: DateTime.parse(json['date'] as String),
        note: json['note'] as String?,
        details: (json['details'] as List<dynamic>? ?? [])
            .map((e) => OrderDetail.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
