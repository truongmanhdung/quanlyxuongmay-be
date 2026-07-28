import 'package:flutter/material.dart';

// Badge tron mau dung chung cho trang thai/loai (lo hang, phieu nhap-xuat,
// hang loi...) - thay the cac Container/BoxDecoration copy-paste rai rac.
class PillBadge extends StatelessWidget {
  final String label;
  final Color color;
  const PillBadge({super.key, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12)),
    );
  }
}
