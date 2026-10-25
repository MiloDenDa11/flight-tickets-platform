# Aviation Command Center

## Chạy và truy cập

Trang quản trị: `http://localhost:5174/admin`. Đăng nhập bằng tài khoản ADMIN hiện có; migration không thay đổi tài khoản hoặc mật khẩu. Backend giữ cổng 3001, frontend 5174, PostgreSQL 5434, Redis 6381.

Với database đã tồn tại:

```powershell
npm run db:migrate
npm run dev
```

Không cần reset hoặc seed lại dữ liệu. Hai migration bổ sung `20261025000100_admin_operations` và `20261025000200_provider_inventory_ceiling` giữ nguyên dữ liệu nghiệp vụ; bổ sung metadata hãng, nguồn lịch/trạng thái, lịch sử giá, thời điểm hoàn tiền, nhật ký quản trị và trạng thái đồng bộ. Giá cũ được ghi nhận lần đầu tại thời điểm migration, không gán lịch sử trong quá khứ. Metadata thời gian của các hãng cũ bắt đầu khi migration bổ sung trường. Seed mới cũng chỉ ghi mốc đầu tiên cho giá chưa có quan sát và giữ nguyên mật khẩu, giá và đơn đã tồn tại.

## Các không gian quản trị

| Đường dẫn | Dữ liệu và thao tác |
| --- | --- |
| `/admin` | KPI, doanh thu, chặng vé đã bán, lịch khởi hành, phân bố hành trình và hãng |
| `/admin/flights` | Tìm/lọc/sắp xếp/phân trang server; lịch công bố và trạng thái khai thác riêng; CRUD giá/lịch nội bộ theo quyền cũ |
| `/admin/fares` | Lịch sử quan sát theo chuyến, hạng, hãng, ngày bay, số khách và khoảng ngày ghi nhận |
| `/admin/bookings` | Lọc đơn, thanh toán, khách, chuyến; xem liên hệ có audit; xuất CSV đã che định danh |
| `/admin/customers` | Liên hệ đã che, quyền, trạng thái, số đơn; giữ chặn tự khóa/đổi quyền và thu hồi phiên |
| `/admin/airlines` | Tên, IATA, quốc gia, logo, website, màu, trạng thái; xác nhận thao tác và chặn xóa hãng có chuyến |
| `/admin/revenue` | Thực thu, hoàn, thuần, bình quân, phân bổ theo hãng, giao dịch và CSV |
| `/admin/settings` | Kiểm tra PostgreSQL/Redis, chế độ thanh toán, cấu hình nguồn, đồng bộ, giao diện sáng/tối |
| `/admin/activity` | Nhật ký thao tác quan trọng, xem liên hệ và xuất dữ liệu |
| `/admin/airports`, `/admin/reviews` | Giữ thao tác sân bay và kiểm duyệt đánh giá hiện có |

Sidebar quản trị tách khỏi layout khách hàng. `/admin/users` vẫn tương thích và mở danh sách khách hàng/tài khoản. Giao diện quản trị được tải bằng lazy import. Chế độ tối chỉ áp dụng trong admin; giảm chuyển động theo hệ điều hành. Header tìm chuyến theo đúng ID và ngày khởi hành, tìm đơn hoặc hãng; thông báo dựa trên cấu hình và kết quả đồng bộ thật.

Các bảng chính phân trang ở server, tối đa 100 dòng/trang. Sân bay/đánh giá giữ API danh mục trước đây; đánh giá vẫn giới hạn 200 bản ghi. Polling 30 giây khi tab hiển thị cho dashboard, chuyến, đơn, lịch sử giá và nhật ký; không gọi chồng request. Polling database không phải luồng radar hoặc xác nhận dữ liệu đối tác mới. Nút tải lại giữ bộ lọc. Trạng thái tải/lỗi/thử lại/trống đều có giao diện riêng.

## Định nghĩa số liệu

