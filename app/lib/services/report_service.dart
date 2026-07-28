import '../core/api_client.dart';
import '../models/production_report.dart';

class ReportService {
  final ApiClient api;
  ReportService(this.api);

  Future<ProductionReport> submit({
    required String customer,
    required String product,
    required String processStage,
    String? batchNumber,
    required double quantity,
    DateTime? workDate,
  }) async {
    final res = await api.post('/reports', body: {
      'customer': customer,
      'product': product,
      'processStage': processStage,
      'batchNumber': batchNumber,
      'quantity': quantity,
      if (workDate != null) 'workDate': workDate.toIso8601String(),
    });
    return ProductionReport.fromJson(res as Map<String, dynamic>);
  }

  Future<List<ProductionReport>> mine() async {
    final res = await api.get('/reports/mine');
    return (res as List<dynamic>).map((e) => ProductionReport.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<ProductionReport>> list({String? worker, String? status}) async {
    final res = await api.get('/reports', query: {'worker': worker ?? '', 'status': status ?? ''});
    return (res as List<dynamic>).map((e) => ProductionReport.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ProductionReport> setStatus(String id, String status) async {
    final res = await api.patch('/reports/$id/status', body: {'status': status});
    return ProductionReport.fromJson(res as Map<String, dynamic>);
  }
}
