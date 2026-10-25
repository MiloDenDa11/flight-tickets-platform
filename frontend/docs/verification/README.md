# Kiểm thử frontend redesign

Hoàn tất ngày **25/10/2026**, múi giờ Việt Nam.

| Phạm vi | Kết quả |
| --- | --- |
| TypeScript `npm run type-check` | Đạt |
| Frontend production `npm run build` | Đạt |
| 14 nhóm kiểm thử hành vi UI | Đạt |
| Chi tiết chuyến/hạng vé, reset, recovery, 404 | Đạt |
| Empty/error/retry khi danh mục sân bay trống hoặc lỗi | Đạt |
| 1440, 1280, 1024, 768, 390, 320px | Không tràn ngang toàn trang |
| Menu mobile, Escape, focus, modal quản trị | Đạt |
| Bản đồ, chọn/prefill đường bay, reduced motion | Đạt |
| Ảnh/font/script local | Không phát hiện resource error trong lượt kiểm tra cuối |
| Runtime JavaScript exceptions | 0 |
| UTF-8 trong mã nguồn TS/TSX/CSS | 43 file giải mã strict thành công, không có ký tự thay thế |
| Backend/cấu hình bảo vệ | 43 file giữ nguyên SHA-256 |
| Dữ liệu PostgreSQL | 17 bảng giữ nguyên count và fingerprint logic |
| API client/auth context/DTO/router/package/env frontend | Giữ nguyên baseline |

Kết quả chi tiết: [functional-results.json](functional-results.json), [visual-results.json](visual-results.json), [public-pages-results.json](public-pages-results.json), [preservation-results.json](preservation-results.json).

**Lưu ý phạm vi kiểm thử:** GET catalog/chuyến/giá/hạng và các trang quản trị sử dụng API hiện có. Đăng nhập, đăng ký, tạo đơn, thanh toán, hủy, cập nhật hồ sơ/sở thích/yêu thích dùng response kiểm thử được chặn trong trình duyệt để không ghi database. Payload được đối chiếu contract hiện tại. Không chạy migration, seed, reset, worker hết hạn hoặc backend integration test có ghi dữ liệu. Không xác minh giao dịch tiền thật, gửi SMTP hay phát hành vé thật.

Nút tải vé được kiểm tra request, dữ liệu Blob và tên file; nút in được kiểm tra callback. Chứng cứ này kiểm tra luồng frontend, không xác nhận máy in hoặc hệ thống phát hành vé hàng không bên ngoài.

Ảnh kiểm tra nằm trong [screenshots/](screenshots/):

- [Hero, header và tìm kiếm desktop](screenshots/hero-desktop.png)
- [Trang chủ đầy đủ](screenshots/home-final.png)
- [Trang chủ mobile](screenshots/home-final-mobile.png)
- [Kết quả chuyến bay mobile](screenshots/results-mobile.png)
- [Đặt vé ở 320px](screenshots/checkout-320.png)
- [Vé mobile](screenshots/ticket-mobile.png)
- [Dashboard quản trị](screenshots/admin-dashboard.png)
- [Danh sách quản trị ở 320px](screenshots/admin-flights-320.png)

Các tiến trình API chỉ đọc, Vite và Chrome do lượt kiểm thử tạo đã được dừng để không chiếm cổng khi chạy dự án bình thường.
