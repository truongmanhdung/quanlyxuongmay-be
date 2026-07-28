import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'config.dart';

// Backend mien phi tren Render "ngu" sau thoi gian khong hoat dong va co the
// mat 30-50s de khoi dong lai o request dau tien - cho thoi gian rong rai
// truoc khi bao loi, thay vi treo vo han hoac bao loi qua som.
const _requestTimeout = Duration(seconds: 45);

class ApiException implements Exception {
  final String message;
  final int status;
  ApiException(this.message, this.status);

  @override
  String toString() => message;
}

class ApiClient {
  static const _tokenKey = 'xm_token';
  String? _token;

  String? get token => _token;

  Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(_tokenKey);
  }

  Future<void> setToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Uri _uri(String path, [Map<String, String>? query]) {
    final cleanQuery = query?.entries.where((e) => e.value.isNotEmpty).fold<Map<String, String>>(
          {},
          (map, e) => map..[e.key] = e.value,
        );
    return Uri.parse('$apiBaseUrl$path').replace(
      queryParameters: cleanQuery != null && cleanQuery.isNotEmpty ? cleanQuery : null,
    );
  }

  dynamic _handle(http.Response res) {
    if (res.statusCode == 204 || res.body.isEmpty) return null;
    final decoded = jsonDecode(utf8.decode(res.bodyBytes));
    if (res.statusCode >= 200 && res.statusCode < 300) return decoded;
    final message = (decoded is Map && decoded['message'] != null)
        ? decoded['message'] as String
        : 'Lỗi ${res.statusCode}';
    throw ApiException(message, res.statusCode);
  }

  Future<http.Response> _withTimeout(Future<http.Response> request) {
    return request.timeout(
      _requestTimeout,
      onTimeout: () => throw ApiException('Kết nối máy chủ quá lâu, vui lòng thử lại', 0),
    );
  }

  Future<dynamic> get(String path, {Map<String, String>? query}) async {
    final res = await _withTimeout(http.get(_uri(path, query), headers: _headers));
    return _handle(res);
  }

  Future<dynamic> post(String path, {Object? body}) async {
    final res = await _withTimeout(http.post(_uri(path), headers: _headers, body: body != null ? jsonEncode(body) : null));
    return _handle(res);
  }

  Future<dynamic> put(String path, {Object? body}) async {
    final res = await _withTimeout(http.put(_uri(path), headers: _headers, body: body != null ? jsonEncode(body) : null));
    return _handle(res);
  }

  Future<dynamic> patch(String path, {Object? body}) async {
    final res = await _withTimeout(http.patch(_uri(path), headers: _headers, body: body != null ? jsonEncode(body) : null));
    return _handle(res);
  }

  Future<void> delete(String path) async {
    final res = await _withTimeout(http.delete(_uri(path), headers: _headers));
    _handle(res);
  }
}
