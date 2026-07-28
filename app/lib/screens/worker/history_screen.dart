import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/socket_service.dart';
import '../../models/production_report.dart';
import '../../services/report_service.dart';
import '../../widgets/report_tile.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<ProductionReport> reports = [];
  bool loading = true;
  String? error;
  late final SocketService _socket;

  void _handleReportStatus(dynamic _) => _load();

  @override
  void initState() {
    super.initState();
    _load();
    _socket = context.read<SocketService>();
    _socket.on('report:status', _handleReportStatus);
  }

  @override
  void dispose() {
    _socket.off('report:status', _handleReportStatus);
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    final api = context.read<ApiClient>();
    try {
      final data = await ReportService(api).mine();
      setState(() {
        reports = data;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được lịch sử';
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Lịch sử gửi sản lượng')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: error != null
                  ? ListView(children: [Center(child: Padding(padding: const EdgeInsets.all(32), child: Text(error!)))])
                  : reports.isEmpty
                      ? ListView(
                          children: const [
                            Padding(
                              padding: EdgeInsets.all(32),
                              child: Center(child: Text('Chưa có lần gửi sản lượng nào')),
                            ),
                          ],
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: reports.length,
                          itemBuilder: (context, i) => ReportTile(report: reports[i]),
                        ),
            ),
    );
  }
}
