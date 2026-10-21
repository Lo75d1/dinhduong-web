# Triển khai giao diện và nhận diện — 21/10/2026

Người dùng đã chốt phương án xanh ngọc–trắng trong kế hoạch
`layout-icons-colors-plan.md`. Mã nguồn nằm ở PR#9, nhánh
`codex/ui-navigation-refresh`, tiếp nối `8def63c`. Cập nhật: bản84dec6c đã lên
VPS theo log người dùng; tám kiểm tra HTTPS công khai/khách đạt. Đợt chỉnh màu
trung tính tiếp theo ở `neutral-ui-2026-10-21.md`, chưa đưa lên VPS.

## Kết quả

- Token dùng chung cho nền, chữ, nút chính, trạng thái chọn và viền; 95 tệp
  trình bày chuyển các màu cũ sang biến CSS. Trong đó 78 tệp chỉ đổi lớp màu;
  17 tệp có thêm thay đổi bố cục/icon. Giữ Times New Roman/Times/serif.
- Trang chủ đặt tìm thực phẩm trước, ba lối vào bộ tính/món ăn/AI, minh họa
  cạnh nội dung trên desktop; điện thoại ưu tiên ô nhập và nút. Nguồn/hỗ trợ
  nằm trong một khung trắng thu gọn, số lượng vẫn lấy từ máy chủ.
- Header dùng logo bát/lá mới, icon có nhãn, trạng thái trang hiện tại và
  menu di động. Thanh riêng của bộ tính vẫn dùng vị trí hiện có.
- Bộ tính giữ hai bước Nhập/Kết quả, cây bữa–món desktop rộng280–340px để
  dành chỗ cho bảng nguyên liệu. Điện thoại chuyển danh sách/chi tiết. Thanh
  trợ giúp trắng thu gọn; các thao tác bữa/món, hồ sơ, lọc, thuốc và AI dùng
  SVG thay một số ký hiệu phụ thuộc font.
- Tra cứu đưa tìm/lọc sát đầu trang; nguồn dữ liệu thu gọn. Admin giữ ba
  nhóm công việc, kho mẫu và cấp quyền theo bố cục đã làm, đồng bộ màu/icon.
- 28 SVG Lucide chọn lọc, nguồn/commit/giấy phép kèm repo. Storyset Healthy
  food — Pana đã đổi màu, bỏ nền phụ và ghi công ở hình/footer.
- Bộ logo có màu/một màu/nền tối; favicon16/32, app192/512, maskable riêng,
  ảnh chia sẻ1200×630. Có SVG gốc và script tái xuất PNG.

Nguồn, điều kiện sử dụng và SHA256 minh họa: `asset-sources.md`.
Danh sách tệp chuyển token: `theme-migrated-files.json`.

## Kiểm tra

| Phạm vi | Kết quả | Giới hạn |
| --- | --- | --- |
| Next production build / TypeScript | Đạt | Môi trường cục bộ |
| Nutrition Chat runner | Cả19 script đạt | Fixture/PGlite, chưa hội thoại nền tảng thật |
| Kho mẫu |153 kiểm tra đọc/nguồn/quyền +100 kiểm tra ghi đạt | Fixture/PGlite, không ghi dữ liệu thật |
| Chromium trang chủ/điều hướng/tài khoản |89 kiểm tra đạt ở1440/768/390/320px | Component thật; dữ liệu, pathname, phiên và QR fixture |
| Chromium nhập/kết quả khẩu phần |32 kiểm tra đạt ở1440/768/390/320px | Sửa100→150g,360→540kcal theo thực phẩm fixture; trợ giúp, modal, chuyển pane/ngày |
| Chromium Admin |73 kiểm tra đạt ở1440/390px | API fixture: nhóm/form, cấp/thu hồi, lọc mẫu, ngày/bữa/nhóm, clipboard, role |
| Next HTTP production cục bộ |68 kiểm tra đạt | Assets/MIME/kích thước PNG, metadata/manifest, SSR hướng dẫn/bộ tính,401/307 Admin |
| Tái xuất tài sản | Script Sharp chạy thành công | Đã xem logo/OG và ảnh giao diện desktop/mobile |
| ESLint các tệp sửa | Một lỗi có sẵn, bảy warning có sẵn | Lỗi set-state-in-effect ở Nhật ký lỗi đã tái hiện trên HEAD cũ; phần này chỉ đổi màu |

Đã kiểm không tràn ngang toàn trang và không lỗi JS ở các phiên browser trên.
Bảng nhiều cột được cuộn trong vùng riêng. Đã xem ảnh thật do Chromium chụp,
không dùng ảnh thiết kế để thay kết quả kiểm trình duyệt.

Assertion SSR bộ tính được cập nhật theo H1/khung nhập/hành động thật thay cho
một dòng trang trí đã bỏ; giữ27 kiểm tra. Không sửa test để bỏ qua sai số tính.

## Phạm vi và triển khai tiếp

Không đổi engine, API, Prisma, nguồn dinh dưỡng hoặc quyền. Đợt UI không thêm
migration; nhánh kế thừa Admin API vẫn cần migration đã ghi ở
`../menu-library/implementation.md` nếu VPS chưa áp. Không chạy migration trên
VPS trong phiên này.

Các trang sâu nhận màu chung nhưng chưa được thử từng tương tác. Chưa đo thời
gian tìm thao tác với người dùng thật, chưa kết luận nhanh hơn hoặc chứng nhận
WCAG toàn website. Khi nghiệm thu, dùng năm tác vụ và cách ghi số lần nhầm/thời
gian trong kế hoạch. Không coi icon hoặc màu mới là bằng chứng về hiệu quả.
