# Kết quả kiểm tra bản bàn giao

Kiểm tra ngày **24/10/2026**, trên Windows, Node.js 24.14.0, PostgreSQL 15 và Redis 7 qua Docker. Tài khoản, password và database của Travel Platform không được dùng cho bản mới.

| Kiểm tra | Kết quả |
| --- | --- |
| Prisma generate + TypeScript backend | Đạt |
| TypeScript frontend + Vite production build | Đạt |
| SQL migration trên database local mới | 2 migrations thành công |
| Seed local | 9 sân bay, 3 hãng, 2.100 chuyến, 6.300 hạng vé |
| Unit tests | 7/7 đạt |
| PostgreSQL integration tests | 14/14 đạt |
| Luồng thực tế trên Chrome headless | Đạt |
| Giao diện 1440px và 390px | Không tràn ngang toàn trang |
| JavaScript exceptions trong browser flow | Không phát hiện |

## Tình huống đã kiểm thử

- Chuẩn hóa tiếng Việt, Haversine, xếp hạng ưu tiên giá/thời gian, ngày không tồn tại và mật khẩu nhiều byte.
- Không thể tự nâng quyền bằng đăng ký, API quản trị chặn user thường, endpoint riêng chặn truy cập không đăng nhập.
- Origin guard, refresh token xoay một lần, token cũ không dùng lại được.
- Hai người đồng thời tranh ghế cuối: chỉ một request đặt thành công, tồn không âm.
- Retry cùng đơn không giữ thêm ghế; cùng key khác nội dung bị từ chối.
- Thanh toán đồng thời chỉ tạo một payment và một tập vé.
- Không đọc hoặc thanh toán được đơn của người khác.
- Đơn hết hạn được trả ghế đúng một lần và không thể thanh toán.
- Vé không hoàn không bị hủy sau thanh toán; vé được hoàn trả ghế, payment REFUNDED và ticket VOID đúng một lần.
- Khứ hồi hai hành khách phát hành bốn vé, tính tổng tiền đúng.
- Đổi giá hoặc điều kiện hạng vé không làm đổi giá/hoàn/hành lý đã đặt.
- Admin không khóa chính mình, không ngừng chuyến có đơn active, không giảm sức chứa xuống dưới chỗ đã giữ, không xóa sân bay còn liên kết.
- SQL CHECK constraint từ chối tồn ghế âm ngay cả khi ghi trực tiếp bằng Prisma.

Chrome đã chạy qua: trang chủ → tìm chuyến → chọn vé → đăng nhập do checkout được bảo vệ → nhập hành khách → giữ chỗ → thanh toán mô phỏng → thấy mã vé → hủy/hoàn; sau đó kiểm tra hồ sơ, đăng nhập admin, dashboard và tồn ghế. Một đơn demo đã hủy có thể xuất hiện trong tài khoản demo sau QA.

Ảnh kiểm tra trong [screenshots/](screenshots/), kết quả tự động trong [browser-results.json](browser-results.json). Admin dùng bảng có thanh cuộn nội bộ trên màn hình hẹp để giữ đủ cột.

## Chạy lại

```powershell
npm test
npm run test:integration
npm run build
node scripts/ui-review.cjs
```

Browser QA yêu cầu Chrome và tài khoản seed. Script dùng cổng QA 3002/5175, tự khởi động và dừng các server do nó tạo. Có thể đặt CHROME_PATH khi Chrome ở vị trí khác. PostgreSQL/Redis phải đang chạy. Ảnh/profile tạm được lưu vào `.ui-review/` (không commit).

## Phạm vi chưa xác minh

SMTP reset mật khẩu chưa được thử với hộp thư thật vì chưa có thông tin SMTP. Chưa có kết nối lịch bay/PNR/ticketing/thanh toán tiền thật; toàn bộ giao dịch và vé đã thử là mô phỏng. Chưa triển khai production. Workflow CI đã được chuẩn bị nhưng chưa chạy trên GitHub.
