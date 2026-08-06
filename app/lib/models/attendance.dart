class Attendance {
  final String id;
  final DateTime date;
  final DateTime? checkInAt;
  final DateTime? checkOutAt;

  Attendance({
    required this.id,
    required this.date,
    this.checkInAt,
    this.checkOutAt,
  });

  factory Attendance.fromJson(Map<String, dynamic> json) => Attendance(
        id: json['_id'] as String,
        date: DateTime.parse(json['date'] as String),
        checkInAt: json['checkInAt'] != null ? DateTime.parse(json['checkInAt'] as String) : null,
        checkOutAt: json['checkOutAt'] != null ? DateTime.parse(json['checkOutAt'] as String) : null,
      );
}
