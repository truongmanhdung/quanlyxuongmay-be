import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/socket_service.dart';
import '../../core/theme.dart';
import '../../models/batch.dart';
import '../../models/customer.dart';
import '../../models/product.dart';
import '../../services/batch_service.dart';
import '../../services/customer_service.dart';
import '../../services/product_service.dart';
import '../../widgets/filter_pill.dart';
import '../../widgets/pill_badge.dart';

class BatchesScreen extends StatefulWidget {
  const BatchesScreen({super.key});

  @override
  State<BatchesScreen> createState() => _BatchesScreenState();
}

class _BatchesScreenState extends State<BatchesScreen> {
  List<Batch> batches = [];
  List<Customer> customers = [];
  bool loading = true;
  String? error;
  String statusFilter = '';
  late final SocketService _socket;

  void _handleBatchEvent(dynamic _) => _load();

  @override
  void initState() {
    super.initState();
    _load();
    _socket = context.read<SocketService>();
    _socket.on('batch:new', _handleBatchEvent);
    _socket.on('batch:updated', _handleBatchEvent);
  }

  @override
  void dispose() {
    _socket.off('batch:new', _handleBatchEvent);
    _socket.off('batch:updated', _handleBatchEvent);
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    final api = context.read<ApiClient>();
    try {
      final results = await Future.wait([
        BatchService(api).list(status: statusFilter.isEmpty ? null : statusFilter),
        customers.isEmpty ? CustomerService(api).list() : Future.value(customers),
      ]);
      setState(() {
        batches = results[0] as List<Batch>;
        customers = results[1] as List<Customer>;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được danh sách lô hàng';
        loading = false;
      });
    }
  }

  void _changeFilter(String value) {
    setState(() => statusFilter = value);
    _load();
  }

  Future<void> _showAddDialog() async {
    if (customers.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cần có khách hàng trước khi tạo lô hàng')));
      return;
    }
    final codeCtrl = TextEditingController();
    final qtyCtrl = TextEditingController();
    Customer selectedCustomer = customers.first;
    Product? selectedProduct;
    List<Product> products = [];

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          Future<void> loadProducts(Customer c) async {
            final api = ctx.read<ApiClient>();
            final data = await ProductService(api).list(customer: c.id);
            setDialogState(() {
              products = data;
              selectedProduct = data.isNotEmpty ? data.first : null;
            });
          }

          if (products.isEmpty && selectedCustomer.id.isNotEmpty) {
            loadProducts(selectedCustomer);
          }

          return AlertDialog(
            title: const Text('Thêm lô hàng'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: codeCtrl,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(labelText: 'Mã lô (VD: LO001)'),
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<Customer>(
                    initialValue: selectedCustomer,
                    decoration: const InputDecoration(labelText: 'Khách hàng'),
                    items: customers.map((c) => DropdownMenuItem(value: c, child: Text(c.name))).toList(),
                    onChanged: (c) {
                      setDialogState(() {
                        selectedCustomer = c!;
                        products = [];
                      });
                    },
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<Product>(
                    initialValue: selectedProduct,
                    decoration: const InputDecoration(labelText: 'Mẫu hàng'),
                    items: products.map((p) => DropdownMenuItem(value: p, child: Text(p.name))).toList(),
                    onChanged: (p) => setDialogState(() => selectedProduct = p),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: qtyCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Số lượng kế hoạch (không bắt buộc)'),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Huỷ')),
              ElevatedButton(
                onPressed: () async {
                  if (codeCtrl.text.trim().isEmpty || selectedProduct == null) return;
                  final api = ctx.read<ApiClient>();
                  try {
                    await BatchService(api).create(
                      code: codeCtrl.text.trim(),
                      product: selectedProduct!.id,
                      customer: selectedCustomer.id,
                      plannedQuantity: qtyCtrl.text.trim().isEmpty ? null : double.tryParse(qtyCtrl.text),
                    );
                    if (ctx.mounted) Navigator.pop(ctx, true);
                  } catch (e) {
                    if (ctx.mounted) {
                      ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Tạo lô hàng thất bại')));
                    }
                  }
                },
                child: const Text('Lưu'),
              ),
            ],
          );
        },
      ),
    );
    if (saved == true) _load();
  }

  Future<void> _complete(Batch b) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Duyệt hoàn thành'),
        content: Text('Duyệt hoàn thành lô "${b.code}"? Hãy chắc chắn đã kiểm tra chất lượng.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Huỷ')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Duyệt')),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    final api = context.read<ApiClient>();
    try {
      await BatchService(api).complete(b.id);
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Duyệt hoàn thành thất bại')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Lô hàng')),
      floatingActionButton: FloatingActionButton(onPressed: _showAddDialog, child: const Icon(Iconsax.add)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  FilterPill(label: 'Tất cả', selected: statusFilter == '', onTap: () => _changeFilter('')),
                  const SizedBox(width: 8),
                  FilterPill(label: 'Đang làm', selected: statusFilter == 'dang_lam', onTap: () => _changeFilter('dang_lam')),
                  const SizedBox(width: 8),
                  FilterPill(
                      label: 'Chưa hoàn thành', selected: statusFilter == 'chua_hoan_thanh', onTap: () => _changeFilter('chua_hoan_thanh')),
                  const SizedBox(width: 8),
                  FilterPill(label: 'Hoàn thành', selected: statusFilter == 'hoan_thanh', onTap: () => _changeFilter('hoan_thanh')),
                ],
              ),
            ),
          ),
          Expanded(
            child: loading
                ? const Center(child: CircularProgressIndicator())
                : error != null
                    ? Center(child: Text(error!, style: const TextStyle(color: AppColors.gray500)))
                    : RefreshIndicator(
                    onRefresh: _load,
                    child: batches.isEmpty
                        ? ListView(children: const [Padding(padding: EdgeInsets.all(32), child: Center(child: Text('Chưa có lô hàng nào')))])
                        : ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: batches.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 8),
                            itemBuilder: (context, i) {
                              final b = batches[i];
                              final ready = b.status != BatchStatus.hoanThanh &&
                                  b.plannedQuantity != null &&
                                  b.reportedQuantity >= b.plannedQuantity!;
                              return Card(
                                child: ListTile(
                                  title: Text(b.code, style: const TextStyle(fontWeight: FontWeight.w600)),
                                  subtitle: Text(
                                    '${b.product.name} · ${b.customer.name}\n'
                                    '${formatNumber(b.reportedQuantity)}${b.plannedQuantity != null ? " / ${formatNumber(b.plannedQuantity!)}" : ""}'
                                    '${ready ? " · Đủ SL, chờ duyệt" : ""}',
                                  ),
                                  isThreeLine: true,
                                  trailing: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      PillBadge(label: batchStatusLabel(b.status), color: _statusColor(b.status)),
                                      if (b.status != BatchStatus.hoanThanh)
                                        TextButton(
                                          onPressed: () => _complete(b),
                                          style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 30)),
                                          child: const Text('Duyệt', style: TextStyle(fontSize: 12)),
                                        ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
          ),
        ],
      ),
    );
  }

  Color _statusColor(BatchStatus status) {
    switch (status) {
      case BatchStatus.hoanThanh:
        return AppColors.success500;
      case BatchStatus.chuaHoanThanh:
        return AppColors.gray500;
      case BatchStatus.dangLam:
        return AppColors.warning500;
    }
  }
}
