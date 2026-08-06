import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/worker.dart';
import '../../services/worker_service.dart';
import '../../widgets/app_form_sheet.dart';
import '../../widgets/pill_badge.dart';
import '../../widgets/row_icon_button.dart';

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

  Future<void> _showFormSheet({Worker? editing}) async {
    final codeCtrl = TextEditingController(text: editing?.code ?? '');
    final nameCtrl = TextEditingController(text: editing?.name ?? '');
    final phoneCtrl = TextEditingController(text: editing?.phone ?? '');
    String? codeError;
    String? nameError;

    final saved = await showAppFormSheet<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          Future<void> submit() async {
            setSheetState(() {
              codeError = editing == null && codeCtrl.text.trim().isEmpty ? 'Nhập mã đăng nhập' : null;
              nameError = nameCtrl.text.trim().isEmpty ? 'Nhập họ tên' : null;
            });
            if (codeError != null || nameError != null) return;
            final api = ctx.read<ApiClient>();
            try {
              if (editing == null) {
                await WorkerService(api).create(
                  code: codeCtrl.text.trim(),
                  name: nameCtrl.text.trim(),
                  phone: phoneCtrl.text.trim(),
                );
              } else {
                await WorkerService(api).update(
                  editing.id,
                  name: nameCtrl.text.trim(),
                  phone: phoneCtrl.text.trim(),
                );
              }
              if (ctx.mounted) Navigator.pop(ctx, true);
            } catch (e) {
              if (ctx.mounted) {
                ScaffoldMessenger.of(ctx).showSnackBar(
                  SnackBar(content: Text(editing == null ? 'Thêm công nhân thất bại' : 'Sửa công nhân thất bại')),
                );
              }
            }
          }

          return AppFormSheetScaffold(
            title: editing == null ? 'Thêm công nhân' : 'Sửa công nhân',
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: codeCtrl,
                  enabled: editing == null,
                  textCapitalization: TextCapitalization.characters,
                  decoration: InputDecoration(labelText: 'Mã đăng nhập (VD: A012)', errorText: codeError),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: nameCtrl,
                  decoration: InputDecoration(labelText: 'Họ tên', errorText: nameError),
                ),
                const SizedBox(height: 14),
                TextField(controller: phoneCtrl, decoration: const InputDecoration(labelText: 'Số điện thoại')),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Huỷ')),
              ElevatedButton(onPressed: submit, child: const Text('Lưu')),
            ],
          );
        },
      ),
    );
    if (saved == true) _load();
  }

  Future<void> _delete(Worker w) async {
    final api = context.read<ApiClient>();
    final confirmed = await showAppFormSheet<bool>(
      context: context,
      builder: (ctx) => AppFormSheetScaffold(
        title: 'Xoá công nhân',
        content: Text('Xoá công nhân "${w.name}" (${w.code})?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Huỷ')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error500),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Xoá'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await WorkerService(api).remove(w.id);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Xoá công nhân thất bại')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Công nhân')),
      floatingActionButton: FloatingActionButton(onPressed: () => _showFormSheet(), child: const Icon(Iconsax.add)),
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
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                PillBadge(
                                  label: w.active ? 'Hoạt động' : 'Ngừng',
                                  color: w.active ? AppColors.success500 : AppColors.gray400,
                                ),
                                const SizedBox(width: 4),
                                RowIconButton(
                                  icon: Icons.edit_outlined,
                                  color: AppColors.gray500,
                                  onPressed: () => _showFormSheet(editing: w),
                                ),
                                RowIconButton(
                                  icon: Icons.delete_outline,
                                  color: AppColors.error500,
                                  onPressed: () => _delete(w),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
