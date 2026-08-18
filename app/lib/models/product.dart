import 'customer.dart';

class ProcessStage {
  final String id;
  final String product;
  final String name;
  final double unitPrice;
  final bool active;

  ProcessStage({
    required this.id,
    required this.product,
    required this.name,
    required this.unitPrice,
    required this.active,
  });

  factory ProcessStage.fromJson(Map<String, dynamic> json) => ProcessStage(
        id: json['_id'] as String,
        product: json['product'] as String? ?? '',
        name: json['name'] as String,
        unitPrice: (json['unitPrice'] as num).toDouble(),
        active: json['active'] as bool? ?? true,
      );
}

class Product {
  final String id;
  final String name;
  // co the null neu khach hang da bi xoa sau khi tao mau hang
  final CustomerRef? customer;
  final String? unit;
  final double standardPrice;
  final bool active;
  final DateTime createdAt;
  final List<ProcessStage> stages;

  Product({
    required this.id,
    required this.name,
    required this.customer,
    this.unit,
    required this.standardPrice,
    required this.active,
    required this.createdAt,
    this.stages = const [],
  });

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['_id'] as String,
        name: json['name'] as String,
        customer: json['customer'] != null ? CustomerRef.fromJson(json['customer'] as Map<String, dynamic>) : null,
        unit: json['unit'] as String?,
        standardPrice: (json['standardPrice'] as num?)?.toDouble() ?? 0,
        active: json['active'] as bool? ?? true,
        createdAt: DateTime.parse(json['createdAt'] as String),
        stages: (json['stages'] as List<dynamic>? ?? [])
            .map((e) => ProcessStage.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class ProductRef {
  final String id;
  final String name;
  final String? unit;

  ProductRef({required this.id, required this.name, this.unit});

  factory ProductRef.fromJson(Map<String, dynamic> json) => ProductRef(
        id: json['_id'] as String,
        name: json['name'] as String? ?? '',
        unit: json['unit'] as String?,
      );
}

class ProcessStageRef {
  final String id;
  final String name;
  final double unitPrice;

  ProcessStageRef({required this.id, required this.name, required this.unitPrice});

  factory ProcessStageRef.fromJson(Map<String, dynamic> json) => ProcessStageRef(
        id: json['_id'] as String,
        name: json['name'] as String? ?? '',
        unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0,
      );
}
