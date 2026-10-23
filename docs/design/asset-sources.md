# Tài sản giao diện — 21/10/2026

> Thông tin phông, màu và cách trình bày dưới đây là ghi nhận lịch sử, đã ngừng dùng làm quy tắc AI thiết kế giao diện ngày 23/10/2026. Thông tin nguồn và giấy phép vẫn được giữ cùng các tài sản hiện có.

Bảng màu được điều chỉnh sau phản hồi giao diện quá nhiều xanh: nền trắng ấm,
chữ xám than, xanh ngọc cho nhận diện/thao tác và cam đất nhấn nhẹ.
`--brand=#0F766E`, `--brand-hover=#115E59`, `--ink=#272C33`,
`--background=#F7F6F2`, `--accent=#B85B37`. Token chung trong `src/app/globals.css`; các lớp cũ
được chuyển sang biến trong các tệp liệt kê ở `theme-migrated-files.json`.
Chỉ đổi các chuỗi giá trị màu trong lớp trình bày, không đổi số liệu/engine/API.

## Icon thao tác

- Nhà cung cấp: Lucide Icons và các tác giả, gồm các phần kế thừa Feather.
- Commit nguồn: `c29c276f16590cf017126671535ad8c792be64d8`, đối chiếu bằng Git.
- Nguồn: https://github.com/lucide-icons/lucide/tree/c29c276f16590cf017126671535ad8c792be64d8/icons
- Tệp sử dụng: `src/components/ui/Icon.tsx`;29 hình SVG chọn riêng, giữ hình học
  gốc, màu kế thừa từ CSS. Không nạp toàn bộ bộ icon hoặc icon font bên ngoài.
- Tên nội bộ `circle-help` dùng hình `circle-question-mark.svg`; `trash-2` dùng
  `trash.svg` theo tên của commit đã chọn.
- Giấy phép ISC và MIT phần Feather: `public/brand/lucide-license.txt`, giữ
  nguyên thông báo bản quyền/giấy phép đi kèm. https://lucide.dev/license
- Các icon là trang trí cạnh nhãn; nút chỉ có hình có aria-label/title cụ thể.

## Minh họa

- Tác phẩm: **Healthy food — Pana**, Storyset / Freepik.
- Trang gốc: https://storyset.com/illustration/healthy-food/pana
- SVG gốc: https://stories.freepiklabs.com/storage/71681/Healthy-Food-01.svg
- Điều khoản: https://storyset.com/terms ; tải để sử dụng ngày21/10/2026.
- Ghi công hiển thị: “Food illustrations by Storyset”, liên kết
  https://storyset.com/food ở hình và footer.
- Bản dùng: `public/illustrations/healthy-food-pana.svg`.
- Chỉnh sửa: #FF725E → #0F766E; bỏ hai nhóm background-complete/background-simple.
  Giữ hình bữa ăn/độ sâu, không nhúng chữ giao diện hoặc dữ liệu dinh dưỡng.
- Đã kiểm SVG không chứa script/foreignObject/image/thuộc tính sự kiện/href
  ngoại vi trước khi đưa vào repo; thêm metadata nguồn/ghi công trong SVG.
- SHA256 gốc: `75bdedecd2b2ac4c2ad1a212b77d034859efd0e6f36140966193436a998b90e4`.
- SHA256 bản dùng: `2de60fd15594e436d5639f8b7fb17eab9b2df4b769883ad039392d53ca2f9d9c`.
- Đây là minh họa có giấy phép và ghi công, không phải ảnh thực phẩm nguồn.

## Nhận diện 2598

Các SVG bát/lá trong `public/brand/` được biên soạn cho dự án, không lấy logo
stock. Biểu tượng và chữ thương hiệu được tách rời để icon nhỏ vẫn rõ. Có bản
màu, một màu, trên nền tối, app icon và maskable. Những ảnh JPEG cũ được giữ
trong repo cho lịch sử; bố cục chung/trang chủ mới không dùng chúng làm nhận diện
hoặc nền.

PNG192/512, favicon16/32 và ảnh chia sẻ1200×630 được raster hóa từ SVG bằng
Sharp; nguồn SVG và script tái xuất `scripts/export-brand-assets.mjs` đi kèm.
Các PNG được commit nên build/deploy không cần chạy script này. Không thêm
phụ thuộc trực tiếp mới. Màu manifest/metadata được đồng bộ; PWA Phân loại vẫn
mở `/quan-tri/phan-loai` và giữ chức năng/phạm vi quyền hiện có.
