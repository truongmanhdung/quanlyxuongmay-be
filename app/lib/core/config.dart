// Doi gia tri nay cho phu hop moi trong khi chay:
// - Chrome / macOS / iOS simulator (cung may voi backend): http://localhost:4000/api
// - Android emulator: http://10.0.2.2:4000/api
// - Thiet bi that trong cung mang LAN: http://<ip-may-tinh>:4000/api
// - Backend that tren Google Cloud (dung de test tren dien thoai qua mang bat ky)
// Doi hoac ghi de bang: flutter run --dart-define=API_BASE_URL=<url>
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://api.xuongmaybinhcanh.io.vn/api',
);
