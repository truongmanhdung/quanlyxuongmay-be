import '../core/api_client.dart';
import '../models/attendance.dart';

class AttendanceService {
  final ApiClient api;
  AttendanceService(this.api);

  Future<Attendance> checkIn() async {
    final res = await api.post('/attendance/check-in');
    return Attendance.fromJson(res as Map<String, dynamic>);
  }

  Future<Attendance> checkOut() async {
    final res = await api.post('/attendance/check-out');
    return Attendance.fromJson(res as Map<String, dynamic>);
  }

  Future<Attendance?> today() async {
    final res = await api.get('/attendance/today');
    return res == null ? null : Attendance.fromJson(res as Map<String, dynamic>);
  }

  Future<List<Attendance>> mine({String? period}) async {
    final res = await api.get('/attendance/mine', query: {'period': period ?? ''});
    return (res as List<dynamic>).map((e) => Attendance.fromJson(e as Map<String, dynamic>)).toList();
  }
}
