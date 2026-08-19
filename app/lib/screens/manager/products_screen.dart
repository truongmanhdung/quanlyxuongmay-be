import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/page_transition.dart';
import '../../core/theme.dart';
import '../../models/customer.dart';
import '../../models/product.dart';
import '../../services/customer_service.dart';
import '../../services/product_service.dart';
import '../../widgets/app_form_sheet.dart';
import '../../widgets/pill_badge.dart';
import '../../widgets/row_icon_button.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _StageRowControllers {
  final nameCtrl = TextEditingController();
  final priceCtrl = TextEditingController();
}

class _ProductsScreenState extends State<ProductsScreen> {
  List<Product> products = [];
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
      final results = await Future.wait([ProductService(api).list(), CustomerService(api).list(active: true)]);
      setState(() {
        products = results[0] as List<Product>;
        customers = results[1] as List<Customer>;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được danh sách mẫu hàng';
        loading = false;
      });
    }
  }

  Future<void> _showAddDialog() async {
    if (customers.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cần có khách hàng trước khi thêm mẫu hàng')));
      return;
    }
    final nameCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    Customer selected = customers.first;
    final stageRows = <_StageRowControllers>[_StageRowControllers()];

    String? nameError;
    final Map<int, String?> stageNameErrors = {};
    final Map<int, String?> stagePriceErrors = {};

    final saved = await showAppFormSheet<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          Future<void> submit() async {
            setSheetState(() {
              nameError = nameCtrl.text.trim().isEmpty ? 'Vui lòng nhập tên hàng' : null;
              stageNameErrors.clear();
              stagePriceErrors.clear();
              for (var i = 0; i < stageRows.length; i++) {
                final hasName = stageRows[i].nameCtrl.text.trim().isNotEmpty;
                final hasPrice = stageRows[i].priceCtrl.text.trim().isNotEmpty;
                if (hasName != hasPrice) {
                  if (!hasName) stageNameErrors[i] = 'Nhập tên công đoạn';
                  if (!hasPrice) stagePriceErrors[i] = 'Nhập đơn giá';
                }
              }
            });
            if (nameError != null || stageNameErrors.isNotEmpty || stagePriceErrors.isNotEmpty) return;

            final api = ctx.read<ApiClient>();
            try {
              final stages = <Map<String, dynamic>>[];
              for (final row in stageRows) {
                final n = row.nameCtrl.text.trim();
                final p = row.priceCtrl.text.trim();
                if (n.isNotEmpty && p.isNotEmpty) {
                  stages.add({'name': n, 'unitPrice': double.tryParse(p) ?? 0});
                }
              }
              await ProductService(api).create(
                name: nameCtrl.text.trim(),
                customer: selected.id,
                standardPrice: double.tryParse(priceCtrl.text) ?? 0,
                stages: stages,
              );
              if (ctx.mounted) Navigator.pop(ctx, true);
            } catch (e) {
              if (ctx.mounted) {
                ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Thêm mẫu hàng thất bại')));
              }
            }
          }

          return AppFormSheetScaffold(
            title: 'Thêm mẫu hàng',
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                DropdownButtonFormField<Customer>(
                  initialValue: selected,
                  decoration: const InputDecoration(labelText: 'Khách hàng'),
                  items: customers.map((c) => DropdownMenuItem(value: c, child: Text(c.name))).toList(),
                  onChanged: (c) => setSheetState(() => selected = c!),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: nameCtrl,
                  decoration: InputDecoration(labelText: 'Tên hàng', errorText: nameError),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: priceCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Đơn giá chuẩn'),
                ),
                const SizedBox(height: 22),
                Text('Công đoạn & đơn giá', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.gray800)),
                const SizedBox(height: 10),
                ...List.generate(stageRows.length, (i) {
                  final row = stageRows[i];
                  return _StageBlock(
                    index: i,
                    nameCtrl: row.nameCtrl,
                    priceCtrl: row.priceCtrl,
                    nameError: stageNameErrors[i],
                    priceError: stagePriceErrors[i],
                    onRemove: stageRows.length > 1
                        ? () => setSheetState(() {
                              stageRows.removeAt(i);
                              stageNameErrors.remove(i);
                              stagePriceErrors.remove(i);
                            })
                        : null,
                  );
                }),
                const SizedBox(height: 4),
                OutlinedButton.icon(
                  onPressed: () => setSheetState(() => stageRows.add(_StageRowControllers())),
                  icon: const Icon(Icons.add_rounded, size: 18),
                  label: const Text('Thêm công đoạn'),
                ),
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

  Future<void> _openStages(Product p) async {
    await Navigator.of(context).push(slideRoute(_StagesScreen(product: p)));
    _load();
  }

  Future<void> _showEditDialog(Product p) async {
    final nameCtrl = TextEditingController(text: p.name);
    final unitCtrl = TextEditingController(text: p.unit ?? '');
    final priceCtrl = TextEditingController(text: p.standardPrice.toString());
    String? nameError;

    final saved = await showAppFormSheet<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          Future<void> submit() async {
            setSheetState(() {
              nameError = nameCtrl.text.trim().isEmpty ? 'Vui lòng nhập tên hàng' : null;
            });
            if (nameError != null) return;
            final api = ctx.read<ApiClient>();
            try {
              await ProductService(api).update(
                p.id,
                name: nameCtrl.text.trim(),
                unit: unitCtrl.text.trim(),
                standardPrice: double.tryParse(priceCtrl.text) ?? 0,
              );
              if (ctx.mounted) Navigator.pop(ctx, true);
            } catch (e) {
              if (ctx.mounted) {
                ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Sửa mẫu hàng thất bại')));
              }
            }
          }

          return AppFormSheetScaffold(
            title: 'Sửa mẫu hàng',
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: nameCtrl,
                  decoration: InputDecoration(labelText: 'Tên hàng', errorText: nameError),
                ),
                const SizedBox(height: 14),
                TextField(controller: unitCtrl, decoration: const InputDecoration(labelText: 'Đơn vị tính')),
                const SizedBox(height: 14),
                TextField(
                  controller: priceCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Đơn giá chuẩn'),
                ),
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

  Future<void> _toggleActive(Product p) async {
    final api = context.read<ApiClient>();
    if (p.active) {
      final confirmed = await showAppFormSheet<bool>(
        context: context,
        builder: (ctx) => AppFormSheetScaffold(
          title: 'Vô hiệu hoá mẫu hàng',
          content: Text('Vô hiệu hoá mẫu hàng "${p.name}"?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Huỷ')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.error500),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Vô hiệu hoá'),
            ),
          ],
        ),
      );
      if (confirmed != true) return;
    }
    try {
      if (p.active) {
        await ProductService(api).remove(p.id);
      } else {
        await ProductService(api).update(p.id, active: true);
      }
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cập nhật trạng thái thất bại')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mẫu hàng')),
      floatingActionButton: FloatingActionButton(onPressed: _showAddDialog, child: const Icon(Iconsax.add)),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text(error!, style: const TextStyle(color: AppColors.gray500)))
              : RefreshIndicator(
              onRefresh: _load,
              child: products.isEmpty
                  ? ListView(children: const [Padding(padding: EdgeInsets.all(32), child: Center(child: Text('Chưa có mẫu hàng nào')))])
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: products.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, i) {
                        final p = products[i];
                        return Card(
                          child: ListTile(
                            title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                            subtitle: Text('${p.customer?.name ?? "(khách hàng đã xoá)"} · ${formatCurrency(p.standardPrice)}'),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                PillBadge(
                                  label: p.active ? 'Hoạt động' : 'Ngừng',
                                  color: p.active ? AppColors.success500 : AppColors.gray400,
                                ),
                                const SizedBox(width: 4),
                                RowIconButton(
                                  icon: Icons.edit_outlined,
                                  color: AppColors.gray500,
                                  onPressed: () => _showEditDialog(p),
                                ),
                                RowIconButton(
                                  icon: p.active ? Icons.block_outlined : Icons.check_circle_outline,
                                  color: p.active ? AppColors.error500 : AppColors.success500,
                                  onPressed: () => _toggleActive(p),
                                ),
                                Icon(Icons.chevron_right_rounded, color: AppColors.gray400),
                              ],
                            ),
                            onTap: () => _openStages(p),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}

