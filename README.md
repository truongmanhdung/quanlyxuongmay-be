# Quản lý xưởng may BÌNH CANH mặc

Hệ thống gồm 3 phần, dùng chung một backend API:

| Phần | Thư mục | Công nghệ | Người dùng |
|---|---|---|---|
| Backend API | `backend/` | Node.js + Express + MongoDB Atlas | — |
| Web Admin | `free-nextjs-admin-dashboard-main/` | Next.js (TailAdmin template) | Quản lý |
| App di động | `app/` | Flutter | Quản lý + Công nhân |

## Kiến trúc dữ liệu

Khách hàng → Mẫu hàng (mã hàng) → Công đoạn (kèm đơn giá + lịch sử đổi giá) → Công nhân gửi **báo cáo sản lượng** theo lô hàng (chọn khách hàng → mẫu hàng → công đoạn → số lượng). Lương được tính động từ `sản lượng × đơn giá công đoạn`, có thể xuất thành phiếu lương chốt theo kỳ (tháng).

Ngoài ra có Đơn hàng nhập/xuất (không liên quan đến lương) để theo dõi hàng về/hàng ra.

## Chạy toàn bộ hệ thống (development)

### 1. Backend

```bash
cd backend
npm install
npm run seed   # tạo tài khoản admin mặc định + dữ liệu mẫu (chỉ cần chạy 1 lần)
npm run dev    # http://localhost:4000
```

Cấu hình kết nối MongoDB Atlas nằm trong `backend/.env` (không commit file này).

Tài khoản mặc định sau khi seed:
- Quản lý: `admin` / `admin123`
- Công nhân mẫu: mã `A012`, `A013`

### 2. Web Admin

```bash
cd free-nextjs-admin-dashboard-main
npm install
npm run dev    # http://localhost:3000
```

`NEXT_PUBLIC_API_URL` trong `.env.local` trỏ về `http://localhost:4000/api`.

### 3. App Flutter

```bash
cd app
flutter pub get
flutter run -d chrome          # chạy thử trên web
# hoặc
flutter run                    # chạy trên simulator/thiết bị đã kết nối
```

Nếu chạy trên Android emulator hoặc thiết bị thật, cần đổi `apiBaseUrl` trong [app/lib/core/config.dart](app/lib/core/config.dart) vì `localhost` chỉ hoạt động khi app và backend chạy chung máy (web/simulator):

```bash
flutter run --dart-define=API_BASE_URL=http://<ip-may-tinh>:4000/api
```

## Build bản phát hành app Flutter

```bash
cd app
flutter build apk --release      # Android
flutter build ipa --release      # iOS (cần Xcode + tài khoản Apple Developer)
```

App icon và splash screen được sinh từ `app/assets/icon/` (script `generate_icon.py`) bằng `flutter_launcher_icons` và `flutter_native_splash`. Nếu đổi icon, chỉnh `assets/icon/icon.png` / `icon_foreground.png` rồi chạy lại:

```bash
dart run flutter_launcher_icons
dart run flutter_native_splash:create
```

## Trước khi triển khai thật (production)

- Đổi `JWT_SECRET`, mật khẩu admin mặc định trong `backend/.env`
- Bật CORS chỉ cho đúng domain thật (hiện đang cho phép mọi `localhost:*` để tiện phát triển) — xem `backend/src/app.js`
- Host backend qua HTTPS; cập nhật `NEXT_PUBLIC_API_URL` (web) và `apiBaseUrl` (app) tương ứng
- App Flutter cần bật `usesCleartextTraffic`/network security phù hợp nếu vẫn dùng HTTP nội bộ, hoặc chuyển hẳn sang HTTPS
