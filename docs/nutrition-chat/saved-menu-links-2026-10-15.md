# Link Excel và tái sử dụng thực đơn theo tài khoản — 15/10/2026

## Phạm vi và tái dùng

- Tên thực phẩm trong Excel mở trang tra cứu Food hiện có. Bản đã lưu có link mở riêng theo tài khoản; lưu thêm đầu vào thực đơn khi xuất và dùng lại qua chat/web, không cần tải file lên cho luồng này.
- Tái dùng `Ration.conversationJson`, save/open/list, khóa owner/quota/idempotency, prepare/confirm và builder/parser Excel. Không thêm bảng, migration, seed; không sửa Food/Dish/nguyên liệu chuẩn. Giữ bản gốc khi lưu bản dùng lại, không ghi đè âm thầm.
- Tài khoản đăng nhập trên web mặc định chọn lưu thêm; có thể bỏ chọn để chỉ tải. Guest vẫn tải được và có lối đăng nhập để lưu. API `saveToAccount=true` yêu cầu phiên/quyền lưu, không tự fallback thành đã lưu khi thiếu quyền.
- Chat có cờ tùy chọn tương tự; false/không truyền giữ xuất cũ, true kiểm thêm `nutrition:write`. Hướng dẫn nêu rõ việc lưu và tôn trọng lựa chọn chỉ tải; không tự mở rộng OAuth scope. Retry dùng khóa `export-<digest>` theo chủ sở hữu để không tạo bản trùng.
- `savedMenuUrl`/`ration.url` là link ID, không chứa token hoặc quyền truy cập. Link download Excel có hạn 10 phút vẫn giữ riêng. Bản lưu yêu cầu đúng tài khoản; lối đăng nhập giữ đường dẫn quay lại đúng bản.
- Tài khoản có link tới danh sách cả bản web/chat. Trang bản lưu hỗ trợ đổi tên/ngày/lượng/số suất, prepare/xem trước/chốt rồi lưu bản dùng lại. Chat mở bằng `get_saved_menu`. Nhập Excel thu gọn thành dự phòng cho thay đổi đã sửa riêng trên máy.

## Link và an toàn nhập lại

- `Du lieu` và `Nguon doi soat` liên kết tới `/thuc-pham/<id>`. Đầu báo cáo/thực đơn/nguồn liên kết tới `/ket-noi-ai/ban-luu/<id>` khi có bản lưu. Hai loại link mở dữ liệu trên web, không tự đồng bộ hoặc tải số mới vào công thức offline.
- Parser chỉ chấp nhận relationship loại hyperlink đọc, đúng public origin và hai kiểu path nói trên, ID hợp lệ; không query/fragment/credential. Không chấp nhận attribute trùng hoặc relationship dữ liệu/công thức ngoài workbook. Macro, URL khác và công thức ô nhập vẫn bị chặn.
- Link và saved ID trong file không cấp quyền ghi. Khi nhập, chỉ đọc các ô đầu vào, tính lại từ kho và xem trước/chốt; không dùng cache hoặc Food sheet đã bị sửa làm số liệu chuẩn.

## Kiểm chứng đã đạt

- Prisma generate/TypeScript, lint các file thay đổi (trừ lỗi kitchenMode có sẵn ở MultiDayAnalysis, kiểm riêng không có lỗi mới), Linux/Next build. Hồi quy: core67/report37/security89/OAuth261/storage82/HTTP187, workbook cũ/báo cáo đầy đủ. HTTP mới kiểm scope write, export-only, 401/404 owner, schema boolean, URL và lưu một lần khi retry trong PGlite; phase test tách quota riêng để không lẫn ca chức năng với hạn mức.
- Excel desktop fixture: 23 checks; toàn bộ công thức và A4 giữ đúng. File thật từ web, REST export và nút UI: 19 checks native, 3.719 hyperlink thực phẩm/file, link bản lưu không token, 198 → 396 kcal sau sửa lượng; quét mọi sheet không lỗi. Bản in chính 3 trang A4.
- VPS HTTPS: 22 checks lưu + xuất 2 lần cùng một bản chỉ tạo 1 Ration; owner mở được, anonymous401, owner khác404; dùng lại lượng 150 g thành 297 kcal và giữ bản gốc 100 g; REST export trả cùng savedMenuUrl, tải được file và link Food200. Native Excel SaveAs rồi nhập lại thật: 200/198 kcal, 2 checks; link không trở thành quyền ghi.
- Browser thật: đăng nhập tài khoản kiểm thử; “Lưu và tải Excel” hiện checkbox mặc định và link bản lưu; tải file, mở đúng bản; đổi 100 → 200 g, preview396 kcal, xác nhận/lưu rồi mở link bản mới396. Mở từ tài khoản tới danh sách thấy đủ các bản kiểm thử.
- Bộ xuất ở source `35af394`; phần ưu tiên bản lưu/câu chữ ở `21c2ab1`; quay lại đúng link sau đăng nhập ở app `151ec6b` healthy. Đã thử logout, mở link, đăng nhập lại và quay về đúng bản198 kcal. Tải lại ở app cuối giữ cùng saved ID, không sinh bản trùng; native Excel 19 checks đạt trên file tải cuối.
- Tool metadata HTTPS có đủ 11 công cụ, khai báo cờ boolean, workflow mới; ba tệp plugin/skill/hướng dẫn tải về khớp SHA256SUMS. Import thu gọn mặc định đóng, có lối mở bản lưu làm luồng chính.
- Đã xóa đúng 4 Ration/2 phiên còn lại/2 user kiểm thử, truy vấn cuối user/session/menu 0/0/0; các bản gốc100 g và dùng lại150/200 g được đối chiếu trước dọn. Tệp credential kiểm thử trên VPS/máy local đã xóa.
- Canonical Food3.719/Dish7.369/nguyên liệu41.457 giữ nguyên digest `e276f0ba439a43219f523fc70b9a309d` / `b47e289aaf51d33bd0fe51449ba19eba` / `336c41b1755b694b348d461ad8c1cbb1`. Env/layout/Caddy/file Google khớp backup, timer active/enabled, swap build đã gỡ, không OOM. Peak của lượt thử bộ xuất/import ở app35af394: 884.674.560 byte (~844 MiB), không phải thử tải tối đa. Backup app cuối: `/opt/dinhduong-release-backups/nutrition-report-links-login-20261015-121006-codex`. Nhánh chưa merge main; không chạy migration/seed.

## Giới hạn

- Sửa file Excel trên máy không tự đổi bản trong tài khoản. Chỉ nhập lại khi cần đưa những chỉnh sửa đó về hệ thống; file cũ cần xuất lại để có hyperlink mới.
- Bản lưu giữ đầu vào thực đơn, hồ sơ/mục tiêu và nguồn theo snapshot hiện có. Thông tin trình bày báo cáo/thuốc riêng trên web chưa được thêm vào snapshot Ration; không hứa xuất lại bản lưu sẽ giữ toàn bộ các trường này.
- Form dùng lại hiện đổi tên/ngày/lượng/suất; thay thực phẩm/công thức hoặc đổi cơ sở quy đổi thực hiện trong chat/công cụ nhập hiện có rồi xem trước và chốt. Không tự suy công thức mới.
- Chưa kiểm độc lập ChatGPT/Claude/Gemini thật gọi cờ mới hoặc đọc bản lưu trong hội thoại; cần làm mới công cụ và cấp quyền lưu nếu đang thiếu. Hạn mức 200 bản/25 MB tài khoản và giới hạn Excel hiện có giữ nguyên; chưa nghiệm thu tải tối đa.
