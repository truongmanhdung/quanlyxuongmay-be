# Nghiệp vụ hệ thống Quản lý Xưởng May

Tài liệu này đối chiếu sơ đồ tay bạn vẽ (2 mảng: "Vấn đề sản lượng hàng ngày" và "Sổ lô hàng hoàn thành") với những gì đã cài trong code, để bạn biết cái gì xong, cái gì còn thiếu.

Ký hiệu: ✅ Đã làm — ⚠️ Làm rồi nhưng chưa đầy đủ — ❌ Chưa làm — ❓ Chưa chắc đọc đúng ý bạn viết, cần bạn xác nhận lại.

---

## A. Danh mục gốc (nền cho mọi nghiệp vụ)

| Nghiệp vụ | Trạng thái | Ở đâu |
|---|---|---|
| Quản lý Khách hàng (mã, tên, sđt, ghi chú) | ✅ | [Customer.js](backend/src/models/Customer.js), trang [customers](free-nextjs-admin-dashboard-main/src/app/(admin)/customers), màn [customers_screen.dart](app/lib/screens/manager/customers_screen.dart) |
| Quản lý Mẫu hàng theo từng khách hàng (mã hàng, tên hàng, đơn vị tính) | ✅ | [Product.js](backend/src/models/Product.js) |
| Quản lý Công đoạn của từng mẫu hàng + đơn giá theo công đoạn (kèm lịch sử đổi giá) | ✅ | [ProcessStage.js](backend/src/models/ProcessStage.js) |
| Quản lý Công nhân, cấp **mã đăng nhập riêng** kiểu A012, A013... | ✅ | [Worker.js](backend/src/models/Worker.js), [workerController.js](backend/src/controllers/workerController.js) |

**Đối chiếu sơ đồ:** cụm "Khách hàng → chọn mã hàng, công đoạn → đơn: số lượng / đơn giá" chính là luồng Khách hàng → Mẫu hàng → Công đoạn (đơn giá) ở trên — đã làm đúng thứ tự này.

---

## B. Tài khoản đăng nhập (cụm "1 tài khoản đăng nhập # app chính / 1 đăng nhập xưởng may")

| Nghiệp vụ | Trạng thái | Ở đâu |
|---|---|---|
| Quản lý đăng nhập bằng **username/password** (tài khoản admin) | ✅ | [authController.js](backend/src/controllers/authController.js) `adminLogin` |
| Công nhân đăng nhập chỉ bằng **mã riêng** (A012...), không cần mật khẩu | ✅ | `workerLogin` trong file trên |
| 1 app Flutter dùng chung, tự nhận diện vai trò và điều hướng đúng giao diện (quản lý / công nhân) | ✅ | [login_screen.dart](app/lib/screens/auth/login_screen.dart), `manager_shell.dart` / `worker_shell.dart` |
| Đổi mật khẩu tài khoản quản lý | ✅ | `changePassword` (backend), trang [profile](free-nextjs-admin-dashboard-main/src/app/(admin)/(others-pages)/profile/page.tsx), [change_password_screen.dart](app/lib/screens/manager/change_password_screen.dart) |

---

## C. Chấm sản lượng hàng ngày (cụm "Vấn đề sản lượng hàng ngày")

| Nghiệp vụ | Trạng thái | Ở đâu |
|---|---|---|
| Công nhân chọn Khách hàng → Mẫu hàng → Công đoạn → nhập Số lô + Số lượng | ✅ | [submit_screen.dart](app/lib/screens/worker/submit_screen.dart) |
| Đơn giá tự lấy theo công đoạn đã cấu hình, tự tính thành tiền (số lượng × đơn giá) | ✅ | `reportController.js` `create()`: `amount = unitPrice * quantity` |
| Công nhân xem lại lịch sử đã gửi của chính mình | ✅ | [history_screen.dart](app/lib/screens/worker/history_screen.dart), API `GET /api/reports/mine` |
| Quản lý xem toàn bộ báo cáo sản lượng công nhân gửi lên, lọc theo công nhân/trạng thái | ✅ | Trang [notifications](free-nextjs-admin-dashboard-main/src/app/(admin)/notifications/page.tsx) (web), [notifications_screen.dart](app/lib/screens/manager/notifications_screen.dart) (app) |
| Quản lý **duyệt (xác nhận) / từ chối** từng báo cáo sản lượng | ✅ | `handleStatus()` trong trang notifications, API `PATCH /api/reports/:id/status` |
| **Nhắc công nhân gửi sản lượng** — tự động theo giờ cấu hình, có thể bật/tắt | ✅ | `ReminderSetting.js`, `reminderScheduler.js` (kiểm tra mỗi phút), cấu hình tại khối "Nhắc công nhân gửi sản lượng" trong trang [profile](free-nextjs-admin-dashboard-main/src/app/(admin)/(others-pages)/profile/page.tsx) |
| Quản lý **chủ động bấm nhắc ngay** (từ web hoặc app) cho công nhân chưa gửi hôm nay | ✅ | API `POST /api/notifications/remind`, nút "Nhắc ngay tất cả..." (web), nút "Nhắc nhân viên báo cáo" trong `manage_screen.dart` (app) |
| Công nhân nhận **thông báo trong app** (badge số chưa đọc + danh sách) | ✅ | `Notification.js`, tab "Thông báo" có badge trong `worker_shell.dart`, [worker_notifications_screen.dart](app/lib/screens/worker/worker_notifications_screen.dart) |
| Đẩy **push notification thật** ra màn hình khoá máy (Android, qua Firebase Cloud Messaging) | ⚠️ **Đã chuẩn bị sẵn code, chưa bật thật** | `Worker.fcmToken` + `utils/push.js` đã viết sẵn, hiện đang no-op vì chưa có project Firebase — bạn tự tạo Firebase project và gửi file service account key, tôi sẽ nối dây bật lên |

