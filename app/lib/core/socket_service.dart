import 'package:socket_io_client/socket_io_client.dart' as io;
import 'config.dart';

// Ket noi realtime toi backend, dung chung 1 socket cho ca admin va worker
// (phan biet room o phia server dua vao token JWT gui trong handshake).
class SocketService {
  io.Socket? _socket;

  void connect(String token) {
    _socket?.dispose();
    final base = apiBaseUrl.replaceFirst(RegExp(r'/api/?$'), '');
    _socket = io.io(
      base,
      io.OptionBuilder().setAuth({'token': token}).build(),
    );
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }

  void on(String event, void Function(dynamic) handler) => _socket?.on(event, handler);

  void off(String event, [void Function(dynamic)? handler]) => _socket?.off(event, handler);
}
