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
    final codeCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    Customer selected = customers.first;

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Thêm mẫu hàng'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<Customer>(
                  initialValue: selected,
                  decoration: const InputDecoration(labelText: 'Khách hàng'),
                  items: customers.map((c) => DropdownMenuItem(value: c, child: Text(c.name))).toList(),
                  onChanged: (c) => setDialogState(() => selected = c!),
                ),
                const SizedBox(height: 10),
                TextField(controller: codeCtrl, decoration: const InputDecoration(labelText: 'Mã hàng')),
                const SizedBox(height: 10),
                TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Tên hàng')),
                const SizedBox(height: 10),
                TextField(
                  controller: priceCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Đơn giá chuẩn'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Huỷ')),
            ElevatedButton(
              onPressed: () async {
                if (codeCtrl.text.trim().isEmpty || nameCtrl.text.trim().isEmpty) return;
                final api = ctx.read<ApiClient>();
                try {
                  await ProductService(api).create(
                    code: codeCtrl.text.trim(),
                    name: nameCtrl.text.trim(),
                    customer: selected.id,
                    standardPrice: double.tryParse(priceCtrl.text) ?? 0,
                  );
                  if (ctx.mounted) Navigator.pop(ctx, true);
                } catch (e) {
                  if (ctx.mounted) {
                    ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Thêm mẫu hàng thất bại')));
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
                            subtitle: Text('${p.code} · ${p.customer.name} · ${formatCurrency(p.standardPrice)}'),
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
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Thêm công đoạn'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Tên công đoạn')),
              const SizedBox(height: 10),
              TextField(controller: priceCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Đơn giá')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Huỷ')),
          ElevatedButton(
            onPressed: () async {
              if (nameCtrl.text.trim().isEmpty || priceCtrl.text.trim().isEmpty) return;
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
    );
    if (saved == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('${widget.product.code} — ${widget.product.name}')),
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
