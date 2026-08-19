import '../core/api_client.dart';
import '../models/worker.dart';

class WorkerService {
  final ApiClient api;
  WorkerService(this.api);

  Future<List<Worker>> list({String? search, bool? active}) async {
    final res = await api.get('/workers', query: {
      'search': search ?? '',
      if (active != null) 'active': active.toString(),
    });
    return (res as List<dynamic>).map((e) => Worker.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Worker> create({required String name, String? phone, String? note}) async {
    final res = await api.post('/workers', body: {'name': name, 'phone': phone, 'note': note});
    return Worker.fromJson(res as Map<String, dynamic>);
  }

  Future<Worker> update(String id, {String? name, String? phone, String? note, bool? active}) async {
    final res = await api.put('/workers/$id', body: {
      if (name != null) 'name': name,
      if (phone != null) 'phone': phone,
      if (note != null) 'note': note,
      if (active != null) 'active': active,
    });
    return Worker.fromJson(res as Map<String, dynamic>);
  }

  Future<void> remove(String id) => api.delete('/workers/$id');
}
