import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../models/customer.dart';
import '../../models/product.dart';
import '../../services/customer_service.dart';
import '../../services/product_service.dart';
import '../../services/report_service.dart';

class SubmitScreen extends StatefulWidget {
  const SubmitScreen({super.key});

  @override
  State<SubmitScreen> createState() => _SubmitScreenState();
}

class _SubmitScreenState extends State<SubmitScreen> {
  List<Customer> customers = [];
  List<Product> products = [];
  List<ProcessStage> stages = [];

  Customer? selectedCustomer;
  Product? selectedProduct;
  ProcessStage? selectedStage;

  final _batchCtrl = TextEditingController();
  final _quantityCtrl = TextEditingController();

  bool loadingCustomers = true;
  bool loadingProducts = false;
  bool loadingStages = false;
  bool submitting = false;
  String? error;

  @override
  void initState() {
    super.initState();
    _loadCustomers();
    _quantityCtrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _batchCtrl.dispose();
    _quantityCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCustomers() async {
    final api = context.read<ApiClient>();
    try {
      final data = await CustomerService(api).list();
      setState(() {
        customers = data.where((c) => c.active).toList();
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
      selectedProduct = null;
      selectedStage = null;
      products = [];
      stages = [];
      loadingProducts = c != null;
    });
    if (c == null) return;
    final api = context.read<ApiClient>();
    try {
      final data = await ProductService(api).list(customer: c.id);
      setState(() {
        products = data.where((p) => p.active).toList();
        loadingProducts = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được mẫu hàng';
        loadingProducts = false;
      });
    }
  }

  Future<void> _onProductChanged(Product? p) async {
    setState(() {
      selectedProduct = p;
      selectedStage = null;
      stages = [];
      loadingStages = p != null;
    });
    if (p == null) return;
    final api = context.read<ApiClient>();
    try {
      final data = await ProductService(api).listStages(p.id);
      setState(() {
        stages = data.where((s) => s.active).toList();
        loadingStages = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được công đoạn';
        loadingStages = false;
      });
    }
  }

  double get _quantity => double.tryParse(_quantityCtrl.text.replaceAll(',', '.')) ?? 0;
  double get _previewAmount => selectedStage != null ? selectedStage!.unitPrice * _quantity : 0;

  Future<void> _submit() async {
    if (selectedCustomer == null || selectedProduct == null || selectedStage == null || _quantity <= 0) {
      setState(() => error = 'Vui lòng chọn đầy đủ thông tin và nhập sản lượng hợp lệ');
      return;
    }
    setState(() {
      submitting = true;
      error = null;
    });
    final api = context.read<ApiClient>();
    try {
      await ReportService(api).submit(
        customer: selectedCustomer!.id,
        product: selectedProduct!.id,
        processStage: selectedStage!.id,
        batchNumber: _batchCtrl.text.trim().isEmpty ? null : _batchCtrl.text.trim(),
        quantity: _quantity,
      );
      if (!mounted) return;
      _batchCtrl.clear();
      _quantityCtrl.clear();
      setState(() {
        selectedCustomer = null;
        selectedProduct = null;
        selectedStage = null;
        products = [];
        stages = [];
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đã gửi sản lượng thành công lúc ${formatDateTime(DateTime.now())}'),
          backgroundColor: AppColors.success500,
        ),
      );
    } on ApiException catch (e) {
      setState(() => error = e.message);
    } catch (e) {
      setState(() => error = 'Gửi sản lượng thất bại');
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Gửi sản lượng')),
      body: loadingCustomers
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadCustomers,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (error != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.error500.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(error!, style: const TextStyle(color: AppColors.error500)),
                    ),
                  const _FieldLabel('1. Khách hàng'),
                  DropdownButtonFormField<Customer>(
                    initialValue: selectedCustomer,
                    hint: const Text('Chọn khách hàng'),
                    items: customers
                        .map((c) => DropdownMenuItem(value: c, child: Text('${c.code} — ${c.name}')))
                        .toList(),
                    onChanged: _onCustomerChanged,
                  ),
                  const SizedBox(height: 16),
                  const _FieldLabel('2. Mẫu hàng'),
                  DropdownButtonFormField<Product>(
                    initialValue: selectedProduct,
                    hint: Text(loadingProducts ? 'Đang tải...' : 'Chọn mẫu hàng'),
                    items: products
                        .map((p) => DropdownMenuItem(value: p, child: Text(p.name)))
                        .toList(),
                    onChanged: selectedCustomer == null ? null : _onProductChanged,
                  ),
                  const SizedBox(height: 16),
                  const _FieldLabel('3. Công đoạn'),
                  DropdownButtonFormField<ProcessStage>(
                    initialValue: selectedStage,
                    hint: Text(loadingStages ? 'Đang tải...' : 'Chọn công đoạn'),
                    items: stages
                        .map((s) => DropdownMenuItem(
                              value: s,
                              child: Text('${s.name} — ${formatCurrency(s.unitPrice)}'),
                            ))
                        .toList(),
                    onChanged: selectedProduct == null ? null : (s) => setState(() => selectedStage = s),
                  ),
                  const SizedBox(height: 16),
                  const _FieldLabel('4. Số lô (không bắt buộc)'),
                  TextField(
                    controller: _batchCtrl,
                    decoration: const InputDecoration(hintText: 'VD: LO001'),
                  ),
                  const SizedBox(height: 16),
                  const _FieldLabel('5. Sản lượng'),
                  TextField(
                    controller: _quantityCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(hintText: 'Nhập số sản phẩm hoàn thành'),
                  ),
                  if (selectedStage != null && _quantity > 0) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.brand50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Ước tính thành tiền', style: TextStyle(color: AppColors.brand700)),
                          Text(
                            formatCurrency(_previewAmount),
                            style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.brand700),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: submitting ? null : _submit,
                    child: submitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('Gửi sản lượng'),
                  ),
                ],
              ),
            ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(text, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
    );
  }
}
