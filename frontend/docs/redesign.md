# Flight Tickets Platform — Frontend redesign

Bản ghi lần nâng cấp Premium Airline Booking ban đầu, thực hiện ngày 24–25/10/2026. **Phiên bản hiện tại đã được nâng cấp tiếp theo brief Premium Global Aviation:** xem [báo cáo mới, danh sách file, kiểm thử và giới hạn](premium-global-redesign.md). Các mô tả màu/font bên dưới là lịch sử của phiên bản đầu.

## Thiết kế

- Hệ màu dùng CSS variables: navy `#102D3A`, teal `#087E83`, sky `#4DADE0`, cloud `#F8FAFC`, champagne `#E8B875`, coral `#FF8066` và emerald.
- Be Vietnam Pro cho nội dung, Manrope cho tiêu đề. WOFF2 và giấy phép OFL được lưu local; không tải font ngoài ở runtime.
- Hero dùng ảnh máy bay được tạo riêng, bản JPEG khoảng 204 KB; tiêu đề tiếng Việt, CTA dẫn đến form/bản đồ và boarding pass ghi rõ là minh họa.
- Header sticky, trạng thái cuộn, menu mobile dạng drawer có Escape/focus trap, skip link và đầy đủ đường dẫn cũ qua điều hướng, tài khoản và footer.
- Không thêm bộ chọn tiền tệ/ngôn ngữ giả. Chỉ hiển thị VI/VND đang được ứng dụng sử dụng.

## Các trang đã đồng bộ

Trang chủ; kết quả tìm kiếm; chi tiết chuyến và hạng vé; checkout/hành khách; danh sách đơn và chi tiết đơn/vé; đăng nhập/đăng ký; khôi phục/đặt lại mật khẩu; hồ sơ, sở thích, đánh giá; đường bay yêu thích; gợi ý cá nhân hóa; toàn bộ trang quản trị hiện có và trang 404.

Các trang hồ sơ, chi tiết chuyến bay và các màn hình khác tiếp tục dùng dữ liệu và xử lý hiện có, đồng thời nhận hệ typography, input, card, thông báo và responsive từ CSS chung. Không thay API để phục vụ thiết kế.

## Thành phần mới

### Tìm kiếm

`components/search/AirportCombobox.tsx` tìm theo thành phố/mã/tên sân bay với chuẩn hóa tiếng Việt, có listbox/combobox ARIA, phím mũi tên, Enter, Escape và chọn bằng chuột. Dữ liệu chỉ lấy từ `/airports`.

`FlightSearchWidget.tsx` giữ request/query hiện tại; hỗ trợ một chiều/khứ hồi, đảo chiều có transition, native date picker, tăng giảm 1–9 hành khách, 3 hạng vé có sẵn, validation tiếng Việt, loading và chống thao tác gửi lặp khi bận. Không bổ sung nhiều thành phố hoặc loại hành khách mà backend chưa hỗ trợ.

Kết quả tìm kiếm giữ các bộ lọc API. Thêm bộ lọc khung giờ ở frontend dựa trên giờ khởi hành theo múi giờ sân bay của các chuyến đã nhận. Liên kết hãng từ trang chủ điền đúng bộ lọc hãng. Flight card có skeleton, logo/icon chính thức nếu phù hợp, giá trọn gói, hành lý, tồn ghế và phần chi tiết mở rộng.

### Bản đồ

Dùng **Leaflet/React Leaflet đã có trong dự án**, không cài thư viện mới. GeoJSON đất liền Natural Earth 110m được lưu local. Không cần tile server, token bản đồ hoặc API mới.

Các marker dùng đúng tọa độ sân bay từ API; tooltip hiển thị tên và IATA. Người dùng có thể chọn điểm đi/đến, dùng nút zoom, xem thế giới/khu vực sân bay, và chuyển lựa chọn vào form mà giữ các trường khác đang nhập. Đường cong có stroke animation; marker được chọn có pulse. Cả hai giảm chuyển động theo `prefers-reduced-motion`.

Đường nối được ghi rõ là minh họa kết nối. Không biểu thị lịch khai thác, tình trạng mở bán hay giá vé thực tế. Bản đồ và thư viện được lazy-load khi gần viewport. Vite tối ưu trước `leaflet`/`react-leaflet` để tránh tải lại trang ở lần đầu mở bản đồ trong dev.

### Hãng, điểm đến và chuyến nổi bật

- Danh mục giới thiệu 21 hãng trong brief, lọc Việt Nam/quốc tế và mở rộng/thu gọn. Logo/icon lấy từ website chính thức, không tự vẽ lại; nếu không có asset phù hợp thì dùng mã chữ trung tính. Chỉ hãng do API trả về mới dẫn tới tìm chuyến; hãng tham khảo dẫn tới website chính thức.
- Điểm đến chia Việt Nam/Châu Á/Thế giới với ảnh local. Chỉ sân bay có trong API mới có CTA tìm chuyến; điểm cảm hứng chưa có dữ liệu được ghi rõ.
- Chuyến nổi bật gọi `/flights` hiện có cho ba hành trình tham khảo. Giá lấy từ response API; không thêm giá giả, phần trăm tiết kiệm hoặc khuyến mãi không tồn tại. Có loading/empty/error và retry.
- Thêm hướng dẫn 3 bước, gợi ý cá nhân hóa, FAQ bằng native details/summary và CTA kết thúc. Không thêm newsletter, hotline, chứng nhận hoặc lời chứng thực không có dữ liệu.

