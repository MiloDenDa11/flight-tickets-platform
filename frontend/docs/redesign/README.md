# Flight Tickets Platform — frontend redesign

Ngày kiểm tra: **01/11/2026**, múi giờ Asia/Ho_Chi_Minh. Thực hiện trực tiếp trên checkout React 18 / Vite 6 / TypeScript hiện có. Giữ lại các thay đổi chưa commit có sẵn, gồm cả thay đổi backend của người dùng.

## Phần đã triển khai

- Chuẩn hóa palette navy, ocean blue, gold, nền cloud white; tách màu chữ/link đủ tương phản với màu trang trí. Tái sử dụng font tiếng Việt, ảnh và icon có sẵn. Bổ sung tokens spacing, motion và chiều rộng nội dung.
- Homepage: hero mới, địa cầu Three.js thực, tìm kiếm nổi bật, đưa điểm đến và chuyến bay lên trước bản đồ; thêm ba câu chuyện văn hóa Hà Nội / Tokyo / Seoul với tab dùng được bằng bàn phím. Ảnh có kích thước, lazy loading và fallback; thẻ điểm đến chỉ mở tìm kiếm khi cả sân bay đi và đến có trong API.
- Navigation sticky và mobile drawer; thêm đường dẫn trực tiếp tới tìm chuyến, điểm đến, khám phá. Giữ các route cũ và khôi phục focus khi đóng drawer.
- Kết quả chuyến bay: tiến trình đặt vé, bộ lọc thu gọn trên mobile, thông tin giá/múi giờ rõ ràng, retry khi API lỗi, skeleton và empty state. Bộ lọc, sort và request API giữ nguyên hợp đồng hiện tại.
- Dùng chung giao diện mới cho chi tiết chuyến, hạng vé, checkout, tài khoản, hồ sơ, sở thích, yêu thích và lịch sử vé. Đồng bộ nhãn bước checkout với tiến trình ba bước. Thêm trạng thái xác nhận/hủy/hết hạn và modal xác nhận hủy có focus trap, Escape và trả focus.
- Admin: sidebar thu gọn có lưu sở thích giao diện, drawer mobile có nút đóng, breadcrumb, palette và typography nhất quán, form dễ đọc hơn, bảng cuộn riêng và giao diện sáng/tối. Tái sử dụng dashboard, KPI, biểu đồ, tìm kiếm, phân trang và thao tác quản trị hiện có; không thêm thống kê hoặc cảnh báo giả.

## Scene 3D và tài nguyên

`createGlobe.ts` được import động sau khi phần nội dung chính có thời gian hiển thị. Scene dùng geometry đơn giản, outlines Natural Earth đã có trong repo, gộp đường vẽ theo material, giới hạn pixel ratio 1.25 và nhịp vẽ tối đa 24 lần/giây. Dừng vẽ khi ra khỏi viewport hoặc tab ẩn; có nút tạm dừng và dọn GPU resources khi unmount.

Mobile dưới 768px, thiết bị báo tối đa hai luồng CPU, chế độ tiết kiệm dữ liệu và `prefers-reduced-motion` ưu tiên ảnh tĩnh. WebGL không khả dụng hoặc mất context sẽ dùng SVG fallback. Nếu chỉ asset địa lý tải lỗi, scene giữ địa cầu có lưới. Các đường bay được ghi rõ là minh họa, không đại diện lịch khai thác.

