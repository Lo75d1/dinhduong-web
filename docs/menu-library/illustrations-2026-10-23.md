# Ảnh minh hoạ bữa ăn — 23/10/2026

Mỗi khẩu phần của một bữa có một ảnh minh hoạ riêng. Trong **Chỉnh bữa / Chỉnh khẩu phần**, tải hoặc kéo một ảnh vào khung, ghi mô tả, chọn nguồn ảnh rồi bấm **Lưu thay đổi**. Ảnh xuất hiện trong xem nhanh và phiếu thực đơn của đúng ngày, bữa và nhóm ăn. Ảnh AI có chú thích riêng. Thay/bỏ ảnh là chỉnh tham chiếu của phiên bản mới; ảnh cũ vẫn phục vụ lịch sử.

## Kết nối AI

- Công cụ mới: `upload_admin_menu_image({base64, alt, sourceKind, requestKey})`. Nhận base64 thuần của ảnh tĩnh JPG/PNG/WebP, tối đa 5 MB, không nhận URL/đường dẫn. Cần Admin và ủy quyền ghi của đúng phiên OAuth. Mô tả tối đa 300 ký tự; sourceKind là `ai` hoặc `manual`.
- Công cụ trả `illustration: {assetId, alt, sourceKind}`, URL, kích thước thực và trạng thái gửi lại. Gắn đối tượng này vào `days[].meals[].groupPortions[].illustration`, sau đó gọi `save_admin_menu_template` theo revision hiện hành. Tải ảnh thành công chưa tự thay đổi thực đơn.
- AI tạo ảnh bằng công cụ tạo ảnh của nền tảng, thể hiện đúng món/kết cấu/đối tượng của bữa đã chốt rồi tải tệp kết quả lên. Website này không gọi thêm dịch vụ tạo ảnh. Nếu nền tảng chưa có công cụ mới sau deploy, làm mới danh mục công cụ; giữ nguyên kết nối và ủy quyền hiện có.
- REST `POST /api/admin/menu-library/images`: multipart có đúng `file/alt/sourceKind/requestKey`, hoặc JSON như công cụ. Bearer dùng cùng quyền OAuth; cookie Admin cần Origin hợp lệ và `x-menu-library-csrf`. Cả MCP và REST bridge `/api/admin/menu-library/tools` nhận payload ảnh lớn; các công cụ khác vẫn giữ giới hạn JSON 512 KB.

## Lưu trữ và dữ liệu

- Tệp được giải mã bằng Sharp, giới hạn 25 triệu điểm ảnh, chỉ nhận JPG/PNG/WebP tĩnh, bỏ EXIF và mã hoá lại WebP tối đa 1600 × 1200. Không phục vụ tệp gốc, HTML/SVG hoặc tải nội dung từ URL bên ngoài.
- URL ảnh là công khai để dùng khi trình bày thực đơn. Không tải ảnh hoặc mô tả chứa thông tin định danh người bệnh. Ảnh minh hoạ không phải ảnh đối chứng bếp và không phải căn cứ suy lượng/thành phần dinh dưỡng.
- Tệp ảnh và metadata nằm trong `/app/var/menu-library-images` ở Docker; Compose gắn named volume `menu_library_images`, runner UID 1001 sở hữu thư mục. Không cần Supabase hoặc migration mới. Ngoài Docker, mặc định là `/var/lib/dinhduong/menu-library-images`; có thể đặt `MENU_LIBRARY_IMAGE_DIR` tới thư mục bền vững mà tiến trình có quyền ghi. Dữ liệu ảnh lúc chạy được loại khỏi bước truy vết nguồn để không đóng gói cả dự án vào image.
- Mã thao tác chống trùng theo Admin/requestKey. Cùng khóa với nội dung khác bị 409. Ghi có audit và khóa PostgreSQL dùng chung giữa worker, kiểm tra lại ủy quyền trong transaction. Mỗi Admin tối đa 100 lượt tải/ngày, quota tổng 512 MB; hết dung lượng báo rõ, giữ ảnh đã có. Thử lại giữ nguyên requestKey.
- Nháp lưu tham chiếu, không chứa base64. Khi lưu, máy chủ kiểm tra ảnh tồn tại và nguồn khớp. Sao chép/chuyển bữa giữ ảnh của đúng khẩu phần. Bỏ ảnh không xoá tệp đang được lịch sử hoặc mẫu khác sử dụng.
- Sao lưu cả database và volume `menu_library_images`. Cập nhật container giữ volume; không dùng `docker compose down -v` khi triển khai.

## Kiểm tra

- `npm run test:menu-library-images`: 37 kiểm tra route/SQL/tệp ảnh thật và 20 kiểm tra DOM. Bao gồm quyền/CSRF/OAuth đọc-ghi, payload MCP vượt 512 KB, multipart/JSON, ảnh lỗi, giải mã lại, gửi lại/xung đột, quota, đúng nhóm, lưu phiên bản, sao chép và giữ ảnh lịch sử.
- Hồi quy: manager 61 API/SQL + 53 DOM; ghi/CSRF/OAuth 287; nguồn/hướng dẫn/quyền 165; HTTP REST/MCP 461. TypeScript và ESLint tệp thay đổi đạt.
- Đây là fixture PostgreSQL/PGlite và tệp tạm, không ghi kho thật hoặc gọi nền tảng tạo ảnh. Chưa nghiệm thu ảnh responsive trên trình duyệt/thiết bị thật, chưa deploy VPS. Kết quả build ghi trong PROJECT_STATUS.md.

## Triển khai

Sau khi kiểm tra bản dựng và cập nhật đúng nhánh, `docker compose build app` rồi `docker compose up -d --no-deps --wait --wait-timeout 180 app`. Volume ảnh mới tự được tạo với quyền từ image; không cần tạo bucket hoặc seed database. Xác minh health, tải một ảnh thử, lưu bữa, mở lại và kiểm tra URL ảnh từ thiết bị khác. Làm mới danh mục công cụ AI để nhận `upload_admin_menu_image`.
