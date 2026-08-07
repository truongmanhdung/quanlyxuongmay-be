import 'package:intl/intl.dart';

final _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ', decimalDigits: 0);
final _numberFormat = NumberFormat.decimalPattern('vi_VN');
final _dateFormat = DateFormat('dd/MM/yyyy');
final _dateTimeFormat = DateFormat('dd/MM/yyyy HH:mm');
final _timeFormat = DateFormat('HH:mm');

String formatCurrency(num value) => _currencyFormat.format(value);
String formatNumber(num value) => _numberFormat.format(value);
String formatDate(DateTime value) => _dateFormat.format(value.toLocal());
String formatDateTime(DateTime value) => _dateTimeFormat.format(value.toLocal());
String formatTime(DateTime value) => _timeFormat.format(value.toLocal());
