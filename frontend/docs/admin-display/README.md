# Admin — chữ lớn, màu rõ và bố cục gọn

Kiểm tra ngày **01/11/2026**, múi giờ Asia/Ho_Chi_Minh. Phạm vi source: `frontend/src/admin/` và `frontend/src/styles/admin-redesign.css`. Không thêm dependency.

## Những phần đã sửa

- Dùng sans-serif Manrope/Be Vietnam Pro hiện có. Tiêu đề trang 34px (mobile 30px), section 22–24px, card 20–22px, nội dung/form 16px, menu và bảng 15px, nội dung phụ 14px, badge 13px, KPI 36–38px. Line-height chính 1.5–1.6; không dùng zoom hoặc transform để phóng toàn trang.
- Sidebar navy `#102A52`, primary `#2563EB`, cyan `#0891B2`, accent tím `#7C3AED`, workspace `#EAF1FA`, chữ navy `#16324F`. Nền màu được dùng cho header, card dịch vụ, nhóm nguồn, KPI, tab và header bảng. Trạng thái success/warning/error có màu riêng, kèm nhãn chữ, giữ dữ liệu từ API.
- Trang Cài đặt có tiêu đề **Cài đặt hệ thống**, mô tả đúng yêu cầu, header gradient vừa phải; ba card PostgreSQL/Redis/Thanh toán có icon 48px, mô tả và badge dễ đọc.
- Nguồn dữ liệu có header riêng, thông tin nhà cung cấp, ba nhóm xanh/cyan/tím, hàng thời điểm rõ ràng, nút ở vị trí nhất quán. Giữ nguyên điều kiện disabled khi chưa cấu hình, đang chạy, cooldown hoặc một yêu cầu khác đang xử lý; bổ sung lý do và liên kết `aria-describedby`.
- Đổi tiêu đề các trang Admin sang tên chức năng: Tổng quan quản trị, Quản lý chuyến bay/đơn đặt vé/khách hàng/hãng hàng không/sân bay, Phân tích giá vé, Doanh thu & báo cáo, Nhật ký thao tác, Kiểm duyệt đánh giá.
- Đồng bộ KPI, bảng, form, modal, toast, badge và theme sáng/tối. Bỏ chiều cao cố định của card và khoảng đệm mô tả không cần thiết; dùng khoảng cách 20–24px. Bảng cuộn bên trong, form/input cao 48px, tăng chỗ dành cho nhãn/tooltip biểu đồ. Chuyển động trình bày khoảng 180–230ms, hỗ trợ reduced motion.

## Kiểm tra đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run build --prefix frontend` | Đạt |
| `npm run type-check --prefix frontend` | Đạt |
| `npm test --prefix frontend` | 5/5 đạt |
| `npm run test:ui --prefix frontend -- admin-display.spec.ts` | **14/14 đạt**, không skip hoặc flaky; xem [ui-results.json](ui-results.json) |
| Hồi quy sidebar, dark mode, drawer keyboard và server filter hiện có | 1/1 đạt qua `redesign.spec.ts --grep 'admin sidebar collapse'` |
| Bảo toàn source ngoài phạm vi | **325/325 file tracked không đổi**, xem [preservation-results.json](preservation-results.json) |

Browser: Chrome headless/Windows, production preview. Kiểm tra 360, 390, 768, 1024 và 1440px trên Cài đặt, Tổng quan, Chuyến bay, Phân tích giá, Doanh thu và modal tạo chuyến; kiểm tra thêm các section quản trị còn lại ở 360/1440px. Không phát hiện tràn ngang toàn trang hoặc page exception ở những trường hợp đã chạy. Escape và trả focus của modal/drawer vẫn hoạt động.

Axe WCAG 2 A/AA và 2.1 AA không phát hiện violation trên Cài đặt, Tổng quan, Chuyến bay ở theme sáng/tối và trạng thái lỗi Cài đặt. Kiểm tra biểu đồ với chuỗi quan sát cô lập xác nhận nhãn/tooltip và điều khiển bàn phím vẫn hoạt động khi đổi kích thước. Các trạng thái chưa cấu hình, mất kết nối, DEMO, đang chạy, cooldown, API lỗi và retry được giữ đúng theo phản hồi kiểm thử.

Một kiểm tra điều hướng qua Admin rồi quay về trang khách hàng xác nhận typography, màu nền và chiều rộng của body/header/hero/form khách hàng không đổi khi stylesheet Admin đã được tải. Source backend, routes, API client, auth context, dữ liệu/kiểu dữ liệu, cấu hình, dependency và giao diện khách hàng nằm trong tập được đối chiếu hash.

## Ảnh đối chiếu

Ảnh trước/sau lấy từ cùng checkout và cùng phản hồi API kiểm thử. Dữ liệu trong ảnh là **fixture cô lập cho browser QA**, không phải trạng thái dịch vụ hoặc doanh thu thực tế của môi trường người dùng. Fixture không được import vào ứng dụng hoặc đưa vào bundle production.

| Màn hình | Trước | Sau |
| --- | --- | --- |
| Cài đặt desktop 1440px | [Ảnh trước](screenshots/settings-before-1440.png) | [Ảnh sau](screenshots/settings-after-1440.png) |
| Cài đặt mobile 390px | [Ảnh trước](screenshots/settings-before-390.png) | [Ảnh sau](screenshots/settings-after-390.png) |

- [Cài đặt tối](screenshots/settings-dark-1440.png)
- [Tổng quan và KPI](screenshots/overview-1440.png)
- [Bảng chuyến bay mobile](screenshots/flights-390.png)
- [Modal mobile](screenshots/modal-390.png)

## Phần chưa xác minh

Không thực hiện đăng nhập, CRUD, đồng bộ nguồn hoặc giao dịch với backend/database thật trong lượt QA này. Các request browser được intercept hoàn toàn, không tạo dữ liệu/giao dịch thật. Chưa kiểm tra Safari/iOS/Android vật lý hoặc audit accessibility toàn bộ trạng thái của tất cả màn hình.

Dự án hiện không có script/config lint frontend; không ghi nhận lint là pass. `git diff --check`/`git diff --stat` có lần gặp lỗi `mmap failed: Invalid argument` trên checkout này; không ghi nhận các lệnh đó là đã đạt. Việc bảo toàn phạm vi được kiểm tra độc lập bằng SHA-256 của 325 file tracked, và trạng thái Git chỉ có các file Admin nêu trên cùng test/tài liệu Admin mới.

Build còn cảnh báo Three.js chunk trên homepage lớn hơn 500kB trước gzip, đã có từ trước và nằm ngoài phạm vi cập nhật Admin; chunk và CSS khách hàng không được sửa trong nhiệm vụ này.
