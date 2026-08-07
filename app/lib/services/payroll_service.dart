import '../core/api_client.dart';
import '../models/payroll.dart';

class PayrollService {
  final ApiClient api;
  PayrollService(this.api);

  Future<PayrollSummary> summary(String from, String to) async {
    final res = await api.get('/payroll/summary', query: {'from': from, 'to': to});
    return PayrollSummary.fromJson(res as Map<String, dynamic>);
  }

  Future<PayrollDetail> detail(String from, String to, {String? worker}) async {
    final res = await api.get('/payroll', query: {'from': from, 'to': to, 'worker': worker ?? ''});
    return PayrollDetail.fromJson(res as Map<String, dynamic>);
  }

  Future<List<PayrollSlip>> listSlips({String? worker, String? from, String? to}) async {
    final res = await api.get('/payroll/slips', query: {'worker': worker ?? '', 'from': from ?? '', 'to': to ?? ''});
    return (res as List<dynamic>).map((e) => PayrollSlip.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<PayrollSlip> export(String worker, String from, String to) async {
    final res = await api.post('/payroll/export', body: {'worker': worker, 'from': from, 'to': to});
    return PayrollSlip.fromJson(res as Map<String, dynamic>);
  }

  Future<List<int>> exportFile(String slipId, String format) {
    return api.getBytes('/payroll/slips/$slipId/export', query: {'format': format});
  }
}
