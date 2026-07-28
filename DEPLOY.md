# Hướng dẫn deploy lên hosting thật

Áp dụng cho người **chưa có tài khoản** trên GitHub/Render/Vercel. Làm theo đúng thứ tự bên dưới.

Tổng quan sau khi xong:
- **Backend** (Node.js + MongoDB Atlas) chạy trên **Render** → có 1 URL dạng `https://quanlyxuongmay-backend.onrender.com`
- **Web Admin** (Next.js) chạy trên **Vercel** → có 1 URL dạng `https://xuongmay-admin.vercel.app`
- **App Flutter** build ra APK/IPA trỏ về URL backend ở trên

---

## Bước 0 — Đẩy code lên GitHub

1. Vào https://github.com → đăng ký tài khoản nếu chưa có → **New repository** (đặt tên VD `quanlyxuongmay`, để **Private**, không tick "Add README").
2. GitHub sẽ hiện sẵn 2 dòng lệnh, chạy trong thư mục `/Volumes/dungtm/mac/quanlyxuongmay`:

```bash
git remote add origin https://github.com/<ten-user-cua-ban>/quanlyxuongmay.git
git branch -M main
git push -u origin main
```

Repo đã init sẵn và có commit đầu tiên rồi — chỉ cần add remote rồi push. GitHub sẽ hỏi đăng nhập (dùng trình duyệt hoặc Personal Access Token).

> Repo để **Private** vì `backend/.env` tuy đã bị `.gitignore` không commit, nhưng để private vẫn an toàn hơn cho một dự án nội bộ như thế này.

---

## Bước 1 — Cho phép Render kết nối MongoDB Atlas

Render dùng địa chỉ IP động nên cần mở Atlas cho mọi IP:

1. Đăng nhập https://cloud.mongodb.com → chọn cluster `xuongquanly`
2. Vào **Network Access** (menu bên trái) → **Add IP Address** → chọn **Allow Access from Anywhere** (`0.0.0.0/0`) → Confirm

Dữ liệu đã có sẵn từ lúc test ở máy bạn (khách hàng mẫu, công nhân A012/A013, admin) nên **không cần seed lại**.

---

## Bước 2 — Deploy Backend lên Render

1. Vào https://render.com → **Get Started** → đăng ký (nên dùng "Sign up with GitHub" để tự liên kết luôn)
2. Sau khi đăng nhập: **New +** → **Web Service**
3. Chọn **Build and deploy from a Git repository** → Connect tài khoản GitHub → chọn repo `quanlyxuongmay`
4. Render sẽ đọc thấy file `render.yaml` ở gốc repo và tự điền cấu hình (root directory `backend`, build `npm install`, start `npm start`). Nếu nó không tự nhận, điền tay:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Ở phần **Environment Variables**, thêm các key sau (giá trị `MONGODB_URI` lấy từ file `backend/.env` trên máy bạn — file này không nằm trong git nên phải copy tay, không có sẵn trên GitHub):
   | Key | Value |
   |---|---|
   | `MONGODB_URI` | copy nguyên dòng `MONGODB_URI=...` trong `backend/.env` (bỏ phần `MONGODB_URI=`) |
   | `JWT_SECRET` | đổi thành một chuỗi bí mật khác, dài, ngẫu nhiên (đừng giữ giá trị mặc định trong `.env`) |
   | `JWT_EXPIRES_IN` | `30d` |
   | `SEED_ADMIN_USERNAME` | `admin` |
   | `SEED_ADMIN_PASSWORD` | (không dùng vì đã có admin, có thể bỏ qua) |
   | `CORS_ORIGIN` | để trống trước, quay lại điền ở Bước 4 |
6. **Create Web Service** → đợi build xong (~2-3 phút) → Render cho bạn 1 URL, ví dụ `https://quanlyxuongmay-backend.onrender.com`
7. Kiểm tra: mở `https://<url-render-cua-ban>/api/health` trên trình duyệt, phải thấy `{"status":"ok",...}`

> Gói Free của Render sẽ "ngủ" sau ~15 phút không có request và mất khoảng 30-60s để tỉnh lại ở lượt gọi đầu tiên — bình thường, không phải lỗi.

---

## Bước 3 — Deploy Web Admin lên Vercel

1. Vào https://vercel.com → **Sign Up** (nên chọn "Continue with GitHub")
2. **Add New** → **Project** → chọn repo `quanlyxuongmay` → **Import**
3. Ở màn hình cấu hình:
   - **Root Directory**: bấm Edit, chọn `free-nextjs-admin-dashboard-main`
   - Framework Preset: Vercel tự nhận **Next.js**
4. Mở rộng **Environment Variables**, thêm:
   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://<url-render-cua-ban>/api` (dùng URL thật ở Bước 2) |
5. **Deploy** → đợi ~1-2 phút → Vercel cho URL dạng `https://quanlyxuongmay.vercel.app`
6. Mở URL đó, thử đăng nhập `admin` / mật khẩu hiện tại.

---

## Bước 4 — Khoá CORS về đúng domain Vercel

Quay lại Render → service backend → **Environment** → sửa biến `CORS_ORIGIN` thành đúng domain Vercel vừa có, ví dụ:

```
CORS_ORIGIN=https://quanlyxuongmay.vercel.app
```

(Nhiều domain thì phân tách bằng dấu phẩy). Lưu lại → Render tự deploy lại. Mọi origin dạng `localhost:*` vẫn luôn được phép để bạn tiếp tục phát triển ở máy local.

---

## Bước 5 — Trỏ app Flutter về backend thật

Khi build bản release để cài lên điện thoại thật:

```bash
cd app
flutter build apk --release --dart-define=API_BASE_URL=https://<url-render-cua-ban>/api
```

Muốn khỏi phải gõ `--dart-define` mỗi lần, có thể sửa thẳng giá trị mặc định trong [app/lib/core/config.dart](app/lib/core/config.dart).

---

## Sau khi deploy xong — việc nên làm

- Đổi mật khẩu admin mặc định ngay (mục "Đổi mật khẩu" trong web admin hoặc app) nếu bạn chưa đổi
- Đổi `JWT_SECRET` trên Render sang giá trị ngẫu nhiên riêng, khác với giá trị dùng ở máy local
- Cân nhắc nâng cấp gói Render trả phí nếu không muốn backend bị "ngủ" khi không có ai dùng
