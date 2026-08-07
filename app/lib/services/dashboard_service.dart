import '../core/api_client.dart';
import '../models/dashboard.dart';

class DashboardService {
  final ApiClient api;
  DashboardService(this.api);

  Future<DashboardOverview> overview({String? from, String? to, int days = 14}) async {
    final res = await api.get('/dashboard/overview', query: {'from': from ?? '', 'to': to ?? '', 'days': '$days'});
    return DashboardOverview.fromJson(res as Map<String, dynamic>);
  }
}
