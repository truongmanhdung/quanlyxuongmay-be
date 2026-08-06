import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/customer.dart';
import '../../services/customer_service.dart';
import '../../widgets/pill_badge.dart';

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  List<Customer> customers = [];
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
      final data = await CustomerService(api).list();
      setState(() {
        customers = data;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được danh sách khách hàng';
        loading = false;
      });
    }
  }

  Future<void> _showFormDialog({Customer? editing}) async {
    final codeCtrl = TextEditingController(text: editing?.code ?? '');
    final nameCtrl = TextEditingController(text: editing?.name ?? '');
    final phoneCtrl = TextEditingController(text: editing?.phone ?? '');
    String? codeError;
    String? nameError;

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text(editing == null ? 'Thêm khách hàng' : 'Sửa khách hàng'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: codeCtrl,
                  enabled: editing == null,
                  textCapitalization: TextCapitalization.characters,
                  decoration: InputDecoration(labelText: 'Mã khách hàng', errorText: codeError),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: nameCtrl,
                  decoration: InputDecoration(labelText: 'Tên khách hàng', errorText: nameError),
                ),
                const SizedBox(height: 10),
                TextField(controller: phoneCtrl, decoration: const InputDecoration(labelText: 'Số điện thoại')),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Huỷ')),
            ElevatedButton(
              onPressed: () async {
                setDialogState(() {
                  codeError = editing == null && codeCtrl.text.trim().isEmpty ? 'Nhập mã khách hàng' : null;
                  nameError = nameCtrl.text.trim().isEmpty ? 'Nhập tên khách hàng' : null;
                });
                if (codeError != null || nameError != null) return;
                final api = ctx.read<ApiClient>();
                try {
                  if (editing == null) {
                    await CustomerService(api).create(
                      code: codeCtrl.text.trim(),
                      name: nameCtrl.text.trim(),
                      phone: phoneCtrl.text.trim(),
                    );
                  } else {
                    await CustomerService(api).update(
                      editing.id,
                      name: nameCtrl.text.trim(),
                      phone: phoneCtrl.text.trim(),
                    );
                  }
                  if (ctx.mounted) Navigator.pop(ctx, true);
                } catch (e) {
                  if (ctx.mounted) {
                    ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text(editing == null ? 'Thêm khách hàng thất bại' : 'Sửa khách hàng thất bại')));
                  }
                }
              },
              child: const Text('Lưu'),
            ),
          ],
        ),
      ),
    );
    if (saved == true) _load();
  }

  Future<void> _delete(Customer c) async {
    final api = context.read<ApiClient>();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xoá khách hàng'),
        content: Text('Xoá khách hàng "${c.name}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Huỷ')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Xoá')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await CustomerService(api).remove(c.id);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Xoá khách hàng thất bại')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Khách hàng')),
      floatingActionButton: FloatingActionButton(onPressed: () => _showFormDialog(), child: const Icon(Iconsax.add)),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text(error!, style: const TextStyle(color: AppColors.gray500)))
              : RefreshIndicator(
              onRefresh: _load,
              child: customers.isEmpty
                  ? ListView(children: const [Padding(padding: EdgeInsets.all(32), child: Center(child: Text('Chưa có khách hàng nào')))])
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: customers.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, i) {
                        final c = customers[i];
                        return Card(
                          child: ListTile(
                            title: Text(c.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                            subtitle: Text('${c.code}${c.phone != null && c.phone!.isNotEmpty ? " · ${c.phone}" : ""}'),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                PillBadge(
                                  label: c.active ? 'Hoạt động' : 'Ngừng',
                                  color: c.active ? AppColors.success500 : AppColors.gray400,
                                ),
                                IconButton(
                                  icon: const Icon(Iconsax.edit_2, size: 18),
                                  onPressed: () => _showFormDialog(editing: c),
                                ),
                                IconButton(
                                  icon: const Icon(Iconsax.trash, size: 18, color: AppColors.error500),
                                  onPressed: () => _delete(c),
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
