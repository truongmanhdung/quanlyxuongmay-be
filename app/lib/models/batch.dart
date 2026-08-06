import 'customer.dart';
import 'product.dart';

enum BatchStatus { dangLam, chuaHoanThanh, hoanThanh }

BatchStatus batchStatusFromString(String value) {
  switch (value) {
    case 'chua_hoan_thanh':
      return BatchStatus.chuaHoanThanh;
    case 'hoan_thanh':
      return BatchStatus.hoanThanh;
    default:
      return BatchStatus.dangLam;
  }
}

String batchStatusLabel(BatchStatus status) {
  switch (status) {
    case BatchStatus.chuaHoanThanh:
      return 'Chưa hoàn thành';
    case BatchStatus.hoanThanh:
      return 'Hoàn thành';
    case BatchStatus.dangLam:
      return 'Đang làm';
  }
}

class Batch {
  final String id;
  final String code;
  final ProductRef product;
  final CustomerRef customer;
  final double? plannedQuantity;
  final BatchStatus status;
  final String? note;
  final double reportedQuantity;
  final double exportedQuantity;

  Batch({
    required this.id,
    required this.code,
    required this.product,
    required this.customer,
    this.plannedQuantity,
    required this.status,
    this.note,
    required this.reportedQuantity,
    this.exportedQuantity = 0,
  });

  factory Batch.fromJson(Map<String, dynamic> json) => Batch(
        id: json['_id'] as String,
        code: json['code'] as String,
        product: ProductRef.fromJson(json['product'] as Map<String, dynamic>),
        customer: CustomerRef.fromJson(json['customer'] as Map<String, dynamic>),
        plannedQuantity: (json['plannedQuantity'] as num?)?.toDouble(),
        status: batchStatusFromString(json['status'] as String? ?? 'dang_lam'),
        note: json['note'] as String?,
        reportedQuantity: (json['reportedQuantity'] as num?)?.toDouble() ?? 0,
        exportedQuantity: (json['exportedQuantity'] as num?)?.toDouble() ?? 0,
      );
}
