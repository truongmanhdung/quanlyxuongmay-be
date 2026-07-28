import '../core/api_client.dart';
import '../models/notification_item.dart';

class NotificationService {
  final ApiClient api;
  NotificationService(this.api);

  Future<List<NotificationItem>> mine() async {
    final res = await api.get('/notifications/mine');
    return (res as List<dynamic>).map((e) => NotificationItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> markRead(String id) => api.patch('/notifications/$id/read');

  Future<int> remindAll() async {
    final res = await api.post('/notifications/remind', body: {});
    return (res as Map<String, dynamic>)['remindedCount'] as int? ?? 0;
  }
}
