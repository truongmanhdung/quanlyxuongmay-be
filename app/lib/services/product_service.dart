import '../core/api_client.dart';
import '../models/product.dart';

class ProductService {
  final ApiClient api;
  ProductService(this.api);

  Future<List<Product>> list({String? customer, String? search, bool? active}) async {
    final res = await api.get('/products', query: {
      'customer': customer ?? '',
      'search': search ?? '',
      if (active != null) 'active': active.toString(),
    });
    return (res as List<dynamic>).map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Product> get(String id) async {
    final res = await api.get('/products/$id');
    return Product.fromJson(res as Map<String, dynamic>);
  }

  Future<List<ProcessStage>> listStages(String productId) async {
    final res = await api.get('/products/$productId/stages');
    return (res as List<dynamic>).map((e) => ProcessStage.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Product> create({
    required String name,
    required String customer,
    String? unit,
    double? standardPrice,
    List<Map<String, dynamic>>? stages,
  }) async {
    final res = await api.post('/products', body: {
      'name': name,
      'customer': customer,
      'unit': unit,
      'standardPrice': standardPrice ?? 0,
      if (stages != null && stages.isNotEmpty) 'stages': stages,
    });
    return Product.fromJson(res as Map<String, dynamic>);
  }

  Future<Product> update(String id, {String? name, String? unit, double? standardPrice, bool? active}) async {
    final res = await api.put('/products/$id', body: {
      if (name != null) 'name': name,
      if (unit != null) 'unit': unit,
      if (standardPrice != null) 'standardPrice': standardPrice,
      if (active != null) 'active': active,
    });
    return Product.fromJson(res as Map<String, dynamic>);
  }

  Future<void> remove(String id) => api.delete('/products/$id');

  Future<ProcessStage> createStage(String productId, {required String name, required double unitPrice}) async {
    final res = await api.post('/products/$productId/stages', body: {'name': name, 'unitPrice': unitPrice});
    return ProcessStage.fromJson(res as Map<String, dynamic>);
  }

  Future<ProcessStage> updateStage(
    String productId,
    String stageId, {
    String? name,
    double? unitPrice,
    bool? active,
  }) async {
    final res = await api.put('/products/$productId/stages/$stageId', body: {
      if (name != null) 'name': name,
      if (unitPrice != null) 'unitPrice': unitPrice,
      if (active != null) 'active': active,
    });
    return ProcessStage.fromJson(res as Map<String, dynamic>);
  }

  Future<void> removeStage(String productId, String stageId) => api.delete('/products/$productId/stages/$stageId');
}
