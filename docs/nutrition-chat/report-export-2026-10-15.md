# Thống nhất báo cáo Excel — 15/10/2026

## Phạm vi theo yêu cầu

- Báo cáo Excel của hội thoại và web dùng chung mẫu `.xlsx`, dạng bảng hành chính đơn giản. Hoàn thiện bộ dữ liệu quản trị đang xuất thiếu cột; ưu tiên món có sẵn trong hướng dẫn hội thoại.
- Tái dùng Food/Dish, metadata chất, `resolveMenu`, ExcelJS, parser nhập lại, rate limit và khóa PostgreSQL hiện có. Không thêm bảng, migration, seed hoặc ghi vào kho Food/Dish. Không đổi cơ chế OAuth/tài khoản hoặc bộ xuất Word.
- Báo cáo tổng hợp đủ trường nhưng không bịa giá trị thiếu. Phân biệt 0/thiếu/tổng một phần; không so mốc khi thành phần chưa đủ. Hai trường nguồn cần xác minh được giữ để đối soát, không tự quy đổi/cộng.

## Thay đổi và tái dùng

- `nutrient-fields.ts`: metadata có kiểm tra phủ toàn bộ 162 trường dinh dưỡng Float của Food (không tính tỷ lệ thải bỏ): 160 tính được + 2 nguồn chưa xác minh. Không đổi dữ liệu hay đơn vị trong DB.
- `workbook.ts`/`workbook-report.ts`: mẫu báo cáo chung; kết quả lưu sẵn và công thức sống; bảng nhập dự phòng gộp/ẩn, bảng không có mốc có lời giải thích. Cập nhật đi chợ khi chọn Food ID khác. Giữ thuốc/TPBS một ngày và nhóm thực phẩm/đơn vị ăn.
- `workbook-reader.ts`: nhập được nguồn tự nhập ở các cột sau giới hạn 40 chất cũ; chỉ đọc ô đầu vào, vẫn từ chối công thức/macro/liên kết ngoài và giữ xác nhận lại nguồn sửa. Các workbook v1 vẫn nhập được.
- Hai nút một/nhiều ngày gọi `/api/nutrition-report/export` cùng builder của chat. Public calculator vẫn dùng được khi chưa đăng nhập; POST kiểm nguồn chính xác, schema/độ dài, rate limit và khóa xuất dùng chung. Không phát hành token, không lưu khẩu phần khi chỉ tải file.
- `menu-analysis-workbook.ts` và route quản trị: truy vấn/xuất đủ trường nguồn, sửa kiểu trình bày; ghi rõ khung nhập trống là mẫu nhập mới. Khi hơn 1.000 bản ghi, dùng writer ghi từng dòng và cùng khóa xuất PostgreSQL; tránh giữ cả 41k dòng nguyên liệu trong các đối tượng ô. Fixture 3.719 Food/7.369 Dish/41.457 nguyên liệu + đủ chất: 3.160.784 byte, 7,4 giây, peak RSS 315 MiB (Windows Node; chưa phải đo VPS). Mẫu nhập không biến chất thiếu thành 0 và không tự đổi g/ml.
- Hướng dẫn `get_workflow`, tool metadata, QR/text và skill có quy tắc món trước: RNI dùng Dish/get_dish; VDD món hoàn chỉnh dùng Food type MA. Không tự suy ra công thức nguyên liệu cho món VDD.

## Kiểm chứng local

- `prisma generate`, TypeScript và production build Next 16.4.0 đạt.
- Nutrition Chat: core67/report37/security89/OAuth261/storage82/HTTP173; workbook cũ và bộ báo cáo đầy đủ đạt. HTTP mới kiểm cả route báo cáo web, chống origin khác và thuộc tính ngoài schema; fixture không chứng minh lock nhiều process thật.
- `test:nutrition-complete`: phủ đủ trường, vi chất bổ sung, 0/null, dữ liệu thiếu, phiên nhập lại giữ trường hội thoại, sửa nguồn sau cột 55 cần xác nhận, placeholder web và quy đổi, chặn workbook vượt ngân sách trước khi dựng ô.
- Excel desktop thật (`scripts/verify-nutrition-complete-report-excel.ps1`): 23 kiểm tra đạt, gồm chỉ số kho 241 vượt vùng tự nhập, tổng/trung bình/tỷ lệ, vitamin D, số 0, đổi lượng/suất, đổi sang Food ID chưa dùng, cảnh báo thiếu thải bỏ, tên chất đối chiếu và quét lỗi công thức trên mọi sheet; xuất A4 của 6 bảng đạt. Báo cáo chính 3 trang, thực đơn 1 trang; phụ lục đầy đủ 11, theo ngày 20, nguồn 2, nhóm thực phẩm 1 trang ở fixture hai ngày. Đây là dữ liệu giả lập, không phải hồ sơ người dùng.
- ESLint các file mới/sửa đạt, trừ lỗi có sẵn `react-hooks/set-state-in-effect` tại dòng tải `kitchenMode` của MultiDayAnalysis; đoạn này không sửa. Kiểm riêng file đó khi tắt đúng rule cũ không có lỗi mới. Không tuyên bố toàn repo hết nợ lint cũ.
- Trình duyệt local mở được nhưng truy vấn Food/Dish bị P1000 do credential DB local cũ; không sửa/copy secret. Kiểm tương tác tải thật phải làm trên VPS sau build.

## Giới hạn rõ ràng

### Lỗi nguồn làm Excel tính lại thành trống

