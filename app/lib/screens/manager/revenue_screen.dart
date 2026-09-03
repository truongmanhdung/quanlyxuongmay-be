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
import '../../models/revenue.dart';
import '../../services/revenue_service.dart';
import '../../widgets/date_range_filter.dart';

class RevenueScreen extends StatefulWidget {
  const RevenueScreen({super.key});

  @override
  State<RevenueScreen> createState() => _RevenueScreenState();
}

class _RevenueScreenState extends State<RevenueScreen> {
  DateRange range = DateRange.defaultRange();
  RevenueSummary? summary;
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
      final res = await RevenueService(api).summary(range.fromIso, range.toIso);
      setState(() {
        summary = res;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được bảng doanh thu';
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
      appBar: AppBar(title: const Text('Doanh thu khách hàng')),
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
                              const Text('Tổng doanh thu', style: TextStyle(color: AppColors.brand700)),
                              Text(
                                formatCurrency(_totalAmount),
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700, color: AppColors.brand700, fontSize: 16),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (summary == null || summary!.rows.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 32),
                          child: Center(child: Text('Chưa có lô hàng hoàn thành nào trong kỳ này')),
                        )
                      else
                        ...summary!.rows.where((r) => r.customer != null).map(
                              (r) => Card(
                                margin: const EdgeInsets.only(bottom: 10),
                                child: ListTile(
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                                  title: Text(r.customer!.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                                  subtitle: Text(
                                      '${r.customer!.code} · ${formatNumber(r.batchCount)} lô · ${formatNumber(r.totalQuantity)} sp'),
                                  trailing: Text(
                                    formatCurrency(r.totalAmount),
                                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.brand600),
                                  ),
                                  onTap: () => Navigator.of(context).push(
                                    slideRoute(
                                      RevenueDetailScreen(
                                        customerId: r.customer!.id,
                                        customerName: r.customer!.name,
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

class RevenueDetailScreen extends StatefulWidget {
  final String customerId;
  final String customerName;
  final DateRange range;
  const RevenueDetailScreen({
    super.key,
    required this.customerId,
    required this.customerName,
    required this.range,
  });

  @override
  State<RevenueDetailScreen> createState() => _RevenueDetailScreenState();
}

class _RevenueDetailScreenState extends State<RevenueDetailScreen> {
  RevenueDetail? detail;
  RevenueSlip? slip;
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
        RevenueService(api).detail(widget.range.fromIso, widget.range.toIso, customer: widget.customerId),
        RevenueService(api).listSlips(customer: widget.customerId, from: widget.range.fromIso, to: widget.range.toIso),
      ]);
      final res = results[0] as RevenueDetail;
      final existingSlips = results[1] as List<RevenueSlip>;
      setState(() {
        detail = res;
        slip = existingSlips.isNotEmpty ? existingSlips.first : null;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được chi tiết doanh thu';
        loading = false;
      });
    }
  }

  Future<void> _export() async {
    setState(() => exporting = true);
    final api = context.read<ApiClient>();
    try {
      final result = await RevenueService(api).export(widget.customerId, widget.range.fromIso, widget.range.toIso);
      if (!mounted) return;
      setState(() => slip = result);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Đã chốt phiếu doanh thu cho ${widget.customerName}')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Chốt phiếu doanh thu thất bại')));
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
      final bytes = await RevenueService(api).exportFile(currentSlip.id, format);
      final dir = await getTemporaryDirectory();
      final ext = format == 'xlsx' ? 'xlsx' : 'pdf';
      final safeName = widget.customerName.replaceAll(RegExp(r'\s+'), '_');
      final file = File('${dir.path}/doanh-thu-$safeName-${widget.range.fromIso}_${widget.range.toIso}.$ext');
      await file.writeAsBytes(bytes, flush: true);
      if (!mounted) return;
      await Share.shareXFiles(
        [XFile(file.path)],
        text:
            'Doanh thu ${widget.customerName} - kỳ ${formatDate(widget.range.from)} - ${formatDate(widget.range.to)}',
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e is ApiException ? e.message : 'Tải file thất bại')));
    } finally {
      if (mounted) setState(() => downloadingFormat = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.customerName),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(22),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Text(
              'Kỳ ${formatDate(widget.range.from)} - ${formatDate(widget.range.to)}',
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
                                  const Text('Tổng doanh thu',
                                      style: TextStyle(color: AppColors.brand700, fontSize: 12.5)),
                                  const SizedBox(height: 2),
                                  Text(
                                    formatCurrency(detail!.totalAmount),
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w700, color: AppColors.brand700, fontSize: 18),
                                  ),
                                ],
                              ),
                              Text('${formatNumber(detail!.lines.length)} lô',
                                  style: const TextStyle(color: AppColors.brand700, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (detail!.lines.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 32),
                          child: Center(
                              child: Text('Chưa có lô hàng hoàn thành trong kỳ này',
                                  style: TextStyle(color: AppColors.gray500))),
                        )
                      else ...[
                        const Padding(
                          padding: EdgeInsets.fromLTRB(4, 4, 4, 8),
                          child: Text('Chi tiết theo lô hàng hoàn thành',
                              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                        ),
                        ...detail!.lines.map((l) => _BatchLineTile(line: l)),
                        const SizedBox(height: 10),
                        Card(
                          color: AppColors.brand600,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('TỔNG TIỀN ${widget.customerName.toUpperCase()}',
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                                Text(
                                  formatCurrency(detail!.totalAmount),
                                  style: const TextStyle(
                                      color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        onPressed: exporting ? null : _export,
                        icon: const Icon(Iconsax.send, size: 18),
                        label: Text(exporting ? 'Đang chốt...' : 'Chốt phiếu doanh thu'),
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

class _BatchLineTile extends StatelessWidget {
  final RevenueBatchLine line;
  const _BatchLineTile({required this.line});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(line.productName,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                ),
                Text(
                  formatCurrency(line.amount),
                  style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.brand600),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Lô ${line.code}'
              '${line.completedAt != null ? ' · ${formatDate(line.completedAt!)}' : ''}',
              style: const TextStyle(color: AppColors.gray500, fontSize: 12),
            ),
            const SizedBox(height: 2),
            Text(
              '${formatNumber(line.quantity)} × ${formatCurrency(line.unitPrice)}',
              style: const TextStyle(color: AppColors.gray500, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
