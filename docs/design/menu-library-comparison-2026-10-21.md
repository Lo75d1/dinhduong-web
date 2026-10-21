# Hai bố cục kho mẫu — 21/10/2026

**Quyết định sau xem thử:** người dùng chọn A. Bản triển khai trong mã nguồn và kiểm tra ở `layout-a-implementation-2026-10-21.md`; các mô tả “cần trước production” dưới đây là ghi nhận lúc dựng hai prototype.

Người dùng chốt dựng hai phương án cùng màn hình, cùng dữ liệu sau khi tham khảo Emil Kowalski,
Impeccable và Taste. Bản này là prototype độc lập, chưa thay trang Admin trên VPS.

## Mở và tái tạo

- `npm run preview:menu-library` tạo `docs/design/previews/kho-mau-a-b.html`.
- Mở HTML bằng trình duyệt, đổi A/B trên thanh so sánh; tìm không dấu, lọc nhánh, chọn đơn vị/mẫu,
  mở ngày, đổi nhóm suất và thử kho trống. Không cần máy chủ, tài khoản hay API.
- Header là đề xuất gọn cho màn Admin, chưa phải RootLayout production. Liên kết thêm qua AI/hướng dẫn
  mở URL thật trong tab mới; vẫn cần phiên Admin trên website.
- Nguồn ở `docs/design/prototypes/`; bundle React và logo SVG được nhúng vào một HTML. Dùng React/esbuild
  hiện có, không thêm dependency. `src/`, API, quyền, engine, DB và migration không thay đổi.

## Cùng dữ liệu, khác cách vào việc

| | A — Danh sách | B — Theo đơn vị |
| --- | --- | --- |
| Câu hỏi đầu tiên | Tôi cần mở mẫu nào? | Đơn vị này có mẫu và bữa gì? |
| Khối chính | Danh sách tên mẫu, đơn vị, ngày/nhóm, bữa, phiên bản | Danh sách đơn vị, chọn mẫu, các ngày và bữa |
| Điện thoại | Hàng mẫu chứa đủ trường, mở chi tiết riêng | Đơn vị chuyển thành select, ngày xếp dọc, bữa trưa/xế cạnh nhau |
| Ưu điểm dự kiến | So sánh nhiều mẫu và tìm theo tên | Gần quy trình trường học/bếp tập thể, nhìn được bộ món theo ngày |
| Đổi lại | Chưa thấy món trước khi mở | Nhiều bước chọn hơn, vùng điều khiển cao hơn trên màn rất hẹp |

Đề xuất B cho tập thể theo đơn vị; A hữu ích khi tìm khắp kho. Đây là nhận định thiết kế,
chưa đo thời gian hoàn thành tác vụ hoặc thử nghiệm người dùng.

### Before / After / Why

| Before | After | Why |
| --- | --- | --- |
| Nhiều vùng màu và thẻ có trọng lượng giống nhau | Một nền trắng, chữ than, xanh trên nhận diện/lối mở, nhãn nháp nhỏ | Dành độ nổi cho dữ liệu và việc cần làm |
| Hướng dẫn/nút lớn xuất hiện trước danh sách | Hướng dẫn gộp một disclosure sau dữ liệu | Đưa mẫu/ngày bữa vào vùng nhìn đầu |
| Chỉ thấy danh sách mẫu chung | Thêm phương án chọn đơn vị và xem ngày/bữa | Kiểm tra cấu trúc hợp công việc bếp tập thể hơn |
| Đổi giao diện chưa có bản so sánh cùng nội dung | Hai cấu trúc dùng chung fixture, màu và phông | Tách đánh giá bố cục khỏi số liệu/nhận diện |

## Dữ liệu minh họa

`menu-library-fixtures.ts` chứa đúng năm mẫu: hai mẫu tiểu học, một mẫu mẫu giáo,
một mẫu doanh nghiệp và một mẫu cá nhân; bốn đơn vị/phạm vi, không phải danh sách khách hàng.
Tổng và nhóm đơn vị tính từ dữ liệu. Tất cả đều draft, chưa có nguồn nhu cầu, Food/Recipe ID,
nguyên liệu hoặc định lượng. Tên món do prototype biên soạn; không phải mẫu được xác nhận dinh dưỡng.
Số suất minh họa 120/null/0 ở các nhóm tiểu học giúp kiểm tra hiển thị; cá nhân là 1 suất.

B dùng bộ món của nhóm đầu trong tổng quan vì fixture có cùng món giữa các nhóm; đã nói rõ
ngay dưới bảng. Khi nối dữ liệu thật phải chọn nhóm hoặc thể hiện rõ món khác nhau giữa nhóm;
không suy rộng món/định lượng của nhóm đầu cho toàn đơn vị.

## Cần trước khi đưa bố cục đã chọn vào production

