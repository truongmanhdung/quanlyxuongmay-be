import '../core/api_client.dart';
import '../models/payroll.dart';

class PayrollService {
  final ApiClient api;
  PayrollService(this.api);

  Future<PayrollSummary> summary(String period) async {
    final res = await api.get('/payroll/summary', query: {'period': period});
    return PayrollSummary.fromJson(res as Map<String, dynamic>);
  }

  Future<PayrollDetail> detail(String period, {String? worker}) async {
    final res = await api.get('/payroll', query: {'period': period, 'worker': worker ?? ''});
    return PayrollDetail.fromJson(res as Map<String, dynamic>);
  }

  Future<List<PayrollSlip>> listSlips({String? worker, String? period}) async {
    final res = await api.get('/payroll/slips', query: {'worker': worker ?? '', 'period': period ?? ''});
    return (res as List<dynamic>).map((e) => PayrollSlip.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<PayrollSlip> export(String worker, String period) async {
    final res = await api.post('/payroll/export', body: {'worker': worker, 'period': period});
    return PayrollSlip.fromJson(res as Map<String, dynamic>);
  }

  Future<List<int>> exportFile(String slipId, String format) {
    return api.getBytes('/payroll/slips/$slipId/export', query: {'format': format});
  }
}
