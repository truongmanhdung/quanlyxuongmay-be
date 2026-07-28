class Worker {
  final String id;
  final String code;
  final String name;
  final String? phone;
  final String? note;
  final bool active;
  final DateTime createdAt;

  Worker({
    required this.id,
    required this.code,
    required this.name,
    this.phone,
    this.note,
    required this.active,
    required this.createdAt,
  });

  factory Worker.fromJson(Map<String, dynamic> json) => Worker(
        id: json['_id'] as String,
        code: json['code'] as String,
        name: json['name'] as String,
        phone: json['phone'] as String?,
        note: json['note'] as String?,
        active: json['active'] as bool? ?? true,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}

class WorkerRef {
  final String id;
  final String code;
  final String name;

  WorkerRef({required this.id, required this.code, required this.name});

  factory WorkerRef.fromJson(Map<String, dynamic> json) => WorkerRef(
        id: json['_id'] as String,
        code: json['code'] as String? ?? '',
        name: json['name'] as String? ?? '',
      );
}
