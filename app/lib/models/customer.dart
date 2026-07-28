class Customer {
  final String id;
  final String code;
  final String name;
  final String? phone;
  final String? note;
  final bool active;
  final DateTime createdAt;

  Customer({
    required this.id,
    required this.code,
    required this.name,
    this.phone,
    this.note,
    required this.active,
    required this.createdAt,
  });

  factory Customer.fromJson(Map<String, dynamic> json) => Customer(
        id: json['_id'] as String,
        code: json['code'] as String,
        name: json['name'] as String,
        phone: json['phone'] as String?,
        note: json['note'] as String?,
        active: json['active'] as bool? ?? true,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}

class CustomerRef {
  final String id;
  final String code;
  final String name;

  CustomerRef({required this.id, required this.code, required this.name});

  factory CustomerRef.fromJson(Map<String, dynamic> json) => CustomerRef(
        id: json['_id'] as String,
        code: json['code'] as String? ?? '',
        name: json['name'] as String? ?? '',
      );
}
