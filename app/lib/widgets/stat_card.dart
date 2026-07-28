import 'package:flutter/material.dart';
import '../core/theme.dart';

class StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onTap;

  const StatCard({super.key, required this.icon, required this.label, required this.value, this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: isDark
                            ? [AppColors.brand500.withValues(alpha: 0.28), AppColors.brand500.withValues(alpha: 0.1)]
                            : [AppColors.brand500.withValues(alpha: 0.16), AppColors.brand500.withValues(alpha: 0.06)],
                      ),
                      borderRadius: BorderRadius.circular(11),
                    ),
                    child: Icon(icon, color: AppColors.brand500, size: 19),
                  ),
                  if (onTap != null)
                    Icon(Icons.chevron_right_rounded, size: 18, color: isDark ? AppColors.gray500 : AppColors.gray400),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                label,
                style: TextStyle(fontSize: 12, color: AppColors.gray500, height: 1.2),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white : AppColors.gray800,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
