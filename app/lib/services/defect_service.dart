import '../core/api_client.dart';
import '../models/defect_report.dart';

class DefectService {
  final ApiClient api;
  DefectService(this.api);

  Future<List<DefectReport>> list({String? type}) async {
    final res = await api.get('/defects', query: {'type': type ?? ''});
    return (res as List<dynamic>).map((e) => DefectReport.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<DefectReport> create({
    required String product,
    required String customer,
    required double quantity,
    required String type,
    String? reason,
  }) async {
    final res = await api.post('/defects', body: {
      'product': product,
      'customer': customer,
      'quantity': quantity,
      'type': type,
      'reason': reason,
    });
    return DefectReport.fromJson(res as Map<String, dynamic>);
  }

  Future<void> remove(String id) => api.delete('/defects/$id');
}
