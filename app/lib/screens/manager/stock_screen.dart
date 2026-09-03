import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../models/customer.dart';
import '../../models/order.dart';
import '../../services/customer_service.dart';
import '../../services/order_service.dart';

class StockScreen extends StatefulWidget {
  const StockScreen({super.key});

  @override
  State<StockScreen> createState() => _StockScreenState();
}

class _StockScreenState extends State<StockScreen> {
  List<Customer> customers = [];
  Customer? selectedCustomer;
  List<StockSummaryRow> rows = [];
  bool loadingCustomers = true;
  bool loadingStock = false;
  String? error;

  @override
  void initState() {
    super.initState();
    _loadCustomers();
  }

  Future<void> _loadCustomers() async {
    setState(() {
      loadingCustomers = true;
      error = null;
    });
    final api = context.read<ApiClient>();
    try {
      final data = await CustomerService(api).list();
      setState(() {
        customers = data;
        loadingCustomers = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được danh sách khách hàng';
        loadingCustomers = false;
      });
    }
  }

  Future<void> _onCustomerChanged(Customer? c) async {
    setState(() {
      selectedCustomer = c;
      rows = [];
    });
    if (c == null) return;
    setState(() {
      loadingStock = true;
      error = null;
    });
    final api = context.read<ApiClient>();
    try {
      final data = await OrderService(api).stockSummary(c.id);
      setState(() {
        rows = data;
        loadingStock = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được tồn kho';
        loadingStock = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tồn kho')),
      body: loadingCustomers
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                DropdownButtonFormField<Customer>(
                  initialValue: selectedCustomer,
                  decoration: const InputDecoration(labelText: 'Chọn khách hàng để xem tồn kho'),
                  items: customers.map((c) => DropdownMenuItem(value: c, child: Text('${c.code} — ${c.name}'))).toList(),
                  onChanged: _onCustomerChanged,
                ),
                const SizedBox(height: 16),
                if (error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(error!, style: const TextStyle(color: AppColors.error500)),
                  ),
                if (selectedCustomer == null)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: Center(
                      child: Text('Chọn khách hàng để xem tồn kho theo từng mã hàng', style: TextStyle(color: AppColors.gray500)),
                    ),
                  )
                else if (loadingStock)
                  const Padding(padding: EdgeInsets.symmetric(vertical: 32), child: Center(child: CircularProgressIndicator()))
                else if (rows.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: Center(child: Text('Khách hàng này chưa có mẫu hàng nào', style: TextStyle(color: AppColors.gray500))),
                  )
                else ...[
                  const Padding(
                    padding: EdgeInsets.only(bottom: 8),
                    child: Text(
                      'TP hoàn thành = số sản phẩm đã làm xong đủ tất cả công đoạn. Chỉ giao cho khách trong phạm vi số này.',
                      style: TextStyle(color: AppColors.gray400, fontSize: 11.5),
                    ),
                  ),
                  ...rows.map(
                    (r) => Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              r.product.name,
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 20,
                              runSpacing: 10,
                              children: [
                                _StockStat(label: 'Vải đã nhận', value: r.imported),
                                _StockStat(label: 'TP hoàn thành', value: r.finished),
                                _StockStat(label: 'Đã giao', value: r.exported),
                                _StockStat(
                                  label: 'Còn giao được',
                                  value: r.canExport,
                                  emphasize: true,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
    );
  }
}

class _StockStat extends StatelessWidget {
  final String label;
  final double value;
  final bool emphasize;

  const _StockStat({required this.label, required this.value, this.emphasize = false});

  @override
  Widget build(BuildContext context) {
    final color = emphasize ? AppColors.brand600 : AppColors.gray700;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11.5, color: AppColors.gray500)),
        const SizedBox(height: 2),
        Text(
          formatNumber(value),
          style: TextStyle(fontWeight: emphasize ? FontWeight.w700 : FontWeight.w600, color: color, fontSize: 14),
        ),
      ],
    );
  }
}
