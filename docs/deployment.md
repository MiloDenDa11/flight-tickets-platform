# Triển khai và vận hành

## Local

`npm run setup` sinh mật khẩu DB, JWT secret và mật khẩu demo độc lập. `.env` gốc dùng cho Docker Compose; `backend/.env` dùng cho API; `frontend/.env` chỉ chứa VITE_API_URL công khai. Không thêm secret vào VITE_*.

`docker compose up -d --wait` chỉ khởi động PostgreSQL/Redis. Hai ứng dụng Node chạy bằng `npm run dev`. Nếu localhost:5174 hoặc API:3001 đang bị chiếm, dừng tiến trình của bản Flight Tickets đang chạy hoặc đổi PORT, FRONTEND_URL và Vite proxy tương ứng. Không tự dừng tiến trình của Travel Platform.

## Build

```powershell
npm run build
npm run start --prefix backend
# frontend/dist là static build. Dùng web server có fallback index.html cho SPA.
```

Vite proxy chỉ áp dụng cho dev. Khi phục vụ `frontend/dist`, reverse proxy `/api` sang backend hoặc build với VITE_API_URL là URL API thực. Frontend và backend production nên cùng site để cookie SameSite=Lax hoạt động. Nếu khác site, cần thiết kế lại cookie/CSRF một cách rõ ràng; chỉ cấu hình CORS là chưa đủ.

## Render hoặc hạ tầng tương tự

1. Tạo PostgreSQL và Redis **mới**; không dùng dịch vụ của Travel Platform.
2. Web service root backend; build `npm ci && npm run build`, release `npm run db:deploy`, start `npm start`.
3. Thiết lập DATABASE_URL, REDIS_URL, FRONTEND_URL, JWT_ACCESS_SECRET (ngẫu nhiên ≥32 ký tự), NODE_ENV=production, ENABLE_MOCK_PAYMENTS=false, SMTP_* khi cần reset mật khẩu. PORT lấy từ nền tảng.
4. Static site root frontend; build `npm ci && npm run build`, publish `dist`, SPA fallback về `/index.html`. Cấu hình route `/api` hoặc VITE_API_URL khi build.
5. Không seed tài khoản demo vào hệ thống thật. Bản này chưa có adapter thu tiền/phát hành vé thật; payment endpoint trả 503 khi tắt MOCK cho đến khi bổ sung tích hợp.

Migrate trước khi chạy server. Không chạy `prisma migrate dev` trong production. Theo dõi `/api/v1/health`; PostgreSQL là bắt buộc. Worker hết hạn trong process có thể chạy trên nhiều replica nhờ CAS + Serializable, nhưng production cần job queue/worker riêng và metrics.

## SMTP

SMTP_HOST, SMTP_PORT (587 STARTTLS hoặc 465 TLS), SMTP_USER, SMTP_PASSWORD, MAIL_FROM. Không log reset token hoặc mật khẩu. Khi SMTP chưa cấu hình, UI hiển thị lỗi cấu hình thay vì báo gửi email thành công.

## Sao lưu

Sao lưu database bằng pg_dump và kiểm tra phục hồi ở database tách biệt. `docker compose down` giữ volumes; không dùng `down -v` nếu cần giữ đơn. Secrets local và DEMO-ACCOUNTS.md không được commit.

## Công việc trước vận hành thương mại

Tích hợp GDS/NDC, giá và rules theo nhà cung cấp, hold/PNR thực, ticketing thực, webhook thanh toán có chữ ký và idempotency, refund đối soát, email vé, phân loại hành khách theo tuổi, tiền tệ/thuế quốc tế, bảo vệ PII, audit logs và giám sát. Các quy tắc này phụ thuộc nhà cung cấp và thị trường, không thể suy ra từ seed demo.
