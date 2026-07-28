import 'dart:async';
import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../core/push_notification_service.dart';
import '../core/socket_service.dart';
import '../services/auth_service.dart';

enum UserRole { none, admin, worker }

class AuthProvider extends ChangeNotifier {
  final ApiClient api;
  final SocketService socket;
  final PushNotificationService push;
  late final AuthService _authService;
  StreamSubscription<String>? _tokenRefreshSub;

  UserRole role = UserRole.none;
  AdminUser? adminUser;
  WorkerAccount? workerAccount;
  bool loading = true;
  String? error;

  AuthProvider(this.api, this.socket, this.push) {
    _authService = AuthService(api);
    _restore();
    // Token FCM co the doi lai (vd sau khi cai lai app) - dang ky lai voi backend
    // moi khi co token moi, chi ap dung cho cong nhan (backend chi luu fcmToken tren Worker).
    _tokenRefreshSub = push.onTokenRefresh.listen((token) {
      if (role == UserRole.worker) _authService.registerFcmToken(token).catchError((_) {});
    });
  }

  @override
  void dispose() {
    _tokenRefreshSub?.cancel();
    super.dispose();
  }

  // Xin quyen thong bao + lay device token + gui len backend. Bo qua loi (vd nguoi
  // dung tu choi quyen) de khong lam gian doan luong dang nhap.
  Future<void> _registerPushToken() async {
    try {
      final token = await push.requestPermissionAndGetToken();
      if (token != null) await _authService.registerFcmToken(token);
    } catch (_) {
      // khong sao, push notification la tinh nang bo sung, khong bat buoc de dang nhap
    }
  }

  Future<void> _restore() async {
    await api.loadToken();
    if (api.token == null) {
      loading = false;
      notifyListeners();
      return;
    }
    try {
      final res = await _authService.me();
      if (res['role'] == 'admin') {
        role = UserRole.admin;
        adminUser = AdminUser.fromJson(res['user'] as Map<String, dynamic>);
      } else {
        role = UserRole.worker;
        workerAccount = WorkerAccount.fromJson(res['worker'] as Map<String, dynamic>);
        unawaited(_registerPushToken());
      }
      socket.connect(api.token!);
    } catch (e) {
      // Chi xoa token khi server tra loi ro rang la token khong hop le (401/403).
      // Loi mang/timeout (vd Render "ngu" phai khoi dong lai) khong duoc coi la dang xuat,
      // neu khong nguoi dung se bi dang xuat oan chi vi server phan hoi cham.
      if (e is ApiException && (e.status == 401 || e.status == 403)) {
        await api.clearToken();
      }
      role = UserRole.none;
    }
    loading = false;
    notifyListeners();
  }

  Future<void> loginAdmin(String username, String password) async {
    error = null;
    adminUser = await _authService.adminLogin(username, password);
    role = UserRole.admin;
    socket.connect(api.token!);
    notifyListeners();
  }

  Future<void> loginWorker(String code) async {
    error = null;
    workerAccount = await _authService.workerLogin(code);
    role = UserRole.worker;
    socket.connect(api.token!);
    unawaited(_registerPushToken());
    notifyListeners();
  }

  Future<void> logout() async {
    socket.disconnect();
    await api.clearToken();
    role = UserRole.none;
    adminUser = null;
    workerAccount = null;
    notifyListeners();
  }
}