/// Mot khoi cong doan trong form "Them mau hang": moi input rieng mot dong (khong
/// nhoi 2 o nhap tren cung 1 hang) de de bam va de doc tren man hinh dien thoai.
class _StageBlock extends StatelessWidget {
  final int index;
  final TextEditingController nameCtrl;
  final TextEditingController priceCtrl;
  final String? nameError;
  final String? priceError;
  final VoidCallback? onRemove;

  const _StageBlock({
    required this.index,
    required this.nameCtrl,
    required this.priceCtrl,
    required this.onRemove,
    this.nameError,
    this.priceError,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.gray200),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Công đoạn ${index + 1}',
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.gray500),
                ),
              ),
              RowIconButton(
                icon: Icons.delete_outline,
                color: onRemove == null ? AppColors.gray200 : AppColors.error500,
                onPressed: onRemove,
                size: 18,
              ),
            ],
          ),
          const SizedBox(height: 4),
          TextField(
            controller: nameCtrl,
            decoration: InputDecoration(labelText: 'Tên công đoạn', errorText: nameError),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: priceCtrl,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(labelText: 'Đơn giá', errorText: priceError),
          ),
        ],
      ),
    );
  }
}

class _StagesScreen extends StatefulWidget {
  final Product product;
  const _StagesScreen({required this.product});

