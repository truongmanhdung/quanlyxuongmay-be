import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/socket_service.dart';
import '../../core/theme.dart';
import '../../models/notification_item.dart';
import '../../services/notification_service.dart';

class WorkerNotificationsScreen extends StatefulWidget {
  final VoidCallback? onChanged;
  const WorkerNotificationsScreen({super.key, this.onChanged});

  @override
  State<WorkerNotificationsScreen> createState() => _WorkerNotificationsScreenState();
}

class _WorkerNotificationsScreenState extends State<WorkerNotificationsScreen> {
  List<NotificationItem> notifications = [];
  bool loading = true;
  String? error;
  late final SocketService _socket;

  void _handleRealtimeEvent(dynamic _) => _load();

  @override
  void initState() {
    super.initState();
    _load();
    _socket = context.read<SocketService>();
    _socket.on('notification:new', _handleRealtimeEvent);
    _socket.on('report:status', _handleRealtimeEvent);
  }

  @override
  void dispose() {
    _socket.off('notification:new', _handleRealtimeEvent);
    _socket.off('report:status', _handleRealtimeEvent);
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    final api = context.read<ApiClient>();
    try {
      final data = await NotificationService(api).mine();
      setState(() {
        notifications = data;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được thông báo';
        loading = false;
      });
    }
  }

  Future<void> _markRead(NotificationItem n) async {
    if (n.read) return;
    final api = context.read<ApiClient>();
    try {
      await NotificationService(api).markRead(n.id);
      setState(() {
        notifications = notifications.map((x) => x.id == n.id ? _withRead(x) : x).toList();
      });
      widget.onChanged?.call();
    } catch (_) {
      // bo qua, khong quan trong neu danh dau doc that bai
    }
  }

  NotificationItem _withRead(NotificationItem n) => NotificationItem(
        id: n.id,
        title: n.title,
        body: n.body,
        type: n.type,
        read: true,
        createdAt: n.createdAt,
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Thông báo')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text(error!, style: const TextStyle(color: AppColors.gray500)))
              : RefreshIndicator(
              onRefresh: _load,
              child: notifications.isEmpty
                  ? ListView(children: const [Padding(padding: EdgeInsets.all(32), child: Center(child: Text('Chưa có thông báo nào')))])
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: notifications.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, i) {
                        final n = notifications[i];
                        return Card(
                          color: n.read ? null : AppColors.brand50,
                          child: ListTile(
                            onTap: () => _markRead(n),
                            leading: Icon(
                              Iconsax.notification,
                              color: n.read ? AppColors.gray400 : AppColors.brand500,
                            ),
                            title: Text(n.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                            subtitle: Text('${n.body ?? ''}\n${formatDateTime(n.createdAt)}'),
                            isThreeLine: true,
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
