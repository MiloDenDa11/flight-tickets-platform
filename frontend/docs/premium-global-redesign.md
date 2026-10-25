# Premium Global Aviation — frontend redesign

Triển khai trực tiếp trong `Flight Tickets Platform/frontend`, ngày 25/10/2026, theo brief Premium Global Aviation. Backend, database, API contract, xác thực và cách khởi chạy ứng dụng được giữ nguyên.

## Thiết kế đã triển khai

- Playfair Display cho headline và tiêu đề biên tập; Be Vietnam Pro cho nội dung, form và menu; Manrope cho giờ bay, giá và dữ liệu số. Font WOFF2 lưu local, có subset tiếng Việt và giấy phép OFL. Hero desktop dùng `clamp(64px,6vw,88px)`; nội dung chính 16–17px, navigation 15px. Mobile điều chỉnh headline từ 34px để tránh một từ đứng riêng ở màn hình 320px.
- Tokens midnight navy `#0B2635`, deep ocean `#103D50`, teal `#087F83`, turquoise `#22B8B5`, sky `#69C8F0`, gold `#F0B86D`, coral `#FF8066`, lavender `#A89BE8`, cloud `#F8FAFC`, warm sand `#F5EBDD`.
- Hero giữ ảnh máy bay không mang thương hiệu, thêm các đường cong/IATA trang trí, headline vàng, hai CTA và boarding pass ghi rõ minh họa. Ảnh JPEG đang dùng khoảng 204KB. Màn hình laptop thấp có hero gọn hơn; card minh họa được ẩn ở tablet/mobile để ưu tiên thao tác tìm vé.
- Form màu trắng ấm, góc 24px, input và nhãn lớn hơn. Giữ autocomplete, bàn phím, đảo chiều, một chiều/khứ hồi, ngày, số hành khách và hạng vé. Mobile có chip IATA; ở 320px, ngày và hành khách chuyển thành các hàng riêng.
- Thứ tự trang chủ: hero → tìm kiếm → world map → hãng bay → điểm đến → chuyến nổi bật → lý do lựa chọn → hướng dẫn → FAQ → CTA/footer navy.
- Bản đồ Leaflet dùng phép chiếu địa lý EPSG:4326 để giảm biến dạng vùng cực; có pan/zoom, tooltip, nút thế giới/khu vực sân bay, đường cong, marker pulse và điền điểm đi/đến vào form. Zoom/attribution được định kiểu với specificity đủ để không bị CSS Leaflet tải sau ghi đè.
- Sân bay và các lựa chọn tìm vé lấy từ API. Năm thành phố Paris, New York, São Paulo, Dubai, Sydney là lớp cảm hứng độc lập, tọa độ thành phố gần đúng, có viền vàng và tooltip minh họa. Chúng không phải bản ghi sân bay, không có giá/lịch/chỗ, không đi vào dropdown hoặc request đặt vé. Chú giải và sidebar phân biệt lớp này với sân bay API.
- Danh mục 21 thương hiệu giữ assets chính thức và fallback mã chữ. Chỉ hãng có trong API có liên kết tìm vé theo hãng; các thương hiệu còn lại là tham khảo, không khẳng định quan hệ đối tác.
- Mười điểm đến thuộc năm vùng Việt Nam / Đông Nam Á / Đông Á / Châu Âu / quốc tế khác. Mosaic gồm một card cao và hai card nhỏ, hai card lệch tỷ lệ hoặc một ảnh rộng; mobile xếp dọc. Các card có quốc gia, mô tả và trạng thái khả dụng. Điểm chưa có sân bay API được ghi rõ là cảm hứng du lịch.
- Thẻ chuyến bay, bộ lọc, checkout, vé, tài khoản, auth và quản trị nhận typography mới. Giá/IATA được tăng cỡ; bố cục thẻ chuyển hàng ở laptop hẹp và mobile; bảng quản trị cuộn trong vùng riêng.
- Thêm section lý do lựa chọn với màu teal/gold/lavender; các bước đặt vé có điểm nhấn coral. Hiệu ứng reveal, hover, đường bay và chuyển động ảnh hỗ trợ `prefers-reduced-motion`.

## File frontend đã sửa hoặc thêm trong lần nâng cấp này

