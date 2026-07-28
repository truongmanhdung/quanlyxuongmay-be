import '../core/api_client.dart';
import '../models/customer.dart';

class CustomerService {
  final ApiClient api;
  CustomerService(this.api);

  Future<List<Customer>> list({String? search}) async {
    final res = await api.get('/customers', query: {'search': search ?? ''});
    return (res as List<dynamic>).map((e) => Customer.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Customer> create({required String code, required String name, String? phone, String? note}) async {
    final res = await api.post('/customers', body: {'code': code, 'name': name, 'phone': phone, 'note': note});
    return Customer.fromJson(res as Map<String, dynamic>);
  }
}
