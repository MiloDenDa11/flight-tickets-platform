# Kiểm tra bản cập nhật Admin Dashboard

Ngày kiểm tra: 25/10/2026.

- **33 integration tests + 7 unit tests đạt**. Dùng PostgreSQL schema `flight_platform_test`, Redis DB 15; không reset hoặc seed dữ liệu ứng dụng.
- **45 nhóm kiểm tra trình duyệt đạt**, 33 ảnh kiểm tra. Dashboard ở 1440/1280/1024/768/390/320 px; các trang quản trị ở desktop/mobile; kiểm tra modal, menu mobile, sáng/tối, reduced motion, focus và phím mũi tên biểu đồ.
- Xác nhận tìm kiếm chọn đúng chuyến và ngày; đổi nhóm ngày/tuần/tháng, tìm/lọc bảng, chỉnh/thêm hãng, xem lịch sử từng fare, lỗi API có chủ đích và Retry, nguồn chưa cấu hình bị khóa đồng bộ, USER/anonymous không vào admin.
- Read API dùng database QA `flight_admin_ui_test`; auth/mutation UI được intercept trong harness. Các mutation thật được kiểm tra riêng bằng integration tests. Số liệu trong ảnh QA không phải doanh thu ứng dụng.
- Smoke trên ứng dụng chính cổng 5174/3001 đạt: health, dashboard, monitoring, lịch sử giá, cài đặt, nhận diện hãng, trang khách hàng và tìm chuyến desktop/mobile. Đủ 21 logo danh mục cũ, không ảnh lỗi hoặc tràn ngang, không có exception trình duyệt.
- Fingerprint đối chiếu toàn bộ các cột nghiệp vụ cũ: giữ nguyên 2.100 chuyến, 6.300 fare, 3 đơn, 3 hành khách, 3 thanh toán, 3 vé và dữ liệu người dùng. Loại trừ các trường mới của migration; refresh token có thể xoay theo luồng đăng nhập đang chạy. Giá cũ được bổ sung 6.300 mốc quan sát đầu tiên, tại thời điểm migration.
- Các file xác thực/frontend API, các trang đặt vé, CSS khách hàng và cấu hình Docker/dependency được giữ. Thay đổi tương thích ở directory/logo chỉ đọc thêm metadata hãng. Guard khai thác/tồn ghế mới chỉ bổ sung kiểm tra cho dữ liệu nguồn; các ca nghiệp vụ cũ tiếp tục đạt.
- `.env`, tài khoản demo riêng và logo upload cục bộ được Git ignore. Không đưa khóa API hoặc dữ liệu CCCD đầy đủ vào các báo cáo kiểm tra.

Lệnh kiểm tra trong dự án:

```powershell
npm test
npm run test:integration
npm run build
```

Trên Windows, dừng backend dev trước khi regenerate Prisma trong build/test để không giữ khóa query-engine DLL. Xem [tài liệu quản trị](admin-command-center.md) về nguồn dữ liệu, migration, công thức báo cáo và giới hạn adapter.
