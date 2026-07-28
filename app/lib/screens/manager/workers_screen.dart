import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/worker.dart';
import '../../services/worker_service.dart';
import '../../widgets/pill_badge.dart';

class WorkersScreen extends StatefulWidget {
  const WorkersScreen({super.key});

  @override
  State<WorkersScreen> createState() => _WorkersScreenState();
}

class _WorkersScreenState extends State<WorkersScreen> {
  List<Worker> workers = [];
  bool loading = true;
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
      final data = await WorkerService(api).list();
      setState(() {
        workers = data;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được danh sách công nhân';
        loading = false;
      });
    }
  }

  Future<void> _showAddDialog() async {
    final codeCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Thêm công nhân'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: codeCtrl,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(labelText: 'Mã đăng nhập (VD: A012)'),
            ),
            const SizedBox(height: 10),
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Họ tên')),
            const SizedBox(height: 10),
            TextField(controller: phoneCtrl, decoration: const InputDecoration(labelText: 'Số điện thoại')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Huỷ')),
          ElevatedButton(
            onPressed: () async {
              if (codeCtrl.text.trim().isEmpty || nameCtrl.text.trim().isEmpty) return;
              final api = ctx.read<ApiClient>();
              try {
                await WorkerService(api)
                    .create(code: codeCtrl.text.trim(), name: nameCtrl.text.trim(), phone: phoneCtrl.text.trim());
                if (ctx.mounted) Navigator.pop(ctx, true);
              } catch (e) {
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Thêm công nhân thất bại')));
                }
              }
            },
            child: const Text('Lưu'),
          ),
        ],
      ),
    );
    if (saved == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Công nhân')),
      floatingActionButton: FloatingActionButton(onPressed: _showAddDialog, child: const Icon(Iconsax.add)),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text(error!, style: const TextStyle(color: AppColors.gray500)))
              : RefreshIndicator(
              onRefresh: _load,
              child: workers.isEmpty
                  ? ListView(children: const [Padding(padding: EdgeInsets.all(32), child: Center(child: Text('Chưa có công nhân nào')))])
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: workers.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, i) {
                        final w = workers[i];
                        return Card(
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: AppColors.brand50,
                              child: Text(w.code.isNotEmpty ? w.code[0] : '?', style: const TextStyle(color: AppColors.brand600)),
                            ),
                            title: Text(w.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                            subtitle: Text('${w.code}${w.phone != null && w.phone!.isNotEmpty ? " · ${w.phone}" : ""}'),
                            trailing: PillBadge(
                              label: w.active ? 'Hoạt động' : 'Ngừng',
                              color: w.active ? AppColors.success500 : AppColors.gray400,
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
