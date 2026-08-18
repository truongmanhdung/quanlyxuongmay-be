import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';
import 'core/api_client.dart';
import 'core/push_notification_service.dart';
import 'core/socket_service.dart';
import 'core/theme.dart';
import 'firebase_options.dart';
import 'providers/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/manager/manager_shell.dart';
import 'screens/worker/worker_shell.dart';

// Bat buoc la ham top-level (khong phai method cua class) de Firebase co the goi
// tu isolate rieng khi app dang o nen/tat va co push notification moi den.
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  runApp(const MainApp());
}

class MainApp extends StatelessWidget {
  const MainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiClient>(create: (_) => ApiClient()),
        Provider<SocketService>(create: (_) => SocketService()),
        Provider<PushNotificationService>(create: (_) => PushNotificationService()),
        ChangeNotifierProvider<AuthProvider>(
          create: (context) => AuthProvider(
            context.read<ApiClient>(),
            context.read<SocketService>(),
            context.read<PushNotificationService>(),
          ),
        ),
      ],
      child: MaterialApp(
        title: 'Quản lý xưởng may BÌNH CANH',
        debugShowCheckedModeBanner: false,
        theme: buildAppTheme(brightness: Brightness.light),
        darkTheme: buildAppTheme(brightness: Brightness.dark),
        home: const RootRouter(),
      ),
    );
  }
}

class RootRouter extends StatelessWidget {
  const RootRouter({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (auth.loading) {
      return const _StartupLoadingScreen();
    }

    switch (auth.role) {
      case UserRole.admin:
        return const ManagerShell();
      case UserRole.worker:
        return const WorkerShell();
      case UserRole.none:
        return const LoginScreen();
    }
  }
}

// Man hinh cho khi AuthProvider goi /auth/me luc khoi dong app. Backend mien phi
// tren Render "ngu" sau thoi gian khong hoat dong nen lan goi dau co the mat toi
// 30-50s de khoi dong lai - hien thong bao sau vai giay de nguoi dung khong tuong
// app bi treo.
class _StartupLoadingScreen extends StatefulWidget {
  const _StartupLoadingScreen();

  @override
  State<_StartupLoadingScreen> createState() => _StartupLoadingScreenState();
}

class _StartupLoadingScreenState extends State<_StartupLoadingScreen> {
  bool _showSlowHint = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer(const Duration(seconds: 4), () {
      if (mounted) setState(() => _showSlowHint = true);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: AppColors.brand500, borderRadius: BorderRadius.circular(18)),
                child: const Icon(Iconsax.bag_2, color: Colors.white, size: 32),
              ),
              const SizedBox(height: 20),
              Text(
                'Quản lý xưởng may BÌNH CANH',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: isDark ? Colors.white : AppColors.gray900),
              ),
              const SizedBox(height: 24),
              const CircularProgressIndicator(),
              const SizedBox(height: 20),
              AnimatedOpacity(
                opacity: _showSlowHint ? 1 : 0,
                duration: const Duration(milliseconds: 400),
                child: Text(
                  'Máy chủ đang khởi động lại, vui lòng đợi trong giây lát...',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.gray500, fontSize: 13),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
