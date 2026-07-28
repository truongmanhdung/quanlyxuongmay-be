import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/page_transition.dart';
import '../../core/theme.dart';
import '../../models/payroll.dart';
import '../../services/payroll_service.dart';
import '../../widgets/report_tile.dart';

class PayrollScreen extends StatefulWidget {
  const PayrollScreen({super.key});

  @override
  State<PayrollScreen> createState() => _PayrollScreenState();
}

class _PayrollScreenState extends State<PayrollScreen> {
  String period = currentPeriod();
  PayrollSummary? summary;
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
      final res = await PayrollService(api).summary(period);
      setState(() {
        summary = res;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được bảng lương';
        loading = false;
      });
    }
  }

  Future<void> _pickPeriod() async {
    final now = DateTime.tryParse('$period-01') ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: DateTime(now.year - 3),
      lastDate: DateTime(now.year + 1),
      helpText: 'Chọn kỳ lương',
      initialDatePickerMode: DatePickerMode.year,
    );
    if (picked == null) return;
    setState(() => period = '${picked.year}-${picked.month.toString().padLeft(2, '0')}');
    _load();
  }

  double get _totalAmount => summary?.rows.fold<double>(0, (sum, r) => sum + r.totalAmount) ?? 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tính lương'),
        actions: [
          TextButton.icon(
            onPressed: _pickPeriod,
            icon: const Icon(Iconsax.calendar, color: AppColors.brand500),
            label: Text(period, style: const TextStyle(color: AppColors.brand500)),
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text(error!))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Card(
                        color: AppColors.brand50,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Tổng lương kỳ $period', style: const TextStyle(color: AppColors.brand700)),
                              Text(
                                formatCurrency(_totalAmount),
                                style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.brand700, fontSize: 16),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (summary == null || summary!.rows.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 32),
                          child: Center(child: Text('Chưa có dữ liệu sản lượng trong kỳ này')),
                        )
                      else
                        ...summary!.rows.where((r) => r.worker != null).map(
                              (r) => Card(
                                margin: const EdgeInsets.only(bottom: 10),
                                child: ListTile(
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                                  title: Text(r.worker!.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                                  subtitle: Text('${r.worker!.code} · ${formatNumber(r.reportCount)} lô · ${formatNumber(r.totalQuantity)} sp'),
                                  trailing: Text(
                                    formatCurrency(r.totalAmount),
                                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.brand600),
                                  ),
                                  onTap: () => Navigator.of(context).push(
                                    slideRoute(
                                      PayrollDetailScreen(
                                        workerId: r.worker!.id,
                                        workerName: r.worker!.name,
                                        period: period,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                    ],
                  ),
                ),
    );
  }
}

class PayrollDetailScreen extends StatefulWidget {
  final String workerId;
  final String workerName;
  final String period;
  const PayrollDetailScreen({super.key, required this.workerId, required this.workerName, required this.period});

  @override
  State<PayrollDetailScreen> createState() => _PayrollDetailScreenState();
}

class _PayrollDetailScreenState extends State<PayrollDetailScreen> {
  PayrollDetail? detail;
  bool loading = true;
  bool exporting = false;
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
      final res = await PayrollService(api).detail(widget.period, worker: widget.workerId);
      setState(() {
        detail = res;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được chi tiết lương';
        loading = false;
      });
    }
  }

  Future<void> _export() async {
    setState(() => exporting = true);
    final api = context.read<ApiClient>();
    try {
      await PayrollService(api).export(widget.workerId, widget.period);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Đã xuất phiếu lương cho ${widget.workerName}')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Xuất phiếu lương thất bại')));
    } finally {
      if (mounted) setState(() => exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.workerName),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(22),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Text('Kỳ lương ${widget.period}', style: const TextStyle(color: AppColors.gray500, fontSize: 12.5)),
          ),
        ),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Iconsax.warning_2, size: 40, color: AppColors.gray400),
                        const SizedBox(height: 12),
                        Text(error!, style: const TextStyle(color: AppColors.gray500)),
                        const SizedBox(height: 16),
                        OutlinedButton.icon(
                          onPressed: _load,
                          icon: const Icon(Iconsax.refresh, size: 18),
                          label: const Text('Thử lại'),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Card(
                        color: AppColors.brand50,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Tổng lương', style: TextStyle(color: AppColors.brand700, fontSize: 12.5)),
                                  const SizedBox(height: 2),
                                  Text(
                                    formatCurrency(detail!.totalAmount),
                                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.brand700, fontSize: 18),
                                  ),
                                ],
                              ),
                              Text('${formatNumber(detail!.totalQuantity)} sp', style: const TextStyle(color: AppColors.brand700, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (detail!.reports.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 32),
                          child: Center(child: Text('Chưa có báo cáo sản lượng trong kỳ này', style: TextStyle(color: AppColors.gray500))),
                        )
                      else
                        ...detail!.reports.map((r) => ReportTile(report: r)),
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        onPressed: exporting ? null : _export,
                        icon: const Icon(Iconsax.send, size: 18),
                        label: Text(exporting ? 'Đang xuất...' : 'Xuất phiếu lương'),
                      ),
                    ],
                  ),
                ),
    );
  }
}
