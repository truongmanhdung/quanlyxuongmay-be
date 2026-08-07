import 'dart:io';
import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/page_transition.dart';
import '../../core/theme.dart';
import '../../models/payroll.dart';
import '../../models/production_report.dart';
import '../../services/payroll_service.dart';
import '../../widgets/date_range_filter.dart';
import '../../widgets/report_tile.dart';

Map<String, List<ProductionReport>> _groupReportsByDay(List<ProductionReport> reports) {
  final sorted = [...reports]..sort((a, b) => a.workDate.compareTo(b.workDate));
  final map = <String, List<ProductionReport>>{};
  for (final r in sorted) {
    map.putIfAbsent(formatDate(r.workDate), () => []).add(r);
  }
  return map;
}

class PayrollScreen extends StatefulWidget {
  const PayrollScreen({super.key});

  @override
  State<PayrollScreen> createState() => _PayrollScreenState();
}

class _PayrollScreenState extends State<PayrollScreen> {
  DateRange range = DateRange.defaultRange();
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
      final res = await PayrollService(api).summary(range.fromIso, range.toIso);
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

  void _changeRange(DateRange next) {
    setState(() => range = next);
    _load();
  }

  double get _totalAmount => summary?.rows.fold<double>(0, (sum, r) => sum + r.totalAmount) ?? 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tính lương')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text(error!))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      DateRangeFilterButton(range: range, onChanged: _changeRange),
                      const SizedBox(height: 16),
                      Card(
                        color: AppColors.brand50,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Tổng lương', style: TextStyle(color: AppColors.brand700)),
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
                                        range: range,
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
  final DateRange range;
  const PayrollDetailScreen({super.key, required this.workerId, required this.workerName, required this.range});

  @override
  State<PayrollDetailScreen> createState() => _PayrollDetailScreenState();
}

class _PayrollDetailScreenState extends State<PayrollDetailScreen> {
  PayrollDetail? detail;
  PayrollSlip? slip;
  bool loading = true;
  bool exporting = false;
  String? downloadingFormat;
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
      final results = await Future.wait([
        PayrollService(api).detail(widget.range.fromIso, widget.range.toIso, worker: widget.workerId),
        PayrollService(api).listSlips(worker: widget.workerId, from: widget.range.fromIso, to: widget.range.toIso),
      ]);
      final res = results[0] as PayrollDetail;
      final existingSlips = results[1] as List<PayrollSlip>;
      setState(() {
        detail = res;
        slip = existingSlips.isNotEmpty ? existingSlips.first : null;
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
      final result = await PayrollService(api).export(widget.workerId, widget.range.fromIso, widget.range.toIso);
      if (!mounted) return;
      setState(() => slip = result);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Đã chốt phiếu lương cho ${widget.workerName}')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Xuất phiếu lương thất bại')));
    } finally {
      if (mounted) setState(() => exporting = false);
    }
  }

  Future<void> _downloadAndShare(String format) async {
    final currentSlip = slip;
    if (currentSlip == null) return;
    setState(() => downloadingFormat = format);
    final api = context.read<ApiClient>();
    try {
      final bytes = await PayrollService(api).exportFile(currentSlip.id, format);
      final dir = await getTemporaryDirectory();
      final ext = format == 'xlsx' ? 'xlsx' : 'pdf';
      final safeName = widget.workerName.replaceAll(RegExp(r'\s+'), '_');
      final file = File('${dir.path}/phieu-luong-$safeName-${widget.range.fromIso}_${widget.range.toIso}.$ext');
      await file.writeAsBytes(bytes, flush: true);
      if (!mounted) return;
      await Share.shareXFiles(
        [XFile(file.path)],
        text: 'Phiếu lương ${widget.workerName} - kỳ ${formatDate(widget.range.from)} - ${formatDate(widget.range.to)}',
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e is ApiException ? e.message : 'Tải file thất bại')));
    } finally {
      if (mounted) setState(() => downloadingFormat = null);
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
            child: Text(
              'Kỳ lương ${formatDate(widget.range.from)} - ${formatDate(widget.range.to)}',
              style: const TextStyle(color: AppColors.gray500, fontSize: 12.5),
            ),
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
                        ..._groupReportsByDay(detail!.reports).entries.expand((entry) {
                          final subtotal = entry.value.fold<double>(0, (sum, r) => sum + r.amount);
                          return [
                            Padding(
                              padding: const EdgeInsets.fromLTRB(4, 10, 4, 6),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Ngày ${entry.key}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                                  Text(
                                    'Cộng ngày: ${formatCurrency(subtotal)}',
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5, color: AppColors.brand600),
                                  ),
                                ],
                              ),
                            ),
                            ...entry.value.map((r) => ReportTile(report: r)),
                          ];
                        }),
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        onPressed: exporting ? null : _export,
                        icon: const Icon(Iconsax.send, size: 18),
                        label: Text(exporting ? 'Đang chốt...' : 'Chốt phiếu lương'),
                      ),
                      if (slip != null) ...[
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: downloadingFormat != null ? null : () => _downloadAndShare('pdf'),
                                icon: const Icon(Iconsax.document_text, size: 18),
                                label: Text(downloadingFormat == 'pdf' ? 'Đang tải...' : 'Tải PDF'),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: downloadingFormat != null ? null : () => _downloadAndShare('xlsx'),
                                icon: const Icon(Iconsax.document_download, size: 18),
                                label: Text(downloadingFormat == 'xlsx' ? 'Đang tải...' : 'Tải Excel'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
    );
  }
}