- Nghiệm thu bằng file thật của VPS phát hiện Food nằm tại vị trí 241 trong danh mục, trong khi vùng nguồn tự nhập chỉ có 20 hàng. `AND` của Excel vẫn tính `INDEX` nguồn tự nhập dù dòng đang dùng kho; lỗi `#REF!` ở cảnh báo/quy đổi kéo theo tổng trống. Giá trị lưu sẵn lúc tải đúng nên kiểm tra ZIP/cached result đơn thuần không phát hiện được.
- Đã đặt `IF` chọn loại nguồn trước mọi `INDEX` phần tự nhập tại hai công thức liên quan. Fixture chính bổ sung 240 Food đệm để kiểm tra trường hợp chỉ số kho vượt vùng tự nhập; Excel desktop kiểm lại cả tổng, vi chất, số 0, đổi gram/suất, nguồn theo phần và quét lỗi công thức.
- File đã tải từ bản cũ không tự đổi công thức; cần xuất lại. Các ô nhập của file cũ vẫn đọc lại được qua bước xem trước nếu cần giữ số người dùng đã sửa.

- API vẫn chọn tối đa 40 chất cho hội thoại; export tự bổ sung 160 chất. Những cột chưa có số nguồn vẫn ghi thiếu. Mục tiêu dùng các mapping đã có; không tự gán mốc cho chất chưa có nguồn/mapping phù hợp.
- Sửa lượng/suất/mã/mục tiêu tự tính offline. Thêm/bớt số dòng/ngày cần xuất lại để phạm vi bản in chi tiết cập nhật; file có thông báo riêng khi cấu trúc này thay đổi. Nhóm tự nhập mới cũng có cảnh báo phạm vi nhóm.
- Ngân sách trước dựng ô, 5 MB nén/64 MB giải nén và một tác vụ xuất đồng thời giúp giới hạn tải trên VPS 2 GB. Kỳ lớn có thể phải chia đợt; không cam kết xuất 90 ngày × 1.000 dòng × đủ trường trong mọi trường hợp.
- Thay đổi này chưa chứng minh ChatGPT thật đã chọn món đúng ở hội thoại tiếp theo. Cần Refresh công cụ hoặc hội thoại mới để nhận mô tả mới; không sửa lịch sử hội thoại của người dùng.

## Nghiệm thu VPS

- Bộ xuất đã vá tại source `2aa88d3`, app Linux/Next 16.4.0 được đóng gói lại với plugin/skill mới ở `656646cdd1ab0b74ddb862435334063ad671e821` và chạy healthy tại `/opt/dinhduong`, nhánh `codex/nutrition-chat-api`; chưa merge main. Không chạy migration/seed. Backup trước vá: `/opt/dinhduong-release-backups/nutrition-report-fix-20261015-095501-codex`; backup lần đóng gói cuối: `/opt/dinhduong-release-backups/nutrition-report-package-20261015-100246-codex`. Ba tệp plugin/skill/hướng dẫn tải qua HTTPS khớp SHA256SUMS của repo.
- HTTPS trước bản vá công thức (cùng route/guard): xuất 1/7 ngày thành công, kiểm Origin/schema, chiếm khóa PostgreSQL thật trả 503 + Retry-After, quota trả 429. Bộ kiểm cuối 17 checks; số probe quota thay đổi theo ranh giới phút. Export đầy đủ quản trị: 6 checks anonymous 401/CLINICIAN 403/ADMIN 200, content type/no-store/ZIP. Fixture user/session đã dọn, truy vấn cuối 0/0.
- Tải thật bằng nút Excel trên web sau bản vá `2aa88d3`, cả một và hai ngày. Excel desktop mở file hai ngày tải thật: tổng 396, bình quân 198; đổi lượng 100 → 200 g thì tổng 594, bình quân 297, ngày đầu 396; quét mọi sheet không lỗi công thức. Báo cáo chính in A4 3 trang, thực đơn 1 trang. Bộ kiểm file thật gồm 10 checks, cùng đối chiếu file quản trị đầy đủ và tính khung nhập từ Food ID thật. File một ngày kiểm riêng 2 phép đối chiếu: 198 → 396 kcal sau sửa lượng 100 → 200 g, đạt.
- File quản trị: Food 3.719 dòng/170 cột (8 mô tả + 162 nguồn), Dish 7.369, nguyên liệu 41.457; kiểm đủ hàng cuối và các cột vi chất/nguồn cần đối soát. 4.878.288 byte trong 15,95 giây. Fixture streaming tương đương được mở trong Excel desktop, 12 checks đạt.
- RAM cgroup peak ở app bản vá `2aa88d3` sau hai lượt tải UI: 652.419.072 byte (~622 MiB); không OOM, `/api/health` 200, timer bảo trì enabled/active, swap build đã gỡ. Lần đo 1/7 ngày ở bản tối ưu trước đó peak ~786 MiB; đây là các ca kiểm cụ thể, không phải cam kết tải tối đa/concurrent users. Lần đóng gói asset cuối `656646c` cũng healthy/không OOM, cấu hình và digest nguồn khớp; không lặp lại tải Excel vì không đổi code bộ xuất.
- Count/digest canonical trước/sau khớp bằng cùng truy vấn `row_to_json` xếp id: Food 3.719 / `e276f0ba439a43219f523fc70b9a309d`; Dish 7.369 / `b47e289aaf51d33bd0fe51449ba19eba`; nguyên liệu 41.457 / `336c41b1755b694b348d461ad8c1cbb1`. SHA env/layout/Caddy/file Google khớp bản backup; giữ nguyên nav/cấu hình riêng của VPS.
- Hướng dẫn ưu tiên Dish và Food loại MA đã cập nhật; không coi phép thử export là bằng chứng ChatGPT/Claude/Gemini thật đã lập món đúng. File cũ cần xuất lại để có công thức đã vá.
