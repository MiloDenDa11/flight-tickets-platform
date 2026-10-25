# Flight Tickets Platform

Nền tảng tìm kiếm và đặt vé máy bay, được xây dựng lại từ cấu trúc của Travel Platform. Monorepo **Express + TypeScript / React + Vite + TypeScript / Prisma + PostgreSQL / Redis**, có backend, frontend khách hàng, frontend quản trị, migration, seed và kiểm thử.

## Chạy trên Windows

Yêu cầu: Node.js 20.19+ hoặc 22/24, npm, Docker Desktop chạy Linux containers.

Mở PowerShell tại thư mục dự án:

```powershell
cd "C:\Users\LOQ\OneDrive\Desktop\Flight Tickets Platform"
npm run setup
npm run install:all
docker compose up -d --wait
npm run db:migrate
npm run db:seed
npm run dev
```

Nếu bản bàn giao đã có `node_modules`, `.env` và dữ liệu được migrate/seed, có thể bỏ qua cài đặt và chỉ chạy `docker compose up -d --wait`, sau đó `npm run dev`.

- Frontend: **http://localhost:5174**
- Backend: **http://localhost:3001/api/v1**
- Health: **http://localhost:3001/api/v1/health**
- PostgreSQL: localhost:**5434**, database `flight_tickets_db`
- Redis: localhost:**6381**
- Tài khoản quản trị/người dùng: xem **DEMO-ACCOUNTS.md**, được tạo riêng bởi `npm run setup`. Mật khẩu được sinh ngẫu nhiên, không lấy từ dự án gốc.
- Prisma Studio: `npm run db:studio --prefix backend`

`setup` giữ nguyên cấu hình đã tồn tại. Seed tạo lịch bay demo cho 35 ngày tiếp theo, chạy lại không xóa đơn hoặc ghi đè giá, tồn ghế và mật khẩu đã có. Chạy lại seed khi cần bổ sung lịch bay tương lai. Không dùng database hay Redis của Travel Platform.

## Chức năng

Khách hàng có thể đăng ký/đăng nhập, khôi phục mật khẩu qua SMTP, đổi mật khẩu, sửa hồ sơ, lưu sở thích bay, lưu đường bay yêu thích, tìm vé theo ngày/sân bay/hãng/hạng/ngân sách, sắp xếp theo giá hoặc thời gian, xem chi tiết hành lý và giá gốc/thuế. Hỗ trợ đặt một chiều hoặc khứ hồi cho 1–9 hành khách, giữ ghế 15 phút mặc định, thanh toán mô phỏng, mã đặt chỗ, vé điện tử dạng TXT và bản in, theo dõi đơn, hủy/hoàn theo điều kiện vé. Người đã bay có thể đánh giá hãng.

Trang gợi ý cá nhân hóa dùng tìm kiếm tiếng Việt không dấu và chấm điểm có trọng số theo giá, thời gian bay, ngân sách và hãng yêu thích. Đây là thuật toán xác định, không gọi LLM bên ngoài. Không quảng cáo dữ liệu gợi ý là dữ liệu từ hệ thống hãng bay.

Quản trị viên có dashboard, danh sách đơn và chi tiết vé, CRUD sân bay/hãng, tạo chuyến bay, ngừng/mở bán, sửa giá và sức chứa từng hạng, khóa tài khoản/đổi quyền và kiểm duyệt đánh giá. Chuyến hoặc hãng có đơn sắp tới đang hoạt động được bảo vệ khỏi đổi trạng thái gây mất khả năng thanh toán. Giá và điều kiện đã đặt được lưu thành snapshot trên đơn.

## Aviation Command Center

Dashboard quản trị mới tại **http://localhost:5174/admin** gồm theo dõi chuyến bay, lịch sử giá quan sát, đơn vé/CCCD đã che, khách hàng, hãng bay, báo cáo doanh thu và nhật ký. Có bộ lọc và phân trang server, sáng/tối, giao diện responsive và cập nhật định kỳ. Nguồn đối tác chưa cấu hình được ghi rõ; lịch/giá và thanh toán nội bộ vẫn là demo.

