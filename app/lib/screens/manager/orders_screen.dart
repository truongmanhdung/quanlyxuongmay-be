import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../models/customer.dart';
import '../../models/order.dart';
import '../../models/product.dart';
import '../../services/customer_service.dart';
import '../../services/order_service.dart';
import '../../services/product_service.dart';
import '../../widgets/app_form_sheet.dart';
import '../../widgets/filter_pill.dart';
import '../../widgets/pill_badge.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<Order> orders = [];
  List<Customer> customers = [];
  bool loading = true;
  String? error;
  String typeFilter = '';

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
      final results = await Future.wait([
        OrderService(api).list(type: typeFilter.isEmpty ? null : typeFilter),
        customers.isEmpty ? CustomerService(api).list(active: true) : Future.value(customers),
      ]);
      setState(() {
        orders = results[0] as List<Order>;
        customers = results[1] as List<Customer>;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được danh sách phiếu';
        loading = false;
      });
    }
  }

  Future<void> _showAddDialog() async {
    if (customers.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cần có khách hàng trước khi tạo phiếu')));
      return;
    }
    final qtyCtrl = TextEditingController();
    String type = 'nhap';
    Customer selectedCustomer = customers.first;
    Product? selectedProduct;
    List<Product> products = [];

    final saved = await showAppFormSheet<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          Future<void> loadProducts(Customer c) async {
            final api = ctx.read<ApiClient>();
            final data = await ProductService(api).list(customer: c.id, active: true);
            setSheetState(() {
              products = data;
              selectedProduct = data.isNotEmpty ? data.first : null;
            });
          }

          if (products.isEmpty && selectedCustomer.id.isNotEmpty) {
            loadProducts(selectedCustomer);
          }

          return AppFormSheetScaffold(
            title: 'Tạo phiếu nhập / xuất',
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Center(
                        child: FilterPill(label: 'Nhập', selected: type == 'nhap', onTap: () => setSheetState(() => type = 'nhap')),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Center(
                        child: FilterPill(label: 'Xuất', selected: type == 'xuat', onTap: () => setSheetState(() => type = 'xuat')),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<Customer>(
                  initialValue: selectedCustomer,
                  decoration: const InputDecoration(labelText: 'Khách hàng'),
                  items: customers.map((c) => DropdownMenuItem(value: c, child: Text(c.name))).toList(),
                  onChanged: (c) {
                    setSheetState(() {
                      selectedCustomer = c!;
                      products = [];
                    });
                  },
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<Product>(
                  initialValue: selectedProduct,
                  decoration: const InputDecoration(labelText: 'Mẫu hàng'),
                  items: products.map((p) => DropdownMenuItem(value: p, child: Text(p.name))).toList(),
                  onChanged: (p) => setSheetState(() => selectedProduct = p),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: qtyCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Số lượng'),
                ),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Huỷ')),
              ElevatedButton(
                onPressed: () async {
                  final api = ctx.read<ApiClient>();
                  try {
                    await OrderService(api).create(
                      type: type,
                      customer: selectedCustomer.id,
                      date: DateTime.now(),
                      details: selectedProduct != null && qtyCtrl.text.trim().isNotEmpty
                          ? [
                              {
                                'product': selectedProduct!.id,
                                'quantity': double.tryParse(qtyCtrl.text) ?? 0,
                              }
                            ]
                          : [],
                    );
                    if (ctx.mounted) Navigator.pop(ctx, true);
                  } catch (e) {
                    if (ctx.mounted) {
                      ScaffoldMessenger.of(ctx).showSnackBar(
                        SnackBar(content: Text(e is ApiException ? e.message : 'Tạo phiếu thất bại')),
                      );
                    }
                  }
                },
                child: const Text('Tạo phiếu'),
              ),
            ],
          );
        },
      ),
    );
    if (saved == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nhập / Xuất')),
      floatingActionButton: FloatingActionButton(onPressed: _showAddDialog, child: const Icon(Iconsax.add)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                FilterPill(label: 'Tất cả', selected: typeFilter == '', onTap: () => _changeFilter('')),
                const SizedBox(width: 8),
                FilterPill(label: 'Nhập', selected: typeFilter == 'nhap', onTap: () => _changeFilter('nhap')),
                const SizedBox(width: 8),
                FilterPill(label: 'Xuất', selected: typeFilter == 'xuat', onTap: () => _changeFilter('xuat')),
              ],
            ),
          ),
          Expanded(
            child: loading
                ? const Center(child: CircularProgressIndicator())
                : error != null
                    ? Center(child: Text(error!, style: const TextStyle(color: AppColors.gray500)))
                    : RefreshIndicator(
                    onRefresh: _load,
                    child: orders.isEmpty
                        ? ListView(children: const [Padding(padding: EdgeInsets.all(32), child: Center(child: Text('Chưa có phiếu nào')))])
                        : ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: orders.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 8),
                            itemBuilder: (context, i) {
                              final o = orders[i];
                              return Card(
                                child: ListTile(
                                  title: Text(o.code, style: const TextStyle(fontWeight: FontWeight.w600)),
                                  subtitle: Text('${o.customer?.name ?? "(khách hàng đã xoá)"} · ${formatDate(o.date)}'),
                                  trailing: PillBadge(
                                    label: o.type == 'nhap' ? 'Nhập' : 'Xuất',
                                    color: o.type == 'nhap' ? AppColors.brand600 : AppColors.warning500,
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

  void _changeFilter(String value) {
    setState(() => typeFilter = value);
    _load();
  }
}