- Ngày và tuần báo cáo dùng `Asia/Ho_Chi_Minh` (UTC+7); tuần bắt đầu thứ hai. Ngày kết thúc bao gồm cả ngày, truy vấn dùng mốc cuối loại trừ của ngày tiếp theo. Khoảng chọn tối đa 366 ngày.
- Chuyến trong kỳ theo ngày khởi hành. Số đơn/trạng thái theo ngày tạo đơn. Lịch khởi hành lấy chuyến sắp tới trong kỳ đang chọn, cùng bộ lọc hãng, sân bay và khu vực. Hãng hoạt động lấy trạng thái danh mục. Các số này có căn cứ thời gian khác nhau và được ghi trên giao diện.
- **Thực thu** cộng `Payment.amount` của giao dịch đã thu (`PAID` hoặc đã thu rồi `REFUNDED`), theo `paidAt`. Không cộng đơn chưa trả tiền; một giao dịch được tính một lần.
- **Hoàn** dùng `refundedAt`, độc lập thời điểm thu. Luồng hủy/hoàn hiện có được giữ và ghi thêm thời điểm hoàn mới. Một kỳ có thể có thuần âm nếu khoản thu ở kỳ trước được hoàn trong kỳ này.
- **Thuần = thực thu − hoàn**. Khoản hoàn cũ thiếu `refundedAt` được đánh dấu chờ đối soát; không tự gán ngày hoàn và không hiển thị thuần khi có khoản có thể thuộc kỳ chưa đối soát. Khoản thu sau ngày kết thúc kỳ không làm phát sinh hoàn trước thời điểm thu.
- Phân bổ đơn nhiều chặng/khác hãng dựa trên `BookingSegment.unitPrice` đã chốt, dùng số nguyên BigInt và phần dư lớn nhất để giữ đúng từng VND. Bộ lọc hãng/hành trình chỉ cộng phần tương ứng. Vé đã bán là số hành khách × số chặng đã thanh toán, gồm vé được hoàn sau đó; không phải số đơn và không tự trừ vé khỏi tổng lịch sử bán.
- Giá vé bình quân = thực thu / số chặng vé đã bán. Bình quân đơn = thực thu / số giao dịch có thu. Tỷ lệ so kỳ trước chỉ xuất hiện khi kỳ trước có doanh thu/vé lớn hơn 0; không tạo phần trăm từ mốc 0.
- Nền tảng hiện ràng buộc **VND** tại database; bộ lọc ngoại tệ bị từ chối (422). Không quy đổi hoặc cộng nhiều đồng tiền. Thanh toán hiện chỉ có MOCK; tắt MOCK chưa tạo ra một cổng thanh toán thật.
- Biểu đồ doanh thu chỉ ghi các ngày đã diễn ra; không vẽ điểm 0 dự báo trong tương lai. Các khoản thu/hoàn chưa phát sinh trong ngày đã diễn ra có giá trị 0. Lịch bay tương lai vẫn là lịch công bố có nguồn.

## Lịch sử giá

Trang tổng quan cũng có tỷ lệ chuyến nội địa/quốc tế lấy từ bộ lọc hiện tại và một biểu đồ giá phổ thông của tối đa 5 chuyến theo dõi. Nhãn nêu rõ phạm vi quan sát, không coi đó là giá toàn thị trường. Liên kết mở phân tích chi tiết giữ bộ lọc và hạng phổ thông đang xem.

`FareObservation` là các quan sát chỉ thêm mới trong ứng dụng. Giá hiện tại lấy từ `FlightFare`; giá trước lấy quan sát gần nhất trước lần cập nhật hiện tại. Giá thấp nhất/bình quân dựa trên các quan sát trong kỳ, không phải dự báo hoặc trung bình toàn thị trường.

Chưa chọn một giá: biểu đồ tổng hợp các giá trên trang hiện tại và ghi rõ phạm vi. Chọn một dòng: phân tích đúng fare/chuyến/hạng đó. Ngày bay là bộ lọc riêng; khoảng từ/đến ngày áp dụng cho thời điểm quan sát. Một mốc không tạo xu hướng; ngày không có quan sát không được nội suy. Mỗi cập nhật giá nội bộ và mỗi bản ghi đối tác mới hơn tạo một quan sát. Dữ liệu cũ hoặc cùng timestamp không tạo bản ghi trùng. Trung bình là trung bình các lần quan sát, không phải giá bình quân theo thời gian.

## Bảo vệ dữ liệu

Mọi `/api/v1/admin/*` đi qua JWT và quyền ADMIN tại backend, bao gồm xuất CSV, upload và đồng bộ. Không chỉ kiểm tra vai trò ở giao diện.

API danh sách, chi tiết, API cũ và CSV loại `documentNumber` gốc cùng ngày sinh khỏi DTO admin; chỉ trả `maskedCitizenId`, giữ ba chữ số cuối (ví dụ `*********901`). Các API đặt vé của chính ADMIN cũng che số giấy tờ trong phản hồi. Hợp đồng phản hồi của khách USER khi xem đơn của chính mình được giữ. Không có chức năng xem lại CCCD đầy đủ. Danh sách khách/đơn che email và điện thoại; chỉ mở liên hệ đầy đủ tại chi tiết đơn có audit.

