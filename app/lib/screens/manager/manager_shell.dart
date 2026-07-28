import 'package:animated_bottom_navigation_bar/animated_bottom_navigation_bar.dart';
import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/page_transition.dart';
import '../../core/theme.dart';
import '../../services/notification_service.dart';
import 'batches_screen.dart';
import 'dashboard_screen.dart';
import 'manage_screen.dart';
import 'notifications_screen.dart';
import 'orders_screen.dart';
import 'payroll_screen.dart';

class ManagerShell extends StatefulWidget {
  const ManagerShell({super.key});

  @override
  State<ManagerShell> createState() => _ManagerShellState();
}

class _ManagerShellState extends State<ManagerShell> {
  int index = 0;

  late final _screens = [
    DashboardScreen(onNavigateTab: (i) => setState(() => index = i)),
    const NotificationsScreen(),
    const PayrollScreen(),
    const ManageScreen(),
  ];

  static const _tabs = [
    (outline: Iconsax.chart_square, bold: Iconsax.chart_square_copy, label: 'Tổng quan'),
    (outline: Iconsax.notification, bold: Iconsax.notification_copy, label: 'Thông báo'),
    (outline: Iconsax.wallet_money, bold: Iconsax.wallet_money_copy, label: 'Tính lương'),
    (outline: Iconsax.setting_2, bold: Iconsax.setting_2_copy, label: 'Quản lý'),
  ];

  Future<void> _openQuickActions() async {
    final api = context.read<ApiClient>();
    await showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(color: AppColors.gray200, borderRadius: BorderRadius.circular(999)),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text('Thao tác nhanh', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  ),
                ),
                ListTile(
                  leading: const Icon(Iconsax.notification_bing, color: AppColors.brand500),
                  title: const Text('Nhắc nhân viên báo cáo'),
                  onTap: () async {
                    Navigator.of(sheetContext).pop();
                    try {
                      final count = await NotificationService(api).remindAll();
                      if (!mounted) return;
                      ScaffoldMessenger.of(context)
                          .showSnackBar(SnackBar(content: Text('Đã nhắc $count công nhân chưa gửi sản lượng hôm nay')));
                    } catch (_) {
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Gửi nhắc nhở thất bại')));
                    }
                  },
                ),
                ListTile(
                  leading: const Icon(Iconsax.task_square, color: AppColors.brand500),
                  title: const Text('Thêm lô hàng'),
                  onTap: () {
                    Navigator.of(sheetContext).pop();
                    Navigator.of(context).push(slideRoute(const BatchesScreen()));
                  },
                ),
                ListTile(
                  leading: const Icon(Iconsax.import_2, color: AppColors.brand500),
                  title: const Text('Thêm đơn Nhập / Xuất'),
                  onTap: () {
                    Navigator.of(sheetContext).pop();
                    Navigator.of(context).push(slideRoute(const OrdersScreen()));
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: IndexedStack(index: index, children: _screens),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: FloatingActionButton(
        onPressed: _openQuickActions,
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
        onTap: (i) => setState(() => index = i),
        tabBuilder: (i, isActive) {
          final tab = _tabs[i];
          final color = isActive ? AppColors.brand500 : AppColors.gray400;
          return Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(isActive ? tab.bold : tab.outline, size: 22, color: color),
              const SizedBox(height: 2),
              Text(tab.label, style: TextStyle(fontSize: 11, color: color, fontWeight: isActive ? FontWeight.w600 : FontWeight.w400)),
            ],
          );
        },
      ),
    );
  }
}