| File | Thay đổi |
| --- | --- |
| `src/index.css` | Import font Playfair local |
| `src/main.tsx` | Import stylesheet editorial |
| `src/styles/tokens.css` | Màu, font display và kích thước header |
| `src/styles/base.css` | Typography, form, button và tiêu đề trang |
| `src/styles/layout.css` | Header/nav, breakpoint drawer, footer navy |
| `src/styles/search.css` | Search widget, input, popover và stepper |
| `src/styles/home.css` | Hero, map, hãng, highlights, hướng dẫn, FAQ/CTA |
| `src/styles/editorial.css` | Đường trang trí hero, mosaic, lý do lựa chọn, responsive laptop thấp |
| `src/styles/booking.css` | Kết quả, flight cards, checkout, vé, auth/tài khoản |
| `src/styles/admin.css` | Typography và bố cục quản trị |
| `src/pages/HomePage.tsx` | Thứ tự section và tích hợp lý do lựa chọn |
| `src/components/home/Hero.tsx` | SVG đường cong, IATA, copy responsive |
| `src/components/home/WorldMap.tsx` | Phép chiếu, view responsive, layer minh họa, chú giải |
| `src/components/home/Destinations.tsx` | Năm nhóm, mười điểm đến, bố cục theo số card |
| `src/components/home/JourneyGuide.tsx` | Section lý do lựa chọn |
| `src/components/search/AirportCombobox.tsx` | Chip IATA trên mobile; giữ nguyên giá trị và xử lý |
| `src/data/mapInspiration.ts` | Năm thành phố minh họa độc lập với dữ liệu bán vé |
| `public/fonts/playfair.css`, `playfair-*.woff2`, `playfair-OFL.txt` | Font local và giấy phép |
| `public/images/premium/seoul.jpg`, `london.jpg`, `dubai.jpg` | Ba ảnh điểm đến mới |
| `public/images/premium/sources.json`, `public/asset-credits.html` | Nguồn ảnh/font và giấy phép |
| `docs/premium-global-redesign.md`, `docs/redesign.md`, `docs/asset-notes.md` | Báo cáo và ghi chú tài nguyên |
| `docs/verification-global/*` | Kết quả kiểm tra và ảnh giao diện |

Không sửa `App.tsx`, `AuthContext.tsx`, API service, types/DTO, `.env`, Vite config, package scripts hoặc lockfile. File `FlightCard.tsx` giữ nguyên logic; bố cục và typography được cập nhật qua stylesheet.

## Thư viện

Không cài thêm thư viện npm. Tiếp tục dùng React, TypeScript, Vite, React Router, Leaflet và React Leaflet có sẵn. Motion dùng CSS và IntersectionObserver. Playfair Display là tài nguyên font local, không phải dependency runtime hay dịch vụ CDN.

## Kiểm tra

- `npm run type-check` và `npm run build` thành công. Build cuối gồm 169 module; JS chính khoảng 103KB gzip, map lazy khoảng 48KB gzip.
- Kiểm tra Chrome desktop/laptop/tablet/mobile tại 1440, 1280, 1024, 768, 390 và 320px; không có lỗi JavaScript nghiêm trọng hoặc tràn ngang. Kiểm tra riêng 1280×800 xác nhận nút tìm vé trong khung nhìn đầu; giá và nút chọn vé không chồng nhau ở sáu kích thước.
- Font Playfair thực sự được tải, glyph tiếng Việt hoạt động; headline desktop đo được 86.4px, nội dung 17px, navigation 15px. Font nội dung vẫn là Be Vietnam Pro.
- Autocomplete không dấu, chọn sân bay, đảo chiều, ngày khứ hồi, tăng hành khách và đổi cabin; bộ lọc, sắp xếp, mở chi tiết, lỗi API và khôi phục kết quả.
- Chuyển hướng đăng nhập khi checkout, request đăng nhập/đăng ký, hiện/ẩn mật khẩu, session hết hạn và recovery/reset.
- Form hành khách, request giữ chỗ, countdown, thanh toán mô phỏng, tải/in vé và hủy/hoàn; tabs đơn, yêu thích, hồ sơ/sở thích và trợ lý.
- Drawer mobile, Escape/focus restore, bảy màn quản trị, vùng cuộn bảng và modal/focus bàn phím.
- Bản đồ pan/zoom, tooltip, điền tuyến vào form, phân biệt thành phố minh họa; 21 hãng, năm nhóm điểm đến, ảnh local, FAQ và reduced motion.

Các kiểm tra có thao tác ghi sử dụng CDP interception, trả dữ liệu trong bộ nhớ. Preview API chỉ cho đọc; GET bookings cũng được chặn vì endpoint gốc có thể dọn đơn hết hạn. Không tạo booking, thanh toán, tài khoản hoặc thay mật khẩu trong database để kiểm tra UI.

Đối chiếu SHA-256 xác nhận 43 file backend/cấu hình được bảo vệ giữ nguyên. Fingerprint số dòng và nội dung của 17 bảng PostgreSQL trước/sau kiểm tra trùng khớp. Xem các JSON và ảnh trong [verification-global](verification-global/README.md).

## Giới hạn được giữ rõ

- Đây vẫn là môi trường demo: thanh toán và vé không dùng ngoài thực tế. Các bài kiểm tra tương tác ghi được mô phỏng ở trình duyệt, không xác nhận giao dịch của nhà cung cấp hàng không/thanh toán thật.
- Chỉ danh mục, hãng, lịch, giá và tồn ghế API hiện có mới có thể bán vé. Paris/London/Dubai trong explorer là nội dung biên tập nếu chưa có sân bay API; các nút tra cứu không tự thêm sân bay hay tuyến mới.
- Các đường nối trên bản đồ minh họa cảm hứng/kết nối, không đại diện cho mạng khai thác thực tế. Điều kiện và giá phải được xác định qua tìm kiếm và luồng đặt vé hiện tại.
- Responsive được kiểm tra bằng Chrome trên Windows với viewport mô phỏng; chưa có xác nhận trực tiếp trên Safari/iOS hoặc thiết bị di động vật lý. Không thay date picker native bằng một thư viện mới.
- Không thay cổng khởi chạy. Frontend dev hiện tại tiếp tục dùng `http://localhost:5174`, backend hiện tại dùng cổng cũ; preview kiểm tra 5175/3003 được dừng sau khi hoàn tất.
