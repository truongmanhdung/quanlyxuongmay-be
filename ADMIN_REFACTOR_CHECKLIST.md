# Checklist nâng cấp trang Admin (antd/dayjs, dashboard, lương, hàng lỗi, tồn kho)

Xem kế hoạch đầy đủ trong phiên làm việc Claude Code (plan mode). File này để theo dõi tiến độ, có thể
tiếp tục bằng Cursor nếu cần — mỗi mục ghi rõ file đã/sẽ sửa.

## Phase 1 — Nền tảng antd + dayjs, đổi thương hiệu ✅
- [x] Cài `antd` 6.5.2, `dayjs`, `@ant-design/nextjs-registry` (antd 6 hỗ trợ sẵn React 19, không cần patch) — `free-nextjs-admin-dashboard-main/package.json`
- [x] Bọc `AntdRegistry` + `ConfigProvider` (locale vi_VN, colorPrimary #465fff, đổi theo dark mode qua `useTheme`), thêm `metadata` title "Quản lý xưởng may BÌNH CANH" — `src/app/layout.tsx`, `src/components/providers/AntdThemeProvider.tsx` (mới)
- [x] Viết lại `Select.tsx` dùng antd Select, giữ nguyên props cũ (options/placeholder/onChange/className/defaultValue) — `src/components/form/Select.tsx`
- [x] Thêm chữ "Quản lý xưởng may BÌNH CANH" vào sidebar (giữ icon logo, bỏ ảnh chữ TailAdmin) — `src/layout/AppSidebar.tsx`
- [x] Đổi `package.json` name → `quanlyxuongmay-admin`; `npm run build` pass

## Phase 2 — Box thống kê bấm được + chỉ số công nhân đang hoạt động ✅
- [x] Đổi tên field `totalWorkerCount`/`activeWorkerCount` (active = có báo cáo sản lượng trong kỳ) — `backend/src/controllers/dashboardController.js`
- [x] Cập nhật type `DashboardOverview` — `src/lib/types.ts`
- [x] Thêm prop `href`/`caption` cho StatCard (Link + hover) — `src/components/dashboard/StatCard.tsx`
- [x] Gắn href (payroll/batches/workers) + đổi hiển thị số công nhân hoạt động — `src/app/(admin)/page.tsx`
- [x] Đọc filter/period ban đầu từ URL (`useSearchParams`) — `src/app/(admin)/batches/page.tsx`, `src/app/(admin)/payroll/page.tsx`
- [x] `npm run build` pass

## Phase 3 — Sửa lỗi font PDF phiếu lương ✅
- [x] Thêm font "Be Vietnam Pro" Regular/Bold (static TTF, thiết kế riêng cho dấu tiếng Việt, OFL) — `backend/src/assets/fonts/BeVietnamPro-Regular.ttf`, `BeVietnamPro-Bold.ttf`
- [x] `registerFont("VN"/"VN-Bold")` + thay mọi `.font("Helvetica"...)`, re-set font sau `addPage()` — `backend/src/controllers/payrollController.js`
- [x] Test tạo PDF mẫu bằng node script, xác nhận dấu tiếng Việt (Phiếu Lương, Nguyễn Thị Lan...) hiển thị đúng

## Phase 4 — Bảng tính lương antd Table + DatePicker tháng ✅
- [x] DatePicker tháng MM/YYYY (dayjs) thay input month — `src/app/(admin)/payroll/page.tsx`
- [x] antd Table expandable theo công nhân, lazy-load chi tiết công đoạn/mẫu hàng khi mở rộng dòng, bỏ modal chi tiết cũ — `src/app/(admin)/payroll/page.tsx`
- [x] `npm run build` pass

## Phase 5 — Hàng lỗi: công đoạn + công nhân, so sánh sản lượng ✅
- [x] Thêm field `processStage`/`worker` optional — `backend/src/models/DefectReport.js`
- [x] Populate + nhận field mới ở create/update — `backend/src/controllers/defectController.js`
- [x] Endpoint `GET /defects/workers-for-stage`, `GET /defects/comparison` — `backend/src/controllers/defectController.js`, `backend/src/routes/defectRoutes.js`
- [x] Type + resource wrapper (`DefectComparison`, `workersForStage`, `comparison`) — `src/lib/types.ts`, `src/lib/resources/defects.ts`
- [x] Form cascading Mẫu hàng→Công đoạn→Công nhân (đều optional) + tab "So sánh sản lượng" (antd Tabs/Table, gộp theo công đoạn) — `src/app/(admin)/defects/page.tsx`
- [x] `npm run build` pass

## Phase 6 — Đối chiếu tồn kho Nhập/Xuất ✅
- [x] Hàm `stockFor(customer, product)` + chặn Xuất vượt tồn ở `create`/`addDetail`/`updateDetail` — `backend/src/controllers/orderController.js`
- [x] Endpoint `GET /orders/stock` (1 mã hàng) và `GET /orders/stock-summary` (theo khách hàng) — `backend/src/routes/orderRoutes.js` (đặt trước `/:id` để tránh xung đột route)
- [x] Type (`StockInfo`, `StockSummary`) + resource wrapper — `src/lib/types.ts`, `src/lib/resources/orders.ts`
- [x] Tab "Tồn kho" (antd Table theo khách hàng) + hiển thị "Tồn kho khả dụng" và chặn client-side khi tạo đơn Xuất vượt tồn — `src/app/(admin)/orders/page.tsx`
- [x] `npm run build` pass

## Phase 7 — So sánh lương kê khai vs lương thực nhận ước tính (ngay trong Tính lương) ✅
- [x] `defectAdjustmentByWorker()` gộp theo (công nhân, mẫu hàng, công đoạn), thêm `defectQuantity`/`estimatedNetAmount` vào từng dòng `summary()` — `backend/src/controllers/payrollController.js`
- [x] Endpoint `GET /payroll/defect-comparison?worker=&period=` — chi tiết theo từng mẫu hàng+công đoạn của 1 công nhân, kèm tổng — `backend/src/controllers/payrollController.js`, `backend/src/routes/payrollRoutes.js`
- [x] Type (`PayrollDefectComparison*`) + resource wrapper — `src/lib/types.ts`, `src/lib/resources/payroll.ts`
- [x] 2 cột mới trên bảng chính: "Lỗi / Hoàn trả" và "Lương thực nhận (ước tính)" — `src/app/(admin)/payroll/page.tsx`
- [x] Khi mở rộng 1 công nhân: thêm bảng "So sánh với hàng lỗi/hoàn trả" theo từng mẫu hàng+công đoạn, có dòng Tổng — `src/app/(admin)/payroll/page.tsx`
- [x] Đây chỉ là **ước tính hiển thị**, không đổi `totalAmount` chính thức dùng để xuất phiếu lương/PDF/Excel (giữ đúng quyết định đã thống nhất: không tự trừ lương)
- [x] Test qua trình duyệt trên dữ liệu thật: 50 SP × 3.000đ = 150.000đ kê khai, trừ 10 lỗi × 3.000đ = 30.000đ → 120.000đ ước tính — khớp đúng cả ở bảng chính lẫn bảng chi tiết
- [x] `npm run build` pass

## Kiểm thử ✅
- [x] `npm run build` frontend pass sau mỗi phase (type-check toàn bộ)
- [x] Test qua trình duyệt (Playwright) trên dữ liệu Atlas thật, có dọn sạch bản ghi test sau: dashboard (stat card click, "Công nhân đang hoạt động: 1 / 2 công nhân"), payroll (DatePicker MM/YYYY, expand xem chi tiết công đoạn), defects (cascading Mẫu hàng→Công đoạn→Công nhân, tab So sánh sản lượng ra đúng số liệu Kê khai/Lỗi/Chênh lệch), orders (tab Tồn kho, chặn Xuất vượt tồn qua API: Xuất 20/tồn 10 → 400, Xuất 5 → OK, tồn còn 5) — cả light lẫn dark mode
- [x] **Phát hiện & sửa 1 lỗi khi test**: dropdown antd (Select/DatePicker) bị che khuất sau lớp nền Modal tự viết của project (z-99999) — sửa bằng `zIndexPopupBase: 100000` trong `AntdThemeProvider.tsx`
- [x] Test PDF phiếu lương thật (đúng file A012 - Nguyễn Thị Lan mà bạn gửi lúc đầu) — dấu tiếng Việt hiển thị đúng hoàn toàn