**Đã chốt với bạn:** chỉ dùng Android nên dùng Firebase Cloud Messaging (không cần lo phần iOS/Apple Developer Program) — bạn sẽ tự tạo project Firebase và gửi lại sau.

---

## D. Đơn hàng Nhập / Xuất

| Nghiệp vụ | Trạng thái | Ở đâu |
|---|---|---|
| Tạo phiếu Nhập hoặc Xuất cho 1 khách hàng, gồm nhiều dòng mẫu hàng + số lượng + đơn giá | ✅ | [Order.js](backend/src/models/Order.js), [OrderDetail.js](backend/src/models/OrderDetail.js), [orderController.js](backend/src/controllers/orderController.js) |
| Xem danh sách phiếu, lọc theo loại (nhập/xuất), khách hàng, khoảng ngày | ✅ | Trang [orders](free-nextjs-admin-dashboard-main/src/app/(admin)/orders/page.tsx) |
| Đối chiếu **tồn kho**: số lượng Xuất không được vượt số lượng Nhập còn lại của từng mẫu hàng | ❌ **Chưa có** | Nhập và Xuất hiện đang độc lập, không cộng trừ tồn kho theo mã hàng. |

**Ghi chú đọc sơ đồ:** cụm "xuất chọn tài khoản, khách → chọn mã hàng → đơn giá" khớp với luồng tạo phiếu Xuất hiện tại — phần này ✅. Nếu ý bạn trong sơ đồ chỉ dừng ở tạo phiếu (không cần đối chiếu tồn kho) thì mục tồn kho ở trên có thể bỏ qua, không phải thiếu.

---

## E. Tính lương / Sổ lô hàng hoàn thành

| Nghiệp vụ | Trạng thái | Ở đâu |
|---|---|---|
| Tổng số lượng + tổng lương theo **từng công nhân**, theo **tháng** (chỉ tính báo cáo đã duyệt) | ✅ | `payrollController.js` `summary()` |
| Tạm tính = sản lượng × đơn giá (đã chốt tại thời điểm gửi) | ✅ | Lưu sẵn trong `ProductionReport.amount`, cộng dồn ở `summary`/`detail` |
| Xem chi tiết từng báo cáo cấu thành lương của 1 công nhân trong kỳ | ✅ | `payrollController.js` `detail()`, trang [payroll](free-nextjs-admin-dashboard-main/src/app/(admin)/payroll/page.tsx) |
| **Xuất phiếu lương** (chốt số liệu 1 công nhân/1 tháng, không đổi dù báo cáo sau đó có sửa) | ✅ | `PayrollSlip.js`, API `POST /api/payroll/export` |
| Xuất phiếu lương ra **file PDF/Excel** để in phát công nhân | ✅ | API `GET /api/payroll/slips/:id/export?format=pdf|xlsx`, nút tải trên trang [payroll](free-nextjs-admin-dashboard-main/src/app/(admin)/payroll/page.tsx) (web); **chưa làm trên app** — quyết định thu hẹp phạm vi vì web đã đủ dùng để in |
| **Quản lý lô hàng riêng**: mã lô, mẫu hàng, khách hàng, số lượng kế hoạch, tiến độ | ✅ | `Batch.js`, `batchController.js`, trang [batches](free-nextjs-admin-dashboard-main/src/app/(admin)/batches/page.tsx) (web), [batches_screen.dart](app/lib/screens/manager/batches_screen.dart) (app) |
| **Bộ lọc trạng thái lô**: Đang làm / Chưa hoàn thành / Hoàn thành | ✅ | Select filter trên trang lô hàng (web + app) |
| Lô tự tính tiến độ theo số lượng đã báo cáo, nhưng **chỉ chuyển "Hoàn thành" khi quản lý duyệt tay** | ✅ | `PATCH /api/batches/:id/complete`, nút "Duyệt hoàn thành" hiện nổi bật khi đủ số lượng |
| **Báo cáo hàng hỏng / khách trả lại** (thống kê riêng, không tự trừ lương) | ✅ | `DefectReport.js`, `defectController.js`, trang [defects](free-nextjs-admin-dashboard-main/src/app/(admin)/defects/page.tsx) (web), [defects_screen.dart](app/lib/screens/manager/defects_screen.dart) (app) |

---

## Còn lại (đề xuất, chưa làm)

1. **Bật push notification thật qua Firebase** — chờ bạn tạo project Firebase (Android) và gửi file service account key + `google-services.json`, tôi sẽ nối `firebase-admin` (backend) và `firebase_messaging` (Flutter).
2. **Xuất phiếu lương PDF/Excel trên app Flutter** — hiện chỉ có trên web, có thể bổ sung sau nếu bạn cần in trực tiếp từ điện thoại.
3. (Tuỳ chọn, không chắc có trong sơ đồ) Đối chiếu tồn kho Nhập/Xuất theo mã hàng — hiện Nhập/Xuất đang độc lập, không cộng trừ tồn kho.

Mọi mục còn lại trong sơ đồ tay của bạn (chấm sản lượng, duyệt báo cáo, nhắc nhở, quản lý lô hàng, hàng lỗi/hoàn trả, tính lương, xuất phiếu lương) đã được cài đặt đầy đủ trên cả web admin và app.
