import '../core/api_client.dart';

class AdminUser {
  final String id;
  final String username;
  final String name;
  AdminUser({required this.id, required this.username, required this.name});
  factory AdminUser.fromJson(Map<String, dynamic> json) => AdminUser(
        id: (json['id'] ?? json['_id']) as String,
        username: json['username'] as String,
        name: json['name'] as String,
      );
}

class WorkerAccount {
  final String id;
  final String code;
  final String name;
  final String? phone;
  WorkerAccount({required this.id, required this.code, required this.name, this.phone});
  factory WorkerAccount.fromJson(Map<String, dynamic> json) => WorkerAccount(
        id: (json['id'] ?? json['_id']) as String,
        code: json['code'] as String,
        name: json['name'] as String,
        phone: json['phone'] as String?,
      );
}

class AuthService {
  final ApiClient api;
  AuthService(this.api);

  Future<AdminUser> adminLogin(String username, String password) async {
    final res = await api.post('/auth/admin/login', body: {'username': username, 'password': password});
    await api.setToken(res['token'] as String);
    return AdminUser.fromJson(res['user'] as Map<String, dynamic>);
  }

  Future<WorkerAccount> workerLogin(String code) async {
    final res = await api.post('/auth/worker/login', body: {'code': code});
    await api.setToken(res['token'] as String);
    return WorkerAccount.fromJson(res['worker'] as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> me() async {
    final res = await api.get('/auth/me');
    return res as Map<String, dynamic>;
  }

  Future<void> changePassword({required String currentPassword, required String newPassword}) async {
    await api.patch('/auth/admin/change-password', body: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
  }

  Future<void> registerFcmToken(String token) async {
    await api.patch('/auth/fcm-token', body: {'token': token});
  }
}