Database hiện có chỉ cần `npm run db:migrate`; không reset/seed lại. Xem [hướng dẫn quản trị, số liệu, bảo mật và adapter nguồn](backend/docs/admin-command-center.md).

## Cấu trúc thư mục

```text
backend/
  src/config/         Biến môi trường, Prisma, Redis
  src/routes/         REST API /api/v1
  src/controllers/    HTTP input/output
  src/services/       Nghiệp vụ, transaction, thuật toán
  src/repositories/   Truy xuất dữ liệu và include dùng chung
  src/middlewares/    JWT, phân quyền, Origin guard, xử lý lỗi
  src/validators/     Zod schemas
  src/utils/          Xếp hạng, Haversine, chuẩn hóa tiếng Việt
  prisma/             Schema, SQL migrations, seed
  tests/              Unit và integration với PostgreSQL
frontend/
  src/pages/          Khách hàng và quản trị
  src/components/     Layout, biểu mẫu tìm chuyến, thẻ chuyến
  src/contexts/       Phiên đăng nhập
  src/services/       Axios, refresh token, API errors
  src/types/          Kiểu dữ liệu giao diện
scripts/              Setup, chạy đồng thời hai ứng dụng
docs/                 Kiến trúc, API, database, triển khai
```

## Kiểm thử và build

```powershell
npm test
npm run test:integration
npm run build
```

Trên Windows, dừng các tiến trình `npm run dev`/`npm start` trước khi build để Prisma có thể cập nhật file engine.

Integration test dùng schema **flight_platform_test** riêng trong database cấu hình, tự migrate schema đó và tạo/xóa fixture của lần chạy. Không reset schema `public` hoặc dữ liệu người dùng. Cần PostgreSQL đang chạy. Redis là cache tùy chọn khi phục vụ API; health trả rõ trạng thái cache.

## Dữ liệu và tích hợp thật

Lịch bay, giá vé, giao dịch, hoàn tiền và mã vé trong bản này là **demo**; vé không có giá trị làm thủ tục tại sân bay. Chưa kết nối GDS/NDC/Amadeus/Sabre, chưa có cổng thanh toán tiền thật và chưa tự gửi vé qua email. Không có chức năng chọn số ghế hoặc check-in trực tuyến. Phí trong seed chỉ phục vụ trải nghiệm, không đại diện biểu phí hiện hành của hãng.

Khôi phục mật khẩu hoạt động khi điền SMTP trong `backend/.env`. Khi chưa cấu hình, API trả lỗi rõ ràng. Bản này dùng tài khoản email/mật khẩu; OAuth của Travel Platform cần cấu hình/tích hợp riêng nếu muốn bổ sung.

Trước khi dùng thực tế cần tích hợp nhà cung cấp lịch bay/đặt chỗ/phát hành vé và thanh toán với webhook xác thực, quy tắc trẻ em/em bé, điều kiện giá và hoàn đổi thực tế, email giao dịch, bảo vệ dữ liệu hành khách, logging/audit và giám sát. `NODE_ENV=production` bắt buộc `ENABLE_MOCK_PAYMENTS=false`; ứng dụng sẽ từ chối khởi động nếu còn bật thanh toán mô phỏng.

Xem [kiến trúc](docs/architecture.md), [database](docs/database.md), [API](docs/api.md), [triển khai](docs/deployment.md), [đối chiếu Travel Platform](docs/travel-to-flight-mapping.md) và [kết quả kiểm tra](docs/verification.md).

Ảnh điểm đến tái sử dụng từ dự án gốc, giữ thông tin tác giả và giấy phép tại [frontend/public/images/credits.html](frontend/public/images/credits.html).