Ảnh và font được tái sử dụng từ `public/`, không có URL ảnh ngẫu nhiên hoặc dependency font từ xa mới. Nguồn/giấy phép: [ảnh Việt Nam](../../public/images/credits.html), [ảnh quốc tế](../../public/images/premium/sources.json), [tài nguyên và Natural Earth](../../public/asset-credits.html). SVG fallback là tài nguyên mới được vẽ trong source.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run build --prefix frontend` | Đạt, gồm TypeScript và production build |
| `npm run type-check --prefix frontend` | Đạt |
| `npm test --prefix frontend` | 5/5 test hiện có đạt |
| `npm run test:ui --prefix frontend` | 27/27 browser test đạt; xem [results.json](results.json) |
| Axe WCAG 2 A/AA và 2.1 AA | Đạt trên các trang được quét, không có violation được phát hiện |
| Bảo toàn source | 62/62 file được đối chiếu SHA-256 giữ nguyên |

Browser tests chạy trên **Chrome headless / Windows**, với production preview. Có kiểm tra 360, 390, 768, 1024 và 1440px: homepage, kết quả tìm kiếm, chi tiết chuyến, checkout, danh sách/chi tiết đặt vé, hồ sơ, yêu thích, gợi ý, Admin dashboard và modal tạo chuyến. Không phát hiện tràn ngang toàn trang trên các trang/kích thước đã kiểm tra; bảng có vùng cuộn ngang riêng.

Các test tương tác gồm login/register/logout và `next`, phân quyền Admin/User, tìm một chiều/khứ hồi, số hành khách/hạng vé, validation cùng sân bay và liên kết lỗi với input, retry/empty/API unavailable, giữ đúng fare ID hai chặng, payload đặt chỗ, thanh toán mô phỏng, tải vé, xác nhận hủy, focus modal/drawer, theme/sidebar và server filter Admin. Kiểm tra các section quản trị còn lại không phát sinh page exception.

Axe quét homepage, kết quả tìm kiếm, checkout, chi tiết đặt vé, login, register, khôi phục mật khẩu và Admin dashboard ở cả hai theme. Đây là kiểm tra tự động theo tập quy tắc nêu trên, không phải chứng nhận accessibility toàn hệ thống. Các kịch bản lỗi API và WebGL được cố ý mô phỏng.

**Toàn bộ API trong browser suite được intercept bằng fixture chỉ nằm ở `tests/browser/`.** Fixture không được import vào ứng dụng, không được đưa vào bundle production và không được dùng làm nguồn giá/doanh thu trên sản phẩm. Không có giao dịch, tài khoản hay dữ liệu database thật được tạo hoặc sửa trong lần kiểm tra này.

## Giới hạn xác minh và chức năng chưa có

- Frontend đang phục vụ tại `http://localhost:5174` (HTTP 200). Kiểm tra `/api/v1/health` qua frontend nhận HTTP 500; backend mặc định không lắng nghe ở cổng 3001 trong phiên làm việc này. Vì vậy chưa xác minh lại các giao dịch, xác thực cookie/token, tồn ghế, nghiệp vụ hoàn/hủy và CRUD trên backend/database thật. Không khởi chạy backend worker, seed, migration hoặc thanh toán thật.
- Không bổ sung cổng thanh toán thật, GDS/NDC, check-in, chọn số ghế, ưu đãi hoặc chính sách chưa được hệ thống hỗ trợ. SMTP/khôi phục mật khẩu thật chưa kiểm tra. Không dựng biểu đồ lịch sử giá hoặc số liệu khi thiếu dữ liệu.
- Chưa kiểm tra Safari/iOS, Android vật lý, throttling mạng hoặc đối chiếu Lighthouse/Core Web Vitals trước/sau. Không kết luận tốc độ hoặc FPS thực tế chỉ từ cảm nhận.
- Dự án chưa có script/config lint frontend; không ghi nhận lint là đã đạt. `git diff --check` gặp lỗi checkout `mmap failed: Invalid argument`; không ghi nhận lệnh này là pass. Thay vào đó đã đối chiếu hash 62 file tracked backend và các file frontend cần giữ nguyên (App/routes, auth context, API client, types, utils); xem [preservation-results.json](preservation-results.json). Không sửa backend, `.env`, CI hoặc cấu hình dùng chung.

## Dependency và kích thước build

- Runtime: **three** để đáp ứng scene 3D hoạt động thực sự.
- Dev: **@types/three** cho TypeScript; **@playwright/test** cho browser regression; **@axe-core/playwright** cho kiểm tra accessibility. Tận dụng Chrome đã cài, không cài thêm browser trong phiên này.
- Không chuyển framework, thêm UI framework hay thư viện animation khác.

| Bundle | Ban đầu (gzip) | Sau redesign (gzip) |
| --- | ---: | ---: |
| JavaScript chính | 99.62 kB | 102.39 kB |
| CSS chính | 20.11 kB | 23.37 kB |
| Three.js / scene, tải riêng khi phù hợp | — | 132.97 kB |

Vite còn cảnh báo scene chunk lớn hơn 500 kB khi chưa gzip (532.91 kB); chunk này không nằm trong JavaScript chính và không được tải cho các trường hợp fallback nêu trên. Bảng trên là kích thước output build, không phải đo hiệu năng người dùng.

## Chạy lại và ảnh giao diện

```powershell
npm run build --prefix frontend
npm run type-check --prefix frontend
npm test --prefix frontend
npm run test:ui --prefix frontend
```

Browser suite cần Google Chrome đã cài. Playwright tự mở production preview ở cổng 4174 và đóng server do nó tạo sau khi chạy. Report và ảnh đầy đủ ở `.ui-review/redesign/`; bản kết quả bàn giao được lưu cùng tài liệu này. Các ảnh có dữ liệu giao dịch/khách hàng là **ảnh dùng fixture kiểm thử**, không phải số liệu thực tế.

- [Hero với Three.js](screenshots/home-webgl.png)
- [Homepage mobile](screenshots/home-390.png)
- [Kết quả tìm kiếm mobile](screenshots/flights-390.png)
- [Câu chuyện văn hóa](screenshots/culture-story.png)
- [Admin desktop](screenshots/admin-1440.png)
- [Admin tối, sidebar thu gọn](screenshots/admin-dark-collapsed.png)
