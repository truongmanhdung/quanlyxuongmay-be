import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../services/auth_service.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  bool obscure = true;
  bool saving = false;
  String? error;
  String? success;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      error = null;
      success = null;
    });

    if (_newCtrl.text.length < 6) {
      setState(() => error = 'Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (_newCtrl.text != _confirmCtrl.text) {
      setState(() => error = 'Xác nhận mật khẩu mới không khớp');
      return;
    }

    setState(() => saving = true);
    final api = context.read<ApiClient>();
    try {
      await AuthService(api).changePassword(currentPassword: _currentCtrl.text, newPassword: _newCtrl.text);
      if (!mounted) return;
      setState(() {
        success = 'Đổi mật khẩu thành công';
        _currentCtrl.clear();
        _newCtrl.clear();
        _confirmCtrl.clear();
      });
    } on ApiException catch (e) {
      setState(() => error = e.message);
    } catch (e) {
      setState(() => error = 'Đổi mật khẩu thất bại');
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Widget _obscureToggle() {
    return IconButton(
      icon: Icon(obscure ? Iconsax.eye_slash : Iconsax.eye, color: AppColors.gray400, size: 20),
      onPressed: () => setState(() => obscure = !obscure),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Đổi mật khẩu')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (error != null)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.error500.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(error!, style: const TextStyle(color: AppColors.error500)),
            ),
          if (success != null)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.success500.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(success!, style: const TextStyle(color: AppColors.success500)),
            ),
          TextField(
            controller: _currentCtrl,
            obscureText: obscure,
            decoration: InputDecoration(labelText: 'Mật khẩu hiện tại', suffixIcon: _obscureToggle()),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _newCtrl,
            obscureText: obscure,
            decoration: InputDecoration(labelText: 'Mật khẩu mới', helperText: 'Tối thiểu 6 ký tự', suffixIcon: _obscureToggle()),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _confirmCtrl,
            obscureText: obscure,
            decoration: InputDecoration(labelText: 'Xác nhận mật khẩu mới', suffixIcon: _obscureToggle()),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: saving ? null : _submit,
            child: saving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Đổi mật khẩu'),
          ),
        ],
      ),
    );
  }
}
