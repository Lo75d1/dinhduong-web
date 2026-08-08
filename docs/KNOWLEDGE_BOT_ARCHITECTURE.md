# Bot tổng hợp Tri thức Dinh dưỡng

## Mục tiêu

Trang `/tri-thuc-dinh-duong` là lớp tìm kiếm thống nhất cho nghiên cứu khoa học,
văn bản pháp luật, hướng dẫn chuyên môn và tin từ cơ quan chính thống. Mỗi bản ghi
phải giữ được nguồn gốc, ngày công bố, loại tài liệu và cách tạo tóm tắt.

## Phần đã chạy trong bản hiện tại

- Tìm nghiên cứu mới theo thời gian thực bằng Europe PMC REST API.
- Chuyển một số từ khóa tiếng Việt thường dùng sang truy vấn khoa học tiếng Anh.
- Lọc theo loại tài liệu và tìm trong danh mục văn bản/hướng dẫn đã biên tập.
- Tóm tắt tiếng Việt từng abstract bằng Gemini khi người dùng yêu cầu; prompt cấm
  bịa số liệu, biến tương quan thành nhân quả hoặc đưa khuyến cáo điều trị cá nhân.
- API đọc `/api/knowledge/search?q=...&type=...` để tái sử dụng trong ứng dụng khác.

## Các repo/thành phần nên dùng cho giai đoạn thu thập tự động

| Thành phần | Vai trò | Khi nào cần |
| --- | --- | --- |
| Trafilatura | Tách nội dung chính, metadata từ HTML/RSS/sitemap | Thu thập bài từ các trang cho phép |
| Crawlee | Điều phối crawler TypeScript, hàng đợi URL, retry | Khi có nhiều nguồn web |
| GROBID | Chuyển PDF nghiên cứu thành TEI/XML, lấy DOI và tài liệu tham khảo | Khi cần đọc toàn văn PDF |
| pgvector | Tìm kiếm ngữ nghĩa và tìm kiếm lai ngay trong PostgreSQL | Khi kho có hàng chục nghìn tài liệu |
| OpenAlex + Crossref | Bổ sung metadata, DOI, trích dẫn và quan hệ tác giả | Làm giàu dữ liệu khoa học |

Không ghép nguyên một “repo chatbot” vào website. Các thành phần trên có nhiệm vụ
riêng, dễ kiểm tra nguồn và thay thế độc lập.

## Pipeline đề xuất cho bản kế tiếp

1. Bộ lập lịch gọi API/RSS và chỉ crawler các tên miền trong danh sách cho phép.
2. Chuẩn hóa URL, DOI, ngày công bố, cơ quan ban hành và loại tài liệu.
3. Khử trùng lặp theo DOI, số hiệu văn bản và URL chuẩn.
4. Lưu bản gốc/đoạn trích, dấu vân tay nội dung và lịch sử thay đổi.
5. Tóm tắt theo schema: câu hỏi, kết quả chính, giới hạn, đối tượng áp dụng.
6. Kiểm duyệt trước khi công khai văn bản pháp luật/hướng dẫn quan trọng.
7. Lập chỉ mục tìm kiếm toàn văn + vector; kết quả luôn kèm liên kết gốc.

## Quy tắc bắt buộc

- Không nói “đã tìm hết Internet”; chỉ công bố danh sách nguồn đã kết nối.
- Không dùng bài báo phổ thông làm căn cứ điều trị.
- Không tự suy ra hiệu lực pháp lý; phải đối chiếu Cổng Pháp luật quốc gia hoặc
  cơ quan ban hành.
- Không lưu toàn văn có bản quyền nếu giấy phép không cho phép.
- Tóm tắt AI phải có nhãn, nguồn, phiên bản model và thời điểm tạo.
- Kết quả dành cho tham khảo, không thay thế bác sĩ/dinh dưỡng viên.

