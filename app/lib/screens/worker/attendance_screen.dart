import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../models/attendance.dart';
import '../../services/attendance_service.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  Attendance? today;
  bool loading = true;
  bool submitting = false;
  String? error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    final api = context.read<ApiClient>();
    try {
      final data = await AttendanceService(api).today();
      setState(() {
        today = data;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được trạng thái chấm công';
        loading = false;
      });
    }
  }

  bool get _canCheckIn => today?.checkInAt == null;
  bool get _canCheckOut => today?.checkInAt != null && today?.checkOutAt == null;
  bool get _done => today?.checkInAt != null && today?.checkOutAt != null;

  String get _statusText {
    if (_done) return 'Đã chấm công ra lúc ${formatTime(today!.checkOutAt!)}';
    if (_canCheckOut) return 'Đã chấm công vào lúc ${formatTime(today!.checkInAt!)}';
    return 'Chưa chấm công hôm nay';
  }

  Future<void> _handleCheckIn() async {
    setState(() {
      submitting = true;
      error = null;
    });
    final api = context.read<ApiClient>();
    try {
      final result = await AttendanceService(api).checkIn();
      if (!mounted) return;
      setState(() => today = result);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đã chấm công vào lúc ${formatTime(result.checkInAt!)}'),
          backgroundColor: AppColors.success500,
        ),
      );
    } on ApiException catch (e) {
      setState(() => error = e.message);
    } catch (e) {
      setState(() => error = 'Chấm công vào thất bại');
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }

  Future<void> _handleCheckOut() async {
    setState(() {
      submitting = true;
      error = null;
    });
    final api = context.read<ApiClient>();
    try {
      final result = await AttendanceService(api).checkOut();
      if (!mounted) return;
      setState(() => today = result);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đã chấm công ra lúc ${formatTime(result.checkOutAt!)}'),
          backgroundColor: AppColors.success500,
        ),
      );
    } on ApiException catch (e) {
      setState(() => error = e.message);
    } catch (e) {
      setState(() => error = 'Chấm công ra thất bại');
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chấm công')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (error != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.error500.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(error!, style: const TextStyle(color: AppColors.error500)),
                    ),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.brand50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Trạng thái hôm nay', style: TextStyle(color: AppColors.brand700)),
                        Text(
                          _statusText,
                          style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.brand700),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: submitting || _done ? null : (_canCheckIn ? _handleCheckIn : _handleCheckOut),
                    child: submitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Text(_done
                            ? 'Đã hoàn tất chấm công hôm nay'
                            : (_canCheckIn ? 'Chấm công vào' : 'Chấm công ra')),
                  ),
                ],
              ),
            ),
    );
  }
}
