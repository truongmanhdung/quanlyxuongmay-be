import '../core/api_client.dart';
import '../models/order.dart';

class OrderService {
  final ApiClient api;
  OrderService(this.api);

  Future<List<Order>> list({String? type}) async {
    final res = await api.get('/orders', query: {'type': type ?? ''});
    return (res as List<dynamic>).map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Order> create({
    required String code,
    required String type,
    required String customer,
    DateTime? date,
    String? note,
    List<Map<String, dynamic>>? details,
  }) async {
    final res = await api.post('/orders', body: {
      'code': code,
      'type': type,
      'customer': customer,
      if (date != null) 'date': date.toIso8601String(),
      'note': note,
      'details': details ?? [],
    });
    return Order.fromJson(res as Map<String, dynamic>);
  }

  Future<List<StockSummaryRow>> stockSummary(String customer) async {
    final res = await api.get('/orders/stock-summary', query: {'customer': customer});
    final rows = (res as Map<String, dynamic>)['rows'] as List<dynamic>? ?? [];
    return rows.map((e) => StockSummaryRow.fromJson(e as Map<String, dynamic>)).toList();
  }
}
