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

  Future<void> export(String worker, String period) async {
    await api.post('/payroll/export', body: {'worker': worker, 'period': period});
  }
}
