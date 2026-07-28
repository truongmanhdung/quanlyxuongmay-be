import '../core/api_client.dart';
import '../models/batch.dart';

class BatchService {
  final ApiClient api;
  BatchService(this.api);

  Future<List<Batch>> list({String? status, String? search}) async {
    final res = await api.get('/batches', query: {'status': status ?? '', 'search': search ?? ''});
    return (res as List<dynamic>).map((e) => Batch.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Batch> create({
    required String code,
    required String product,
    required String customer,
    double? plannedQuantity,
    String? note,
  }) async {
    final res = await api.post('/batches', body: {
      'code': code,
      'product': product,
      'customer': customer,
      'plannedQuantity': plannedQuantity,
      'note': note,
    });
    return Batch.fromJson(res as Map<String, dynamic>);
  }

  Future<Batch> complete(String id) async {
    final res = await api.patch('/batches/$id/complete');
    return Batch.fromJson(res as Map<String, dynamic>);
  }

  Future<void> remove(String id) => api.delete('/batches/$id');
}
