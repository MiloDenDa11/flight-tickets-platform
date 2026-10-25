# Tài nguyên thiết kế

## Hero

Dùng **imagegen tích hợp** (không dùng CLI/API key) để tạo một ảnh minh họa máy bay không gắn thương hiệu. File dùng bởi dự án:

- `frontend/public/images/premium/hero-flight.png`: bản gốc, 1.933.719 byte.
- `frontend/public/images/premium/hero-flight.jpg`: bản tối ưu dùng trên hero và trang xác thực, 203.816 byte.

Prompt đã sử dụng:

> Use case: ads-marketing. Asset type: premium airline booking website hero photography, wide landscape 16:9. A realistic unbranded white modern twin-engine commercial passenger jet with subtle deep teal tail, flying above magnificent soft billowing clouds at golden sunrise. Camera is slightly above and in front of the airplane, dramatic three-quarter front view, airplane nose pointing toward the lower left, wings fully visible and physically accurate. The aircraft is on the right two thirds of the image; the left third is darker deep ocean blue sky with atmospheric haze and generous negative space for website headline overlay. Premium aviation campaign photography, elegant editorial feeling, rich navy blue upper sky, soft cyan atmosphere, warm champagne light along the wing and cloud edges, beautifully detailed yet calm. No logos, no airline identity, no text, no numbers, no watermarks, no graphics. This is a realistic illustrative scene, not an existing flight.

Ảnh chỉ phục vụ giao diện, không xác thực lịch bay hoặc loại máy bay đang được bán. Bản gốc trong thư mục generated_images của công cụ được giữ nguyên.

## Font

Be Vietnam Pro và Manrope được tải từ Google Fonts, kèm các file SIL OFL. Font CSS trỏ tới WOFF2 local và giữ Unicode ranges tiếng Việt/Latin/Latin mở rộng. Hai bộ font ban đầu khoảng 286 KB; `font-display: swap`.

Lần nâng cấp Premium Global Aviation thêm Playfair Display normal/italic, weight 400–700/400–600, lấy từ Google Fonts, lưu local trong `public/fonts/playfair-*.woff2` (8 file, khoảng 185 KB). `playfair.css` giữ Unicode ranges, gồm subset tiếng Việt; giấy phép tại `playfair-OFL.txt`. URL CSS nguồn: `https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap`. OFL nguồn: `https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/OFL.txt`.

## Địa lý

GeoJSON từ kho Natural Earth chính thức: `https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson`. Bản gốc lưu ở `public/geo/world-land.geojson`, khoảng 138 KB, public domain theo [điều khoản Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/).

Không dùng bản đồ tile trả phí hoặc gọi API bản đồ. Marker sân bay lấy từ backend hiện tại; đường cong là hình minh họa.

## Ảnh điểm đến và hãng bay

Ảnh Việt Nam giữ nguyên file/credits của bản trước. Các ảnh Singapore, Bangkok, Tokyo, Paris, Seoul, London và Dubai được lưu local từ Unsplash; URL nguồn và giấy phép nằm trong `public/images/premium/sources.json` và [trang credits](../public/asset-credits.html). Ba ảnh mới được kiểm tra trực quan trước khi tích hợp; không tạo hoặc ghi giá/lịch bay từ nội dung ảnh.

Nhận diện hãng được lấy từ website chính thức, giữ nguyên asset. `public/brands/manifest.json` ghi URL nguồn, homepage và loại asset. Không có logo phù hợp thì hiển thị mã chữ, không mô phỏng nhãn hiệu bằng SVG tự vẽ. Danh mục không xác nhận quan hệ đối tác.

`public/brands/qr.jpg` là asset Oryx One tải trong lúc khảo sát, được giữ lại và **không dùng trên giao diện**. Nguồn: `https://www.qatarairways.com/content/dam/images/renditions/vertical/brand/oryx-one/v-oryx-one-ife-logo.jpg`. Nhận diện Qatar Airways được giao diện sử dụng là `qr.png`, lấy từ URL logo chính thức trong manifest.
