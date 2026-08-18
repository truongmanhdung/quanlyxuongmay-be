import 'customer.dart';
import 'product.dart';

enum DefectType { hong, traLai }

DefectType defectTypeFromString(String value) => value == 'tra_lai' ? DefectType.traLai : DefectType.hong;

String defectTypeLabel(DefectType type) => type == DefectType.traLai ? 'Khách trả lại' : 'Hàng hỏng';

class DefectReport {
  final String id;
  // co the null neu mau hang / khach hang da bi xoa sau khi tao bao cao loi
  final ProductRef? product;
  final CustomerRef? customer;
  final double quantity;
  final DefectType type;
  final String? reason;
  final DateTime reportedAt;

  DefectReport({
    required this.id,
    required this.product,
    required this.customer,
    required this.quantity,
    required this.type,
    this.reason,
    required this.reportedAt,
  });

  factory DefectReport.fromJson(Map<String, dynamic> json) => DefectReport(
        id: json['_id'] as String,
        product: json['product'] != null ? ProductRef.fromJson(json['product'] as Map<String, dynamic>) : null,
        customer: json['customer'] != null ? CustomerRef.fromJson(json['customer'] as Map<String, dynamic>) : null,
        quantity: (json['quantity'] as num).toDouble(),
        type: defectTypeFromString(json['type'] as String? ?? 'hong'),
        reason: json['reason'] as String?,
        reportedAt: DateTime.parse(json['reportedAt'] as String),
      );
}
