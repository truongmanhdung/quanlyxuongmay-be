import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final worker = auth.workerAccount;
    return Scaffold(
      appBar: AppBar(title: const Text('Tài khoản')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: Column(
              children: [
                CircleAvatar(
                  radius: 40,
                  backgroundColor: AppColors.brand500,
                  child: Text(
                    (worker != null && worker.name.isNotEmpty) ? worker.name[0].toUpperCase() : '?',
                    style: const TextStyle(fontSize: 28, color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(height: 14),
                Text(worker?.name ?? '', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('Mã đăng nhập: ${worker?.code ?? ''}', style: TextStyle(color: AppColors.gray500)),
                if (worker?.phone != null && worker!.phone!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text('SĐT: ${worker.phone}', style: TextStyle(color: AppColors.gray500)),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 32),
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
