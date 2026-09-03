# Hạ tầng triển khai hiện tại

Ghi lại toàn bộ cấu hình thật đang chạy, để lần sau nhờ triển khai/sửa gì thì làm được luôn, không phải dò lại từ đầu.

**Tổng quan:**
- **Backend** (Node.js + Express + Socket.IO) chạy trên 1 VM **Google Cloud Compute Engine** (Always Free), lộ ra internet qua **Cloudflare Tunnel** (HTTPS miễn phí, không mở port nào trên VM) → `https://api.xuongmaybinhcanh.io.vn/api`
- **Database**: MongoDB Atlas (không đổi)
- **Web Admin** (Next.js) vẫn chạy trên **Vercel** free/Hobby — xem lưu ý rủi ro ở cuối file
- **App Flutter** build APK, phân phối thủ công qua Google Drive (không lên Play Store)
- **Domain**: `xuongmaybinhcanh.io.vn`, đăng ký ở P.A Vietnam, DNS quản lý qua Cloudflare
- **Render** (backend cũ): còn tồn tại nhưng đã ngừng dùng, dữ liệu env cũ ở đó có thể tham khảo khi cần rồi xoá

---

## 1. Backend — Google Cloud Compute Engine

| Mục | Giá trị |
|---|---|
| Project | Google Cloud project chứa VM này (kiểm tra trong Console nếu quên tên) |
| VM name | `quanlyxuongmay-be` |
| Region | `us-central1` (Iowa) — bắt buộc để nằm trong Always Free (chỉ `us-west1`/`us-central1`/`us-east1` mới free) |
| Machine type | `e2-micro` (1 vCPU dùng chung, 1GB RAM) — đúng shape Always Free |
| OS | Ubuntu 22.04 LTS |
| SSH | Mở qua nút **SSH** trong [Compute Engine → VM instances](https://console.cloud.google.com/compute/instances) — không cần key riêng |
| Swap | Đã thêm 2GB swap file (`/swapfile`) vì VM chỉ có 1GB RAM |
| Code | Clone qua GitHub fine-grained PAT tại `~/quanlyxuongmay` (repo private) |
| Process manager | PM2, tên process `quanlyxuongmay-be`, chạy `backend/src/server.js` trên port `4000` |

**Giới hạn Always Free cần nhớ** (khác Oracle — Google tự tính phí thật nếu vượt):
- Băng thông ra internet: **1GB/tháng free**. Vượt mức → tính phí thật vào thẻ. Theo dõi tại [Billing → Reports](https://console.cloud.google.com/billing/reports).
- IP external mặc định là **ephemeral** (đổi nếu Stop/Start VM). Nếu cần cố định: *VPC network → IP addresses → Reserve External Static IP* rồi gán cho VM — lưu ý IP tĩnh **không gắn VM nào thì bị tính phí theo giờ**.

### Deploy code cập nhật (sau này)

SSH vào VM rồi chạy:

```bash
cd ~/quanlyxuongmay && git pull
cd backend && npm install --omit=dev
pm2 restart quanlyxuongmay-be
```

Kiểm tra log:
```bash
pm2 logs quanlyxuongmay-be
```
Phải thấy `[db] connected -> quanlyxuongmay` và `[server] listening on http://localhost:4000`.

### File `.env` trên VM

Nằm ở `~/quanlyxuongmay/backend/.env` (không có trong git, phải tạo tay). Các key giống hệt bản Render cũ:

```
PORT=4000
MONGODB_URI=...
JWT_SECRET=...
JWT_EXPIRES_IN=...
SEED_ADMIN_USERNAME=...
SEED_ADMIN_PASSWORD=...
CORS_ORIGIN=https://<domain-admin-vercel>,https://api.xuongmaybinhcanh.io.vn
FIREBASE_SERVICE_ACCOUNT_JSON=...
```

Giá trị thật lấy từ Render dashboard (Environment tab) hoặc `backend/.env` cũ trên máy local.

---

## 2. Cloudflare Tunnel — HTTPS cho backend

| Mục | Giá trị |
|---|---|
| Tunnel name | `quanlyxuongmay-be` |
| Tunnel ID | `563e5772-d44e-40ab-85d4-50862d796dc1` |
| Hostname public | `api.xuongmaybinhcanh.io.vn` → `http://localhost:4000` |
| File cấu hình (trên VM, dùng bởi service) | `/etc/cloudflared/config.yml` |
| Credentials file | `/etc/cloudflared/563e5772-d44e-40ab-85d4-50862d796dc1.json` |
| Origin cert | `/etc/cloudflared/cert.pem` |
| Quản lý qua web | [Cloudflare Zero Trust – Tunnels](https://one.dash.cloudflare.com/) |

**Quan trọng**: mọi lệnh `cloudflared` (login, create, route dns) phải chạy **trên VM**, không phải trên máy cá nhân — chỉ riêng cái link xác thực (`cloudflared tunnel login` in ra) mới mở trên trình duyệt máy cá nhân.

**`sudo cloudflared service install` chạy bằng quyền root**, nên root tìm config ở `/etc/cloudflared/`, không phải `~/.cloudflared/` của user thường — 3 file (`config.yml`, `<TUNNEL_ID>.json`, `cert.pem`) phải được `sudo cp` vào `/etc/cloudflared/` trước khi cài service, và `credentials-file` trong `config.yml` phải trỏ đúng đường dẫn `/etc/cloudflared/...`.

**Bẫy hay gặp**: copy nội dung file JSON/PEM từ máy Mac (zsh) qua lệnh `cat` dễ dính thêm ký tự `%` ở cuối (dấu hiệu "không có newline cuối dòng" của zsh, không phải nội dung thật) — làm hỏng JSON. Nếu `journalctl -u cloudflared` báo `Invalid JSON when parsing tunnel credentials file`, kiểm tra lại file có dư ký tự `%` không.

### Quản lý service

```bash
sudo systemctl status cloudflared      # xem trạng thái
sudo systemctl restart cloudflared     # khởi động lại
sudo journalctl -u cloudflared -n 50 --no-pager   # xem log lỗi
```

Kiểm tra hoạt động: `curl https://api.xuongmaybinhcanh.io.vn/api/health` phải trả `{"status":"ok",...}`.

---

## 3. Domain & DNS

- Domain `xuongmaybinhcanh.io.vn` đăng ký tại **P.A Vietnam**.
- Nameserver đã đổi sang Cloudflare (2 nameserver dạng `xxx.ns.cloudflare.com`), domain ở trạng thái Active trên Cloudflare.
- Không cần sửa DNS record tay — Cloudflare Tunnel tự tạo/quản lý CNAME cho `api.xuongmaybinhcanh.io.vn`.
- Muốn đổi nameserver hay thêm record khác: đăng nhập tài khoản P.A Vietnam (đổi nameserver) hoặc [Cloudflare dashboard](https://dash.cloudflare.com/) (đổi DNS record).

---

## 4. MongoDB Atlas

- Cluster tên `xuongquanly` (hoặc tên hiện tại — kiểm tra trong Atlas nếu đổi).
- **Network Access** phải có IP external của VM Google Cloud trong danh sách cho phép, nếu không `connectDB()` sẽ treo khi backend khởi động.
- [Mở MongoDB Atlas](https://cloud.mongodb.com/) → Network Access → Add IP Address.
- Nếu IP VM là ephemeral và bị đổi (sau khi Stop/Start VM), phải cập nhật lại IP này trong Atlas — nên cân nhắc đặt IP tĩnh (xem mục 1) để khỏi phải làm lại.

---

## 5. Web Admin — Vercel

- Vẫn deploy tự động từ GitHub như cũ, root directory là thư mục `admin/`.
- Biến môi trường `NEXT_PUBLIC_API_URL` phải trỏ tới `https://api.xuongmaybinhcanh.io.vn/api` (Project Settings → Environment Variables → Redeploy sau khi sửa).
- **Đang dùng gói Hobby (free)** — theo tài liệu chính thức của Vercel, gói này *"restricts users to non-commercial, personal use only"*. Admin panel này phục vụ vận hành kinh doanh thật (không phải dự án cá nhân), nên về nguyên tắc là ngoài phạm vi cho phép của gói free. Rủi ro: Vercel có thể tạm ngưng deployment bất kỳ lúc nào không báo trước. Đã quyết định chấp nhận rủi ro này vì traffic rất thấp (1 người dùng/ngày).
- **Phương án dự phòng nếu Vercel tạm ngưng**: tự host Next.js admin trên chính VM Google Cloud đang chạy backend — thêm 1 subdomain Cloudflare Tunnel nữa (vd `admin.xuongmaybinhcanh.io.vn`) trỏ vào `next start` chạy qua PM2. Chưa làm, chỉ là phương án dự trù.
- Nâng cấp lên Pro (20 USD/tháng/seat) là cách xử lý dứt điểm nếu muốn tránh rủi ro hoàn toàn.

---

## 6. App Flutter

- Cấu hình URL backend mặc định tại [app/lib/core/config.dart](app/lib/core/config.dart) — hiện là `https://api.xuongmaybinhcanh.io.vn/api`.
- Build bản release:
  ```bash
  cd app
  flutter build apk --release
  ```
  File universal APK (chạy mọi kiến trúc máy) nằm ở `app/build/app/outputs/flutter-apk/app-release.apk`.
- **Phân phối**: không lên Play Store, upload thủ công lên Google Drive qua `rclone` (remote đã cấu hình sẵn tên `gdrive` trên máy local):
  ```bash
  rclone copy "app/build/app/outputs/flutter-apk/app-release.apk" gdrive: --drive-root-folder-id <FOLDER_ID>
  ```
  Thư mục phân phối hiện tại: `https://drive.google.com/drive/folders/17EmRcotqsGMlbLkMp5DRWL0nMZwIG7er`

---

## 7. GitHub

- Repo private, clone trên VM bằng **fine-grained Personal Access Token** (Contents: Read-only, chỉ scope đúng repo `quanlyxuongmay`) — tạo tại [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new).
- Token không lưu ở đâu trong repo — nếu VM cần clone lại từ đầu, tạo token mới.

---

## 8. Render (hạ tầng cũ — chưa dọn)

- Service backend cũ vẫn còn tồn tại trên Render, đã ngừng dùng làm nguồn thật (bị chặn do hết giới hạn free tier, là lý do migrate sang Google Cloud).
- Còn giữ lại tạm để tham khảo giá trị `.env` cũ khi cần — sau khi xác nhận Google Cloud ổn định lâu dài, nên vào [Render Dashboard](https://dashboard.render.com/) xoá hoặc suspend hẳn.

---

## Runbook chi tiết từng bước

Hướng dẫn setup từ đầu (nếu cần dựng lại VM mới hoặc làm lại từ số 0) đã publish thành artifact riêng, xem lại tại: `https://claude.ai/code/artifact/ac4c8d72-d579-4cf8-872c-cf2dcc43b4b9`
