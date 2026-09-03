import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/page_transition.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/notification_service.dart';
import 'change_password_screen.dart';
import 'customers_screen.dart';
import 'defects_screen.dart';
import 'orders_screen.dart';
import 'products_screen.dart';
import 'revenue_screen.dart';
import 'stock_screen.dart';
import 'workers_screen.dart';

class ManageScreen extends StatefulWidget {
  const ManageScreen({super.key});

  @override
  State<ManageScreen> createState() => _ManageScreenState();
}

class _ManageScreenState extends State<ManageScreen> {
  bool reminding = false;

  Future<void> _remindAll() async {
    setState(() => reminding = true);
    final api = context.read<ApiClient>();
    try {
      final count = await NotificationService(api).remindAll();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Đã nhắc $count công nhân chưa gửi sản lượng hôm nay')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Gửi nhắc nhở thất bại')));
      }
    } finally {
      if (mounted) setState(() => reminding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Quản lý')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: AppColors.brand500,
                    child: Text(
                      (auth.adminUser?.name.isNotEmpty ?? false) ? auth.adminUser!.name[0].toUpperCase() : 'Q',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 18),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(auth.adminUser?.name ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                        Text('@${auth.adminUser?.username ?? ''}', style: TextStyle(color: AppColors.gray500, fontSize: 12.5)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          _MenuTile(
            icon: Iconsax.people,
            title: 'Khách hàng',
            subtitle: 'Danh sách khách hàng đặt gia công',
            onTap: () => Navigator.of(context).push(slideRoute(const CustomersScreen())),
          ),
          _MenuTile(
            icon: Iconsax.box,
            title: 'Mẫu hàng',
            subtitle: 'Mã hàng, công đoạn và đơn giá',
            onTap: () => Navigator.of(context).push(slideRoute(const ProductsScreen())),
          ),
          _MenuTile(
            icon: Iconsax.user_tag,
            title: 'Công nhân',
            subtitle: 'Mã đăng nhập cấp cho công nhân',
            onTap: () => Navigator.of(context).push(slideRoute(const WorkersScreen())),
          ),
          _MenuTile(
            icon: Iconsax.import_2,
            title: 'Nhập / Xuất',
            subtitle: 'Nhập: khách giao vải · Xuất: trả hàng thành phẩm',
            onTap: () => Navigator.of(context).push(slideRoute(const OrdersScreen())),
          ),
          _MenuTile(
            icon: Iconsax.chart_2,
            title: 'Tồn kho',
            subtitle: 'Đã nhập, đã xuất, còn lại theo từng khách hàng',
            onTap: () => Navigator.of(context).push(slideRoute(const StockScreen())),
          ),
          _MenuTile(
            icon: Iconsax.danger,
            title: 'Hàng lỗi / Hoàn trả',
            subtitle: 'Thống kê hàng hỏng, khách trả lại',
            onTap: () => Navigator.of(context).push(slideRoute(const DefectsScreen())),
          ),
          _MenuTile(
            icon: Iconsax.chart_success,
            title: 'Doanh thu khách hàng',
            subtitle: 'Doanh thu theo kỳ từ các lô hàng đã hoàn thành',
            onTap: () => Navigator.of(context).push(slideRoute(const RevenueScreen())),
          ),
          _MenuTile(
            icon: Iconsax.lock,
            title: 'Đổi mật khẩu',
            subtitle: 'Cập nhật mật khẩu đăng nhập quản lý',
            onTap: () => Navigator.of(context).push(slideRoute(const ChangePasswordScreen())),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: reminding ? null : _remindAll,
            icon: Icon(Iconsax.notification_bing, color: reminding ? AppColors.gray400 : AppColors.brand500),
            label: Text(
              reminding ? 'Đang gửi...' : 'Nhắc nhân viên báo cáo',
              style: TextStyle(color: reminding ? AppColors.gray400 : AppColors.brand500),
            ),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () => auth.logout(),
            icon: const Icon(Iconsax.logout, color: AppColors.error500),
            label: const Text('Đăng xuất', style: TextStyle(color: AppColors.error500)),
          ),
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _MenuTile({required this.icon, required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: Container(
          width: 44,
          height: 44,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppColors.brand500.withValues(alpha: 0.16), AppColors.brand500.withValues(alpha: 0.06)],
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: AppColors.brand500, size: 22),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle, style: TextStyle(color: AppColors.gray500, fontSize: 12.5)),
        trailing: Icon(Icons.chevron_right_rounded, color: AppColors.gray400),
        onTap: onTap,
      ),
    );
  }
}
