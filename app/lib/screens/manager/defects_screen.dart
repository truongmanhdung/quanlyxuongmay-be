import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/socket_service.dart';
import '../../core/theme.dart';
import '../../models/customer.dart';
import '../../models/defect_report.dart';
import '../../models/product.dart';
import '../../services/customer_service.dart';
import '../../services/defect_service.dart';
import '../../services/product_service.dart';
import '../../widgets/app_form_sheet.dart';
import '../../widgets/filter_pill.dart';
import '../../widgets/pill_badge.dart';

class DefectsScreen extends StatefulWidget {
  const DefectsScreen({super.key});

  @override
  State<DefectsScreen> createState() => _DefectsScreenState();
}

class _DefectsScreenState extends State<DefectsScreen> {
  List<DefectReport> defects = [];
  List<Customer> customers = [];
  bool loading = true;
  String? error;
  String typeFilter = '';
  late final SocketService _socket;

  void _handleDefectEvent(dynamic _) => _load();

  @override
  void initState() {
    super.initState();
    _load();
    _socket = context.read<SocketService>();
    _socket.on('defect:new', _handleDefectEvent);
    _socket.on('defect:updated', _handleDefectEvent);
  }

  @override
  void dispose() {
    _socket.off('defect:new', _handleDefectEvent);
    _socket.off('defect:updated', _handleDefectEvent);
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
        DefectService(api).list(type: typeFilter.isEmpty ? null : typeFilter),
        customers.isEmpty ? CustomerService(api).list() : Future.value(customers),
      ]);
      setState(() {
        defects = results[0] as List<DefectReport>;
        customers = results[1] as List<Customer>;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được danh sách hàng lỗi';
        loading = false;
      });
    }
  }

  void _changeFilter(String value) {
    setState(() => typeFilter = value);
    _load();
  }

  Future<void> _showAddDialog() async {
    if (customers.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cần có khách hàng trước khi ghi nhận')));
      return;
    }
    final qtyCtrl = TextEditingController();
    final reasonCtrl = TextEditingController();
    String type = 'hong';
    Customer selectedCustomer = customers.first;
    Product? selectedProduct;
    List<Product> products = [];

    final saved = await showAppFormSheet<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          Future<void> loadProducts(Customer c) async {
            final api = ctx.read<ApiClient>();
            final data = await ProductService(api).list(customer: c.id);
            setSheetState(() {
              products = data;
              selectedProduct = data.isNotEmpty ? data.first : null;
            });
          }

          if (products.isEmpty && selectedCustomer.id.isNotEmpty) {
            loadProducts(selectedCustomer);
          }

          return AppFormSheetScaffold(
            title: 'Ghi nhận hàng lỗi / hoàn trả',
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Center(
                        child: FilterPill(label: 'Hàng hỏng', selected: type == 'hong', onTap: () => setSheetState(() => type = 'hong')),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Center(
                        child: FilterPill(
                            label: 'Khách trả lại', selected: type == 'tra_lai', onTap: () => setSheetState(() => type = 'tra_lai')),
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
                const SizedBox(height: 14),
                TextField(
                  controller: reasonCtrl,
                  decoration: const InputDecoration(labelText: 'Lý do (không bắt buộc)'),
                ),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Huỷ')),
              ElevatedButton(
                onPressed: () async {
                  final quantity = double.tryParse(qtyCtrl.text.trim());
                  if (selectedProduct == null || quantity == null || quantity <= 0) return;
                  final api = ctx.read<ApiClient>();
                  try {
                    await DefectService(api).create(
                      product: selectedProduct!.id,
                      customer: selectedCustomer.id,
                      quantity: quantity,
                      type: type,
                      reason: reasonCtrl.text.trim().isEmpty ? null : reasonCtrl.text.trim(),
                    );
                    if (ctx.mounted) Navigator.pop(ctx, true);
                  } catch (e) {
                    if (ctx.mounted) {
                      ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Ghi nhận thất bại')));
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hàng lỗi / Hoàn trả')),
      floatingActionButton: FloatingActionButton(onPressed: _showAddDialog, child: const Icon(Iconsax.add)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                FilterPill(label: 'Tất cả', selected: typeFilter == '', onTap: () => _changeFilter('')),
                const SizedBox(width: 8),
                FilterPill(label: 'Hàng hỏng', selected: typeFilter == 'hong', onTap: () => _changeFilter('hong')),
                const SizedBox(width: 8),
                FilterPill(label: 'Khách trả lại', selected: typeFilter == 'tra_lai', onTap: () => _changeFilter('tra_lai')),
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
                    child: defects.isEmpty
                        ? ListView(children: const [Padding(padding: EdgeInsets.all(32), child: Center(child: Text('Chưa có bản ghi nào')))])
                        : ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: defects.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 8),
                            itemBuilder: (context, i) {
                              final d = defects[i];
                              final isReturn = d.type == DefectType.traLai;
                              return Card(
                                child: ListTile(
                                  title: Text('${d.product?.name ?? "(mẫu hàng đã xoá)"} · ${formatNumber(d.quantity)}', style: const TextStyle(fontWeight: FontWeight.w600)),
                                  subtitle: Text(
                                    '${d.customer.name}${d.reason != null && d.reason!.isNotEmpty ? " · ${d.reason}" : ""}\n${formatDateTime(d.reportedAt)}',
                                  ),
                                  isThreeLine: true,
                                  trailing: PillBadge(
                                    label: defectTypeLabel(d.type),
                                    color: isReturn ? AppColors.warning500 : AppColors.error500,
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
}
