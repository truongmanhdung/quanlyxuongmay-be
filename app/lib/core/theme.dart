import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// Bang mau dong bo voi web admin (TailAdmin brand color #465FFF)
class AppColors {
  static const brand50 = Color(0xFFECF3FF);
  static const brand100 = Color(0xFFDDE9FF);
  static const brand300 = Color(0xFF9CB9FF);
  static const brand500 = Color(0xFF465FFF);
  static const brand600 = Color(0xFF3641F5);
  static const brand700 = Color(0xFF2A31D8);

  static const success500 = Color(0xFF12B76A);
  static const warning500 = Color(0xFFF79009);
  static const error500 = Color(0xFFF04438);

  static const gray50 = Color(0xFFF9FAFB);
  static const gray100 = Color(0xFFF2F4F7);
  static const gray200 = Color(0xFFE4E7EC);
  static const gray400 = Color(0xFF98A2B3);
  static const gray500 = Color(0xFF667085);
  static const gray700 = Color(0xFF344054);
  static const gray800 = Color(0xFF1D2939);
  static const gray900 = Color(0xFF101828);
}

// Shadow mem dung chung cho card/nut/input, thay cho vien phang truoc day
class AppShadows {
  static List<BoxShadow> card({bool isDark = false}) => [
        BoxShadow(
          color: isDark ? Colors.black.withValues(alpha: 0.28) : AppColors.gray900.withValues(alpha: 0.06),
          blurRadius: 20,
          offset: const Offset(0, 8),
        ),
      ];

  static List<BoxShadow> button({bool isDark = false}) => [
        BoxShadow(
          color: AppColors.brand500.withValues(alpha: isDark ? 0.35 : 0.28),
          blurRadius: 16,
          offset: const Offset(0, 6),
        ),
      ];
}

ThemeData buildAppTheme({required Brightness brightness}) {
  final isDark = brightness == Brightness.dark;
  final base = isDark ? ThemeData.dark() : ThemeData.light();
  final textTheme = GoogleFonts.outfitTextTheme(base.textTheme);

  final scheme = ColorScheme(
    brightness: brightness,
    primary: AppColors.brand500,
    onPrimary: Colors.white,
    secondary: AppColors.brand300,
    onSecondary: Colors.white,
    error: AppColors.error500,
    onError: Colors.white,
    surface: isDark ? const Color(0xFF101828) : Colors.white,
    onSurface: isDark ? Colors.white : AppColors.gray900,
  );

  return base.copyWith(
    colorScheme: scheme,
    scaffoldBackgroundColor: isDark ? const Color(0xFF0B1220) : AppColors.gray50,
    textTheme: textTheme,
    appBarTheme: AppBarTheme(
      backgroundColor: isDark ? const Color(0xFF101828) : Colors.white,
      foregroundColor: isDark ? Colors.white : AppColors.gray800,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: GoogleFonts.outfit(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: isDark ? Colors.white : AppColors.gray800,
      ),
    ),
    cardTheme: CardThemeData(
      color: isDark ? const Color(0xFF101828) : Colors.white,
      elevation: isDark ? 0 : 6,
      shadowColor: AppColors.gray900.withValues(alpha: 0.16),
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: isDark ? const BorderSide(color: Color(0xFF1D2939)) : BorderSide.none,
      ),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: isDark ? const Color(0xFF101828) : Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: isDark ? const Color(0xFF1D2939) : AppColors.gray200),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: isDark ? const Color(0xFF1D2939) : AppColors.gray200),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.brand500, width: 1.5),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.brand500,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 15),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w600),
        elevation: 6,
        shadowColor: AppColors.brand500.withValues(alpha: 0.4),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: isDark ? Colors.white : AppColors.gray700,
        side: BorderSide(color: isDark ? const Color(0xFF1D2939) : AppColors.gray200),
        padding: const EdgeInsets.symmetric(vertical: 15),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: isDark ? const Color(0xFF101828) : Colors.white,
      selectedItemColor: AppColors.brand500,
      unselectedItemColor: AppColors.gray400,
      showUnselectedLabels: true,
      type: BottomNavigationBarType.fixed,
    ),
    dividerColor: isDark ? const Color(0xFF1D2939) : AppColors.gray200,
  );
}