Audit chỉ ghi actor, hành động, đối tượng và metadata đã chọn; không ghi CCCD, body hành khách, từ khóa tìm kiếm hoặc khóa API. Tắt log SQL thô của Prisma vì lỗi database có thể chứa hàng dữ liệu; HTTP handler giữ lỗi đã xử lý và chỉ log tên lỗi ngoài dự kiến.

CSV có UTF-8 BOM, quote/escape ô và trung hòa giá trị có thể trở thành công thức. Xuất booking tối đa 10.000 đơn phù hợp; báo cáo tối đa 50.000 giao dịch, vượt giới hạn trả 413 để thu hẹp kỳ. Dữ liệu định danh đã che trước khi tạo tệp; doanh thu chỉ lấy trường phục vụ đối soát.

Logo upload nhận PNG/JPEG/WebP tối đa 2 MB, kiểm tra magic bytes, đặt tên theo SHA-256 và phục vụ từ `/api/v1/media/airline-logos/:hash.ext`; không nhận SVG upload. Có thể dùng URL HTTPS tới logo chính thức hoặc asset `/brands/` đã có. Màu, tỷ lệ và artwork chính thức được giữ. Ảnh tải từ domain khác không gửi referrer; URL logo backend được giải theo API origin khi tách domain. Thư mục `backend/uploads/` được ignore; cần lưu trữ bền vững hoặc dùng URL HTTPS khi triển khai trên máy chủ có filesystem tạm.

## Kết nối nguồn đối tác

Hiện chưa cấu hình nhà cung cấp. Không có dữ liệu hãng/GDS thật, scraper, radar, giả lập đồng bộ thành công hoặc giả lập lịch sử giá trong database ứng dụng. Adapter JSON HTTP chuẩn bị sẵn, không cam kết tương thích trực tiếp với mọi vendor; API thực tế cần map về hợp đồng dưới đây. Chỉ kết nối nguồn có quyền sử dụng dữ liệu.

Biến trong `backend/.env` (không commit key):

```dotenv
FLIGHT_PROVIDER_NAME=PARTNER_FEED
FLIGHT_SCHEDULE_URL=https://api.example.com/schedule
FLIGHT_STATUS_URL=https://api.example.com/status
FLIGHT_FARES_URL=https://api.example.com/fares
FLIGHT_PROVIDER_API_KEY=
FLIGHT_PROVIDER_TIMEOUT_MS=10000
FLIGHT_SYNC_ENABLED=false
FLIGHT_SYNC_INTERVAL_SECONDS=300
```

Mỗi nguồn cấu hình độc lập. `configured` chỉ có nghĩa đã đặt endpoint; `lastSuccessAt` và kết quả chạy cho biết đã xử lý nguồn. Token Bearer chỉ đặt ở server, không trả URL/token ra client. Endpoint bắt buộc HTTPS, không có URL credentials; HTTP localhost chỉ dành cho test. Không theo redirect. Timeout 1–20 giây, tối đa ba lần với lỗi kết nối/5xx; 4xx không retry mù. HTTP 429 dùng thời điểm cho phép lại trong database, chặn cả manual và scheduler trong lúc chờ. Payload giới hạn 5 MB khi đọc stream và tối đa 10.000 bản ghi.

Response là một array hoặc `{ "data": [...] }`. Các ví dụ dưới đây minh họa hợp đồng, không phải dữ liệu được đưa vào hệ thống:

```json
{
  "externalId": "stable-provider-flight-id",
  "airlineCode": "VN",
  "flightNumber": "VN246",
  "origin": "SGN",
  "destination": "HAN",
  "departureTime": "2026-11-01T08:00:00+07:00",
  "arrivalTime": "2026-11-01T10:10:00+07:00",
  "aircraft": "Airbus A321"
}
```

```json
{
  "externalFlightId": "stable-provider-flight-id",
  "status": "DELAYED",
  "observedAt": "2026-10-25T12:00:00+07:00",
  "actualDepartureTime": null,
  "actualArrivalTime": null
}
```

Trạng thái nhận: `ON_TIME`, `DELAYED`, `DEPARTED`, `LANDED`, `CANCELLED`, `DIVERTED`. Không suy ra từ `SCHEDULED`. Trạng thái khai thác hủy/đã bay/chuyển hướng được chặn tại tìm kiếm/đặt/thanh toán, không tự thay đổi trạng thái đơn hay hoàn tiền của người dùng.

