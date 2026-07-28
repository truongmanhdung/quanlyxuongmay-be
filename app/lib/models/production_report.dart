import 'customer.dart';
import 'product.dart';
import 'worker.dart';

enum ReportStatus { pending, confirmed, rejected }

ReportStatus reportStatusFromString(String value) {
  switch (value) {
    case 'pending':
      return ReportStatus.pending;
    case 'rejected':
      return ReportStatus.rejected;
    default:
      return ReportStatus.confirmed;
  }
}

class ProductionReport {
  final String id;
  final WorkerRef worker;
  final CustomerRef customer;
  final ProductRef product;
  final ProcessStageRef processStage;
  final String? batchNumber;
  final double quantity;
  final double unitPrice;
  final double amount;
  final ReportStatus status;
  final DateTime workDate;
  final DateTime createdAt;

  ProductionReport({
    required this.id,
    required this.worker,
    required this.customer,
    required this.product,
    required this.processStage,
    this.batchNumber,
    required this.quantity,
    required this.unitPrice,
    required this.amount,
    required this.status,
    required this.workDate,
    required this.createdAt,
  });

  factory ProductionReport.fromJson(Map<String, dynamic> json) => ProductionReport(
        id: json['_id'] as String,
        worker: WorkerRef.fromJson(json['worker'] as Map<String, dynamic>),
        customer: CustomerRef.fromJson(json['customer'] as Map<String, dynamic>),
        product: ProductRef.fromJson(json['product'] as Map<String, dynamic>),
        processStage: ProcessStageRef.fromJson(json['processStage'] as Map<String, dynamic>),
        batchNumber: json['batchNumber'] as String?,
        quantity: (json['quantity'] as num).toDouble(),
        unitPrice: (json['unitPrice'] as num).toDouble(),
        amount: (json['amount'] as num).toDouble(),
        status: reportStatusFromString(json['status'] as String? ?? 'confirmed'),
        workDate: DateTime.parse(json['workDate'] as String),
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}
