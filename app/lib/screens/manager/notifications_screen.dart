import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/socket_service.dart';
import '../../core/theme.dart';
import '../../models/production_report.dart';
import '../../services/report_service.dart';
import '../../widgets/filter_pill.dart';
import '../../widgets/report_tile.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<ProductionReport> reports = [];
  bool loading = true;
  String? error;
  String statusFilter = '';
  late final SocketService _socket;

  void _handleNewReport(dynamic _) => _load();

  @override
  void initState() {
    super.initState();
    _load();
    _socket = context.read<SocketService>();
    _socket.on('report:new', _handleNewReport);
  }

  @override
  void dispose() {
    _socket.off('report:new', _handleNewReport);
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    final api = context.read<ApiClient>();
    try {
      final data = await ReportService(api).list(status: statusFilter.isEmpty ? null : statusFilter);
      setState(() {
        reports = data;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được thông báo';
        loading = false;
      });
    }
  }

  Future<void> _setStatus(ProductionReport r, String status) async {
    final api = context.read<ApiClient>();
    try {
      await ReportService(api).setStatus(r.id, status);
      _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cập nhật trạng thái thất bại')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Duyệt sản lượng'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  FilterPill(label: 'Tất cả', selected: statusFilter == '', onTap: () => _changeFilter('')),
                  const SizedBox(width: 8),
                  FilterPill(label: 'Chờ duyệt', selected: statusFilter == 'pending', onTap: () => _changeFilter('pending')),
                  const SizedBox(width: 8),
                  FilterPill(label: 'Đã xác nhận', selected: statusFilter == 'confirmed', onTap: () => _changeFilter('confirmed')),
                  const SizedBox(width: 8),
                  FilterPill(label: 'Từ chối', selected: statusFilter == 'rejected', onTap: () => _changeFilter('rejected')),
                ],
              ),
            ),
          ),
        ),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text(error!))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: reports.isEmpty
                      ? ListView(children: const [Padding(padding: EdgeInsets.all(32), child: Center(child: Text('Không có báo cáo nào')))])
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: reports.length,
                          itemBuilder: (context, i) {
                            final r = reports[i];
                            return ReportTile(
                              report: r,
                              showWorker: true,
                              trailingAction: r.status == ReportStatus.pending
                                  ? Row(
                                      children: [
                                        Expanded(
                                          child: OutlinedButton(
                                            onPressed: () => _setStatus(r, 'rejected'),
                                            child: const Text('Từ chối', style: TextStyle(color: AppColors.error500)),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: ElevatedButton(
                                            onPressed: () => _setStatus(r, 'confirmed'),
                                            child: const Text('Xác nhận'),
                                          ),
                                        ),
                                      ],
                                    )
                                  : null,
                            );
                          },
                        ),
                ),
    );
  }

  void _changeFilter(String value) {
    setState(() => statusFilter = value);
    _load();
  }
}
