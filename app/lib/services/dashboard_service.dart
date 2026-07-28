import '../core/api_client.dart';
import '../models/dashboard.dart';

class DashboardService {
  final ApiClient api;
  DashboardService(this.api);

  Future<DashboardOverview> overview({String? period, int days = 14}) async {
    final res = await api.get('/dashboard/overview', query: {'period': period ?? '', 'days': '$days'});
    return DashboardOverview.fromJson(res as Map<String, dynamic>);
  }
}