```json
{
  "externalFlightId": "stable-provider-flight-id",
  "cabinClass": "ECONOMY",
  "basePrice": 1200000,
  "tax": 385000,
  "currency": "VND",
  "availableSeats": 42,
  "baggageKg": 20,
  "cabinBaggageKg": 7,
  "refundable": true,
  "observedAt": "2026-10-25T12:00:00+07:00"
}
```

Hạng: `ECONOMY`, `PREMIUM`, `BUSINESS`. Airline/airport phải có trong danh mục trước. Khóa chuyến là provider + externalId. Không ghi đè chuyến nội bộ trùng số hiệu/thời gian và không tự gán lại danh tính/hãng/hành trình của externalId đã nhận. Bản ghi sai/bị thiếu tham chiếu bị bỏ qua có đếm; toàn bộ bản ghi không hợp lệ trả thất bại, không tạo dấu thành công. Timestamp trạng thái/giá cũ không ghi đè bản mới.

Giá và lịch từ nguồn được khóa sửa tay ở UI lẫn API. `providerAvailableSeats` giữ trần khả dụng đối tác riêng; trừ giữ/đặt cục bộ và bảo toàn trong transaction, kể cả khi trần nguồn giảm dưới số ghế đang giữ. Hủy/hết hạn không mở lại vượt trần đã biết. Đây vẫn là tồn ghế và vé demo cục bộ, **không thực hiện giữ chỗ hoặc xuất vé trong hệ thống hãng/GDS**.

Scheduler kiểm tra mỗi 30 giây, chạy theo interval cấu hình (60–86.400 giây) và chỉ khi `FLIGHT_SYNC_ENABLED=true`. Chạy tuần tự lịch → trạng thái → giá. Lease database và heartbeat chặn chạy chồng; lượt bị gián đoạn được ghi nhận ở lần chạy sau. Manual `POST /admin/sync/:kind` nhận job bằng 202, UI theo dõi tiến trình qua polling; giới hạn sáu yêu cầu/15 phút/tài khoản. Kết quả lưu số đã xử lý/bỏ qua, lỗi an toàn và thời điểm. Cấu hình interval phù hợp giới hạn/quyền của nhà cung cấp.

## API bổ sung

Tất cả dưới `/api/v1/admin`, giữ endpoint cũ tương thích:

```text
GET  /analytics/overview
GET  /monitoring
GET  /fares/history
GET  /booking-management
GET  /booking-management/export.csv
GET  /bookings/:uuid
GET  /customers
GET  /airline-catalog
POST /airlines/logo
PATCH /airlines/:id/status
GET  /revenue
GET  /revenue/export.csv
GET  /activity
GET  /search?q=...
GET  /settings
GET  /sync/status
POST /sync/:kind
```

Query chung: `start`, `end`, `airlineId`, `origin`, `destination`, `region=ALL|DOMESTIC|INTERNATIONAL`, `page`, `pageSize`, `sort=asc|desc`. Nội địa là hai sân bay thuộc Việt Nam; quốc tế gồm hành trình có ít nhất một sân bay ngoài Việt Nam. `group=DAY|WEEK|MONTH` cho biểu đồ; `currency=VND`. Flight có `flightId`, `q`, `status`, `order=DATE|FLIGHT`; booking có `customerId`, `q`, trạng thái đơn/thanh toán, `order=DATE|AMOUNT`; fare có `fareId`, `departureDate`, `cabinClass`, `passengers`. Danh mục khách/hãng không bị lọc ngầm theo thời gian; ngày báo cáo chỉ hiện ở trang áp dụng.

## Kiểm thử

```powershell
npm test
npm run test:integration
npm run build
```

Integration dùng schema `flight_platform_test` và Redis DB 15, không seed/reset `public`; có chặn chạy nhầm schema. Bao phủ JWT/ADMIN, DTO/CSV che CCCD, quyền sở hữu, phân bổ nhiều hãng, múi giờ, hoàn theo ngày, VND, quan sát giá, CRUD/logo, provider HTTP/retry/429/lease/read-only/queued job và trần tồn ghế. Bộ đặt vé cũ tiếp tục kiểm tra cạnh tranh ghế, idempotency, giữ chỗ hết hạn, thanh toán, hủy/hoàn và snapshot điều kiện vé.

Ảnh và kiểm tra trình duyệt trong quá trình bàn giao dùng schema QA riêng `flight_admin_ui_test`, dữ liệu minh họa có chủ đích và chặn mutation ở browser/server audit. Chúng không phải doanh thu hoặc lịch sử thật của ứng dụng. Không đưa fixture QA vào seed chính.
