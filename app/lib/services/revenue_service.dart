import '../core/api_client.dart';
import '../models/revenue.dart';

class RevenueService {
  final ApiClient api;
  RevenueService(this.api);

  Future<RevenueSummary> summary(String from, String to) async {
    final res = await api.get('/revenue/summary', query: {'from': from, 'to': to});
    return RevenueSummary.fromJson(res as Map<String, dynamic>);
  }

  Future<RevenueDetail> detail(String from, String to, {required String customer}) async {
    final res = await api.get('/revenue', query: {'from': from, 'to': to, 'customer': customer});
    return RevenueDetail.fromJson(res as Map<String, dynamic>);
  }

  Future<List<RevenueSlip>> listSlips({String? customer, String? from, String? to}) async {
    final res = await api.get('/revenue/slips', query: {'customer': customer ?? '', 'from': from ?? '', 'to': to ?? ''});
    return (res as List<dynamic>).map((e) => RevenueSlip.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<RevenueSlip> export(String customer, String from, String to) async {
    final res = await api.post('/revenue/export', body: {'customer': customer, 'from': from, 'to': to});
    return RevenueSlip.fromJson(res as Map<String, dynamic>);
  }

  Future<List<int>> exportFile(String slipId, String format) {
    return api.getBytes('/revenue/slips/$slipId/export', query: {'format': format});
  }
}