- API danh sách hiện chưa có unit/day/group summary: bổ sung truy vấn tóm tắt có phân trang và lọc đơn vị tại server,
  giữ các kiểm tra Admin/grant hiện có; không tải hết mọi bản nháp để nhóm tại trình duyệt.
- Chi tiết tiếp tục đọc contract thật và nguyên liệu thật. Giữ null/0, ngày chưa gắn lịch, bữa độc lập,
  nhiều nhóm và lịch sử phiên bản. Không thêm chức năng tính tập thể hoặc xuất đi chợ.
- Nối loading/error/retry và kiểm dữ liệu nhiều trang, mẫu dài, nhóm có bộ món khác nhau.
- Header gọn là đề xuất trong prototype; cần áp dụng có chủ đích và giữ điều hướng hiện có khi triển khai.

## Kiểm tra

- `npm run preview:menu-library`: đạt; HTML mở trực tiếp bằng file://, không gọi mạng/API khi tương tác nội bộ.
- `npx tsc --noEmit` và ESLint ba file TS/JS: đạt (ngoại lệ img có chú thích vì đây là SVG nhúng trong HTML độc lập).
- Chromium thật: **147 kiểm tra** hai bố cục tại 1440/768/390/320px. Tìm không dấu/hoa thường, không có kết quả,
  lọc cá nhân, đổi đơn vị/mẫu, ngày/nhóm, số suất 120/null/0, giữ focus select, quay lại, kho trống,
  trợ giúp và liên kết thật; không lỗi JS, không tràn trang, không request HTTP.
- Ảnh cuối được chụp lại từ đầu trang, bỏ riêng thanh điều khiển so sánh ngoài prototype;
  nhãn dữ liệu minh họa vẫn giữ. Đã mở xem A/B desktop và mobile, bao gồm ảnh sau khi sửa mobile/header.
- Đối chiếu tương phản các cặp chữ/nền chính: 5,13:1–14,05:1; placeholder và nhãn nháp trên nền riêng đều trên 4,5:1.
- Không chạy lại bộ tính/DB suite hay build production vì thay đổi này nằm ở tài liệu/prototype và script tạo file;
  không có mã runtime được sửa. Không kiểm phiên Admin hay giao diện VPS thật trong đợt này.

Ảnh: [A điện thoại](previews/kho-mau-a-390.png), [B điện thoại](previews/kho-mau-b-390.png),
[A desktop](previews/kho-mau-a-1440.png), [B desktop](previews/kho-mau-b-1440.png).

## Nguồn đã đọc và cách áp dụng

Đọc mã/tài liệu công khai, không chạy installer, binary hoặc bộ chấm điểm của tác giả.
Không tuyên bố đã cài skill, chạy inspector riêng hoặc được các nguồn chứng nhận. Các quy tắc
mâu thuẫn với brief (bắt đổi Times, đổi màu, thêm vòng hỏi hoặc tăng số phương án) không áp dụng.
Các thống kê nghiên cứu trong Taste là tuyên bố của tác giả, không được dùng làm bằng chứng
đo lường riêng của 2598. Không sao chép nguyên văn skill vào ứng dụng.

| Nguồn | Phiên bản đã đọc | Phần vận dụng |
| --- | --- | --- |
| [Emil Kowalski / Design Engineering](https://github.com/emilkowalski/skill/blob/2d228630ba1446365f614a108cb8252f1feda202/skills/emil-design-eng/SKILL.md) | `2d228630ba1446365f614a108cb8252f1feda202` | Thao tác lặp nhanh, focus/touch, chuyển động có mục đích; bảng Before/After/Why |
| [Impeccable](https://github.com/pbakaus/impeccable/blob/dad8dbb3aac21ad1fa236c110315ef4abece23e8/plugin/skills/impeccable/SKILL.md) | v4.7.0 · `dad8dbb3aac21ad1fa236c110315ef4abece23e8` · Apache-2.0 | Chế độ Operate, tài liệu craft-floor/operate và nghiên cứu các workflow; ưu tiên tác vụ, giữ brief, kiểm render, ghi bối cảnh vào PRODUCT/DESIGN |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill/blob/6010f91a9935f1c167dfc500fb1a475681892e6b/skills/taste-skill/SKILL.md) và [App screens](https://github.com/Leonxlnx/taste-skill/blob/6010f91a9935f1c167dfc500fb1a475681892e6b/skills/taste-skill/references/app-screens.md) | v2 · `6010f91a9935f1c167dfc500fb1a475681892e6b` | Dữ liệu/công việc trước, app khác landing page, ít phủ màu, không thẻ icon/KPI trang trí; cùng fixture và xem ảnh nhiều cỡ |

Đọc hướng dẫn Next.js 16.4 cài trong dự án về layouts/pages và server/client trước khi viết
prototype. Prototype dùng React/esbuild độc lập nên không thêm route Next hoặc phiên Admin giả.
