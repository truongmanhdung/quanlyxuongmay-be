import 'dart:async';
import 'package:animated_bottom_navigation_bar/animated_bottom_navigation_bar.dart';
import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/socket_service.dart';
import '../../core/theme.dart';
import '../../services/notification_service.dart';
import 'account_screen.dart';
import 'history_screen.dart';
import 'submit_screen.dart';
import 'worker_notifications_screen.dart';

class WorkerShell extends StatefulWidget {
  const WorkerShell({super.key});

  @override
  State<WorkerShell> createState() => _WorkerShellState();
}

class _WorkerShellState extends State<WorkerShell> {
  int index = 0;
  int unreadCount = 0;
  Timer? _timer;
  late final SocketService _socket;

  void _handleNotificationNew(dynamic _) => _refreshUnread();

  void _handleReportStatus(dynamic data) {
    _refreshUnread();
    final status = data is Map ? data['status'] as String? : null;
    final label = status == 'confirmed'
        ? 'đã được xác nhận'
        : status == 'rejected'
            ? 'đã bị từ chối'
            : 'đã được cập nhật';
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Báo cáo sản lượng của bạn $label')),
      );
    }
  }

  static const _tabs = [
    (outline: Iconsax.add_square, bold: Iconsax.add_square_copy, label: 'Gửi sản lượng'),
    (outline: Iconsax.clock, bold: Iconsax.clock_copy, label: 'Lịch sử'),
    (outline: Iconsax.notification, bold: Iconsax.notification_copy, label: 'Thông báo'),
    (outline: Iconsax.profile_circle, bold: Iconsax.profile_circle_copy, label: 'Tài khoản'),
  ];

  @override
  void initState() {
    super.initState();
    _refreshUnread();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _refreshUnread());
    _socket = context.read<SocketService>();
    _socket.on('notification:new', _handleNotificationNew);
    _socket.on('report:status', _handleReportStatus);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _socket.off('notification:new', _handleNotificationNew);
    _socket.off('report:status', _handleReportStatus);
    super.dispose();
  }

  Future<void> _refreshUnread() async {
    final api = context.read<ApiClient>();
    try {
      final items = await NotificationService(api).mine();
      if (mounted) setState(() => unreadCount = items.where((n) => !n.read).length);
    } catch (_) {
      // bo qua loi mang, giu nguyen so cu
    }
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      const SubmitScreen(),
      const HistoryScreen(),
      WorkerNotificationsScreen(onChanged: _refreshUnread),
      const AccountScreen(),
    ];
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: IndexedStack(index: index, children: screens),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: FloatingActionButton(
        onPressed: () => setState(() => index = 0),
        child: const Icon(Iconsax.add),
      ),
      bottomNavigationBar: AnimatedBottomNavigationBar.builder(
        itemCount: _tabs.length,
        activeIndex: index,
        gapLocation: GapLocation.center,
        notchSmoothness: NotchSmoothness.softEdge,
        backgroundColor: isDark ? const Color(0xFF101828) : Colors.white,
        elevation: 12,
        leftCornerRadius: 24,
        rightCornerRadius: 24,
        notchMargin: 10,
        onTap: (i) {
          setState(() => index = i);
          if (i == 2) _refreshUnread();
        },
        tabBuilder: (i, isActive) {
          final tab = _tabs[i];
          final color = isActive ? AppColors.brand500 : AppColors.gray400;
          Widget icon = Icon(isActive ? tab.bold : tab.outline, size: 22, color: color);
          if (i == 2 && unreadCount > 0) {
            icon = Badge(label: Text('$unreadCount'), child: icon);
          }
          return Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              icon,
              const SizedBox(height: 2),
              Text(tab.label, style: TextStyle(fontSize: 11, color: color, fontWeight: isActive ? FontWeight.w600 : FontWeight.w400)),
            ],
          );
        },
      ),
    );
  }
}