  @override
  State<_StagesScreen> createState() => _StagesScreenState();
}

class _StagesScreenState extends State<_StagesScreen> {
  List<ProcessStage> stages = [];
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
      final data = await ProductService(api).listStages(widget.product.id);
      setState(() {
        stages = data;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được danh sách công đoạn';
        loading = false;
      });
    }
  }

  Future<void> _showAddDialog() async {
    final nameCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    String? nameError;
    String? priceError;
    final saved = await showAppFormSheet<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          Future<void> submit() async {
            setSheetState(() {
              nameError = nameCtrl.text.trim().isEmpty ? 'Nhập tên công đoạn' : null;
              priceError = priceCtrl.text.trim().isEmpty ? 'Nhập đơn giá' : null;
            });
            if (nameError != null || priceError != null) return;
            final api = ctx.read<ApiClient>();
            try {
              await ProductService(api).createStage(
                widget.product.id,
                name: nameCtrl.text.trim(),
                unitPrice: double.tryParse(priceCtrl.text) ?? 0,
              );
              if (ctx.mounted) Navigator.pop(ctx, true);
            } catch (e) {
              if (ctx.mounted) {
                ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Thêm công đoạn thất bại')));
              }
            }
          }

          return AppFormSheetScaffold(
            title: 'Thêm công đoạn',
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: nameCtrl,
                  decoration: InputDecoration(labelText: 'Tên công đoạn', errorText: nameError),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: priceCtrl,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(labelText: 'Đơn giá', errorText: priceError),
                ),
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

  Future<void> _showEditDialog(ProcessStage s) async {
    final nameCtrl = TextEditingController(text: s.name);
    final priceCtrl = TextEditingController(text: s.unitPrice.toString());
    String? nameError;
    String? priceError;

    final saved = await showAppFormSheet<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          Future<void> submit() async {
            setSheetState(() {
              nameError = nameCtrl.text.trim().isEmpty ? 'Nhập tên công đoạn' : null;
              priceError = priceCtrl.text.trim().isEmpty ? 'Nhập đơn giá' : null;
            });
            if (nameError != null || priceError != null) return;
            final api = ctx.read<ApiClient>();
            try {
              await ProductService(api).updateStage(
                widget.product.id,
                s.id,
                name: nameCtrl.text.trim(),
                unitPrice: double.tryParse(priceCtrl.text) ?? 0,
              );
              if (ctx.mounted) Navigator.pop(ctx, true);
            } catch (e) {
              if (ctx.mounted) {
                ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Sửa công đoạn thất bại')));
              }
            }
          }

          return AppFormSheetScaffold(
            title: 'Sửa công đoạn',
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: nameCtrl,
                  decoration: InputDecoration(labelText: 'Tên công đoạn', errorText: nameError),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: priceCtrl,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(labelText: 'Đơn giá', errorText: priceError),
                ),
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

  Future<void> _toggleActive(ProcessStage s) async {
    final api = context.read<ApiClient>();
    if (s.active) {
      final confirmed = await showAppFormSheet<bool>(
        context: context,
        builder: (ctx) => AppFormSheetScaffold(
          title: 'Vô hiệu hoá công đoạn',
          content: Text('Vô hiệu hoá công đoạn "${s.name}"?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Huỷ')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.error500),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Vô hiệu hoá'),
            ),
          ],
        ),
      );
      if (confirmed != true) return;
    }
    try {
      if (s.active) {
        await ProductService(api).removeStage(widget.product.id, s.id);
      } else {
        await ProductService(api).updateStage(widget.product.id, s.id, active: true);
      }
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cập nhật trạng thái thất bại')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.product.name)),
      floatingActionButton: FloatingActionButton(onPressed: _showAddDialog, child: const Icon(Iconsax.add)),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text(error!, style: const TextStyle(color: AppColors.gray500)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: stages.isEmpty
                      ? ListView(children: const [Padding(padding: EdgeInsets.all(32), child: Center(child: Text('Chưa có công đoạn nào')))])
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: stages.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 8),
                          itemBuilder: (context, i) {
                            final s = stages[i];
                            return Card(
                              child: ListTile(
                                title: Text(s.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                                subtitle: s.active
                                    ? null
                                    : const Text('Ngừng', style: TextStyle(color: AppColors.gray400)),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(formatCurrency(s.unitPrice), style: const TextStyle(color: AppColors.brand600, fontWeight: FontWeight.w600)),
                                    const SizedBox(width: 4),
                                    RowIconButton(
                                      icon: Icons.edit_outlined,
                                      color: AppColors.gray500,
                                      onPressed: () => _showEditDialog(s),
                                    ),
                                    RowIconButton(
                                      icon: s.active ? Icons.block_outlined : Icons.check_circle_outline,
                                      color: s.active ? AppColors.error500 : AppColors.success500,
                                      onPressed: () => _toggleActive(s),
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
