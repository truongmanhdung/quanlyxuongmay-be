import '../core/api_client.dart';
import '../models/product.dart';

class ProductService {
  final ApiClient api;
  ProductService(this.api);

  Future<List<Product>> list({String? customer, String? search}) async {
    final res = await api.get('/products', query: {'customer': customer ?? '', 'search': search ?? ''});
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
    required String code,
    required String name,
    required String customer,
    String? unit,
    double? standardPrice,
  }) async {
    final res = await api.post('/products', body: {
      'code': code,
      'name': name,
      'customer': customer,
      'unit': unit,
      'standardPrice': standardPrice ?? 0,
    });
    return Product.fromJson(res as Map<String, dynamic>);
  }

  Future<ProcessStage> createStage(String productId, {required String name, required double unitPrice}) async {
    final res = await api.post('/products/$productId/stages', body: {'name': name, 'unitPrice': unitPrice});
    return ProcessStage.fromJson(res as Map<String, dynamic>);
  }
}
