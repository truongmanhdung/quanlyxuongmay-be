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
      final results = await Future.wait([ProductService(api).list(), CustomerService(api).list()]);
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

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          Future<void> submit() async {
            setDialogState(() {
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

          return AlertDialog(
            title: const Text('Thêm mẫu hàng'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DropdownButtonFormField<Customer>(
                    initialValue: selected,
                    decoration: const InputDecoration(labelText: 'Khách hàng'),
                    items: customers.map((c) => DropdownMenuItem(value: c, child: Text(c.name))).toList(),
                    onChanged: (c) => setDialogState(() => selected = c!),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: nameCtrl,
                    decoration: InputDecoration(labelText: 'Tên hàng', errorText: nameError),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: priceCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Đơn giá chuẩn'),
                  ),
                  const SizedBox(height: 18),
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: Text('Công đoạn & đơn giá', style: TextStyle(fontWeight: FontWeight.w600)),
                  ),
                  const SizedBox(height: 8),
                  ...List.generate(stageRows.length, (i) {
                    final row = stageRows[i];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: TextField(
                              controller: row.nameCtrl,
                              decoration: InputDecoration(labelText: 'Tên công đoạn', errorText: stageNameErrors[i]),
                            ),
                          ),
                          const SizedBox(width: 8),
                          SizedBox(
                            width: 90,
                            child: TextField(
                              controller: row.priceCtrl,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(labelText: 'Đơn giá', errorText: stagePriceErrors[i]),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Iconsax.trash, size: 18),
                            onPressed: stageRows.length > 1
                                ? () => setDialogState(() {
                                      stageRows.removeAt(i);
                                      stageNameErrors.remove(i);
                                      stagePriceErrors.remove(i);
                                    })
                                : null,
                          ),
                        ],
                      ),
                    );
                  }),
                  TextButton.icon(
                    onPressed: () => setDialogState(() => stageRows.add(_StageRowControllers())),
                    icon: const Icon(Iconsax.add, size: 18),
                    label: const Text('Thêm công đoạn'),
                  ),
                ],
              ),
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
                            subtitle: Text('${p.customer.name} · ${formatCurrency(p.standardPrice)}'),
                            trailing: const Icon(Iconsax.arrow_right_3),
                            onTap: () => _openStages(p),
                          ),
                        );
                      },
                    ),
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
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
        title: const Text('Thêm công đoạn'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: InputDecoration(labelText: 'Tên công đoạn', errorText: nameError),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: priceCtrl,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: 'Đơn giá', errorText: priceError),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Huỷ')),
          ElevatedButton(
            onPressed: () async {
              setDialogState(() {
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
            },
            child: const Text('Lưu'),
          ),
        ],
        ),
      ),
    );
    if (saved == true) _load();
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
                                trailing:
                                    Text(formatCurrency(s.unitPrice), style: const TextStyle(color: AppColors.brand600, fontWeight: FontWeight.w600)),
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}
