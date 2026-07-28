import 'package:flutter/material.dart';
import '../core/theme.dart';

// Pill loc dung chung cho cac man danh sach (thay the ChoiceChip mac dinh
// tung bi copy-paste rai rac va khong dong bo mau/style).
class FilterPill extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const FilterPill({super.key, required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
          decoration: BoxDecoration(
            color: selected ? AppColors.brand500 : (isDark ? const Color(0xFF101828) : AppColors.gray100),
            borderRadius: BorderRadius.circular(999),
            border: selected ? null : Border.all(color: isDark ? const Color(0xFF1D2939) : AppColors.gray200),
            boxShadow: selected
                ? [BoxShadow(color: AppColors.brand500.withValues(alpha: isDark ? 0.35 : 0.28), blurRadius: 10, offset: const Offset(0, 4))]
                : null,
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: selected ? Colors.white : (isDark ? Colors.white70 : AppColors.gray700),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}