## File tạo/chỉnh sửa

Chỉnh sửa:

```text
frontend/index.html
frontend/vite.config.ts
frontend/src/main.tsx
frontend/src/index.css
frontend/src/components/common.tsx
frontend/src/components/SearchForm.tsx
frontend/src/components/FlightCard.tsx
frontend/src/pages/HomePage.tsx
frontend/src/pages/FlightsPage.tsx
frontend/src/pages/CheckoutPage.tsx
frontend/src/pages/BookingsPage.tsx
frontend/src/pages/AuthPages.tsx
frontend/src/pages/AssistantPage.tsx
frontend/src/pages/AdminPage.tsx
```

Tạo mới:

```text
frontend/src/styles/{tokens,base,layout,search,home,booking,admin}.css
frontend/src/components/{Icon,Reveal,AirlineMark,BookingSteps,PasswordInput}.tsx
frontend/src/components/useDialogFocus.ts
frontend/src/components/search/{AirportCombobox,FlightSearchWidget}.tsx
frontend/src/components/home/{Hero,WorldMap,Destinations,AirlineDirectory,FlightHighlights,JourneyGuide}.tsx
frontend/src/data/airlines.ts
frontend/src/utils/search.ts
frontend/public/fonts/*
frontend/public/geo/world-land.geojson
frontend/public/brands/*
frontend/public/images/premium/*
frontend/public/asset-credits.html
frontend/docs/redesign.md
frontend/docs/asset-notes.md
frontend/docs/verification/*
```

Không cài thêm package npm. `package.json`, lockfile, biến môi trường, cách khởi chạy, router và DTO không đổi. `AuthContext.tsx`, `services/api.ts` và `types/index.ts` giữ nguyên.

## Kiểm thử và bảo toàn hệ thống

- `npm run type-check` và `npm run build` trong frontend.
- Kiểm tra trình duyệt ở 1440, 1280, 1024, 768, 390 và 320px; rà soát ảnh, font, overlay, menu, form và lỗi runtime.
- API GET cho sân bay, hãng, chuyến bay, giá/hạng và các trang quản trị dùng response hiện tại.
- Đăng ký/đăng nhập, tạo đơn, thanh toán, hủy/hoàn, cập nhật hồ sơ/sở thích/yêu thích được kiểm thử UI bằng request interception. Payload được đối chiếu validator/contract hiện tại. Mọi request ghi được giữ trong bộ kiểm thử và không được chuyển đến database.
- Kiểm thử nút tải vé xác nhận request, nội dung Blob và tên file; thao tác in được ghi nhận trong trình duyệt kiểm thử. Không phát hành vé thật hay thao tác máy in.
- Không chạy migration, seed, reset hay backend integration test có ghi dữ liệu trong lượt redesign này.
- Backend chạy kiểm tra dưới wrapper chỉ đọc, chặn mutation và endpoint booking có cleanup. Không chạy worker hết hạn giữ chỗ.
- So sánh SHA-256 các file backend/cấu hình được bảo vệ và fingerprint logic của 17 bảng public PostgreSQL trước/sau. Xem kết quả cuối trong [verification/](verification/).

Ảnh kiểm tra và ma trận kết quả nằm trong `frontend/docs/verification/`. Frontend không có cấu hình/lệnh lint sẵn, nên kiểm tra bằng TypeScript, build và trình duyệt; không tự thêm cấu hình lint.

## Chạy như trước

```powershell
cd "C:\Users\LOQ\OneDrive\Desktop\Flight Tickets Platform"
npm run dev
```

Frontend mặc định `http://localhost:5174`; backend và database dùng cấu hình hiện có. Không đổi cổng hoặc secrets. Dừng dev server trước khi build nếu môi trường Windows đang khóa file engine của Prisma; bản nâng cấp này chỉ cần build frontend.

## Giới hạn

Chức năng đặt vé, thanh toán, AI/ranking, điều kiện vé, nguồn lịch bay và email tiếp tục theo backend gốc. Bản redesign không thêm GDS/NDC, thanh toán thật, OAuth, nhiều thành phố, check-in, số ghế hay newsletter. Danh mục thương hiệu và ảnh quốc tế không hàm ý các hãng/điểm đến đều có thể đặt trong hệ thống.

Tài nguyên và giấy phép: [public/asset-credits.html](../public/asset-credits.html). Chi tiết ảnh hero và prompt: [asset-notes.md](asset-notes.md).
