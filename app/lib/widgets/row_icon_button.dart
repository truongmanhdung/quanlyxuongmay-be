import 'package:flutter/material.dart';

/// Nut icon gon nhe dung trong cac dong danh sach (sua/xoa/xem them...), thay cho
/// IconButton mac dinh (vung cham 48x48 qua to, nhin nang ne khi dat nhieu nut canh nhau).
class RowIconButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback? onPressed;
  final double size;

  const RowIconButton({
    super.key,
    required this.icon,
    required this.color,
    required this.onPressed,
    this.size = 20,
  });

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: Icon(icon, size: size),
      color: color,
      onPressed: onPressed,
      visualDensity: VisualDensity.compact,
      padding: const EdgeInsets.all(6),
      constraints: const BoxConstraints(),
      splashRadius: size,
    );
  }
}
