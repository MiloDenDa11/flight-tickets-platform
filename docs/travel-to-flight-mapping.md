# Đối chiếu với Travel Platform

| Travel Platform | Flight Tickets Platform |
| --- | --- |
| Monorepo backend/frontend | Giữ bố cục, package scripts chạy riêng hoặc chung |
| Express + TypeScript | Giữ công nghệ và mô hình middleware/REST |
| React + Vite + TypeScript | Giữ công nghệ, viết lại giao diện cho vé máy bay |
| PostgreSQL 15 + Prisma 6 | Thiết kế lại 16 bảng, migrations và quan hệ |
| Redis 7 | Cache catalog sân bay, namespace và port riêng |
| JWT/bcrypt/HttpOnly refresh | Giữ phương pháp; opaque refresh tokens xoay và hash DB |
| Category/Destination | Airline/Airport/Flight/FlightFare |
| Trip/TripDay/Itinerary/Expense | Booking/BookingSegment/Passenger/Ticket/Payment |
| Favorites | FavoriteRoute |
| TravelPreference | FlightPreference |
| Reviews + moderation | Đánh giá hãng bởi khách đã hoàn tất chuyến và kiểm duyệt |
| Personalized itinerary/ranking | Weighted ranking theo giá/thời gian/ngân sách/hãng |
| Haversine/map coordinates | Tọa độ sân bay, khoảng cách phục vụ seed demo |
| Admin dashboard | Doanh thu mô phỏng, đơn, chuyến bay, tài khoản |
| Cloudinary/destination photos | Tái sử dụng 3 ảnh có credits; chưa cần upload nghiệp vụ vé |
| Google/Facebook OAuth | Chưa chuyển adapter; email/password đầy đủ |
| AI provider/planner | Thay bằng thuật toán gợi ý xác định, không cần API key |
| Render catalog transfer | Migration/seed và hướng dẫn deploy riêng cho database flight |

Không sao chép `.git`, worktree, backup, `.env`, tài khoản thật hoặc dữ liệu hành khách/du lịch từ dự án nguồn. Dependency manifests và lockfiles được kế thừa để giữ môi trường; một số thư viện nguồn (bản đồ/upload/OAuth) còn trong manifest nhưng không được gọi trong nghiệp vụ mới. Toàn bộ mã nguồn frontend và backend nghiệp vụ được viết lại cho flight, không chỉ đổi nhãn.
