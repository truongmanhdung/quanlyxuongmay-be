import '../core/api_client.dart';
import '../models/customer.dart';

class CustomerService {
  final ApiClient api;
  CustomerService(this.api);

  Future<List<Customer>> list({String? search, bool? active}) async {
    final res = await api.get('/customers', query: {
      'search': search ?? '',
      if (active != null) 'active': active.toString(),
    });
    return (res as List<dynamic>).map((e) => Customer.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Customer> create({required String name, String? phone, String? note}) async {
    final res = await api.post('/customers', body: {'name': name, 'phone': phone, 'note': note});
    return Customer.fromJson(res as Map<String, dynamic>);
  }

  Future<Customer> update(String id, {String? name, String? phone, String? note, bool? active}) async {
    final res = await api.put('/customers/$id', body: {
      if (name != null) 'name': name,
      if (phone != null) 'phone': phone,
      if (note != null) 'note': note,
      if (active != null) 'active': active,
    });
    return Customer.fromJson(res as Map<String, dynamic>);
  }

  Future<void> remove(String id) => api.delete('/customers/$id');
}
