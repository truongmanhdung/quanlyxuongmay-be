import '../core/api_client.dart';
import '../models/worker.dart';

class WorkerService {
  final ApiClient api;
  WorkerService(this.api);

  Future<List<Worker>> list({String? search}) async {
    final res = await api.get('/workers', query: {'search': search ?? ''});
    return (res as List<dynamic>).map((e) => Worker.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Worker> create({required String code, required String name, String? phone, String? note}) async {
    final res = await api.post('/workers', body: {'code': code, 'name': name, 'phone': phone, 'note': note});
    return Worker.fromJson(res as Map<String, dynamic>);
  }

  Future<Worker> update(String id, {required String name, String? phone, String? note}) async {
    final res = await api.put('/workers/$id', body: {'name': name, 'phone': phone, 'note': note});
    return Worker.fromJson(res as Map<String, dynamic>);
  }

  Future<void> remove(String id) => api.delete('/workers/$id');
}
