import 'package:firebase_messaging/firebase_messaging.dart';

// Xin quyen va lay device token de dang ky nhan push notification (Firebase Cloud
// Messaging). Viec hien banner khi app o nen/tat la Android/iOS tu lam voi payload
// "notification" ma backend gui - khong can xu ly them o day.
class PushNotificationService {
  final _messaging = FirebaseMessaging.instance;

  Future<String?> requestPermissionAndGetToken() async {
    await _messaging.requestPermission(alert: true, badge: true, sound: true);
    try {
      return await _messaging.getToken();
    } catch (_) {
      return null;
    }
  }

  Stream<String> get onTokenRefresh => _messaging.onTokenRefresh;
}
