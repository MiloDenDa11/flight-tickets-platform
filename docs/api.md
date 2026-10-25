# REST API

Base: `http://localhost:3001/api/v1`. JSON trả `{ success: true, data }` hoặc `{ success: false, message, errors? }`. Bearer access token cho endpoint có yêu cầu đăng nhập. Cookie refresh gửi kèm credentials. Các endpoint cookie yêu cầu Origin `http://localhost:5174` (hoặc FRONTEND_URL đã cấu hình).

| Method | Endpoint | Quyền | Chức năng |
| --- | --- | --- | --- |
| GET | /health | Public | Trạng thái DB, Redis và mock payment |
| POST | /auth/register | Public + Origin | fullName, email, password |
| POST | /auth/login | Public + Origin | email, password |
| POST | /auth/refresh | Cookie + Origin | Xoay refresh, access mới |
| POST | /auth/logout | Cookie + Origin | Thu hồi refresh |
| GET | /auth/me | User | Hồ sơ công khai |
| POST | /auth/forgot-password | Public | email, cần SMTP |
| POST | /auth/reset-password | Public | token, password |
| GET | /airports?q=da+nang | Public | Tìm sân bay không dấu |
| GET | /airlines | Public | Các hãng đang hoạt động |
| GET | /airlines/:id/reviews | Public | Đánh giá được công khai |
| GET | /flights | Public/User | Tìm chuyến; Bearer tùy chọn cho đề xuất theo sở thích |
| GET | /flights/:id | Public | Chi tiết và các hạng |
| GET | /fares/:id | Public | Hạng vé + chuyến, phục vụ checkout |
| POST | /assistant/recommend | User | query + search, top 3 gợi ý |
| GET/POST | /bookings | User | Liệt kê/tạo giữ chỗ |
| GET | /bookings/:uuid | Chủ đơn | Chi tiết đầy đủ |
| POST | /bookings/:uuid/pay | Chủ đơn | Thanh toán MOCK |
| POST | /bookings/:uuid/cancel | Chủ đơn | Hủy/hoàn theo snapshot |
| GET | /bookings/:uuid/tickets | Chủ đơn | Tải TXT UTF-8 |
| PATCH | /users/profile | User | fullName, phone |
| POST | /users/password | User | currentPassword, password |
| GET/PUT | /users/preferences | User | cabinClass, maxBudget, preferredAirlines, prioritize |
| GET/POST | /users/favorites | User | Đường bay yêu thích; POST originId, destinationId |
| DELETE | /users/favorites/:id | Chủ sở hữu | Bỏ yêu thích |
| GET | /users/search-history | User | 20 yêu cầu gợi ý gần nhất |
| POST | /users/reviews | Khách đã bay | airlineId, rating 1–5, comment |
| GET | /admin/dashboard | Admin | Số liệu và đơn gần đây |
| GET/POST | /admin/flights | Admin | Danh sách/tạo chuyến và fares |
| PATCH | /admin/flights/:id/status | Admin | SCHEDULED/CANCELLED/COMPLETED; chặn khi có đơn active |
| PATCH | /admin/fares/:id | Admin | Giá/hành lý/hoàn/sức chứa, không đổi cabinClass |
| GET/POST/PUT/DELETE | /admin/airports[/:id] | Admin | CRUD sân bay |
| GET/POST/PUT/DELETE | /admin/airlines[/:id] | Admin | CRUD hãng |
| GET | /admin/bookings | Admin | 200 đơn mới nhất |
| GET/PATCH | /admin/users[/:id] | Admin | Danh sách, role/isActive; không tự sửa quyền chính mình |
| GET/PATCH/DELETE | /admin/reviews[/:id] | Admin | Danh sách, isVisible, xóa |

## Tìm chuyến

```http
GET /api/v1/flights?origin=SGN&destination=HAN&date=YYYY-MM-DD&passengers=1&cabinClass=ECONOMY&sort=PRICE
```

`cabinClass`: ECONOMY/PREMIUM/BUSINESS. `sort`: PRICE/DURATION/DEPARTURE/RECOMMENDED. Bộ lọc tùy chọn: airline (mã), maxPrice (giá trọn gói/người). Đổi YYYY-MM-DD thành ngày trong 35 ngày sau seed. Không trả chuyến khởi hành trong vòng 1 giờ.

## Giữ chỗ

```json
{
  "fareIds": [1],
  "passengers": [{ "fullName": "NGUYEN MINH ANH", "dateOfBirth": "1995-05-10", "documentNumber": "012345678901", "nationality": "VN" }],
  "contactEmail": "customer@example.com",
  "contactPhone": "0901234567",
  "idempotencyKey": "8da78897-ac9a-4a44-b456-64a10b9c501c"
}
```

Khứ hồi dùng hai fareIds theo thứ tự đi/về. Giá tính tại backend, cùng số hành khách cho cả hai chặng. Idempotency key UUID mới cho nội dung mới, tái dùng khi retry nội dung cũ. HTTP 409 cho hết ghế/trạng thái xung đột, 422 cho validation, 401 chưa đăng nhập, 403 thiếu quyền, 404 không có đơn thuộc user.

## Giới hạn

Rate limit chung 180 request/phút/IP, auth 20 request/15 phút/IP. Production chạy sau proxy phải cấu hình trust proxy dựa trên topology thực tế; không tự bật trust proxy rộng. Health DB lỗi trả 503, Redis lỗi vẫn phục vụ DB trực tiếp. Mock payment bị chặn khi cấu hình false.
