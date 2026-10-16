# Đủ trường dinh dưỡng trên trang Tính khẩu phần — 17/10/2026

- Người dùng mở chi tiết vi chất nhưng thiếu bảng đầy đủ. Có ba giới hạn: prepare chỉ nạp các trường yêu cầu (thường18); phân tích normalized chỉ kế thừa14 vi chất; bảng chi tiết manual/linked mặc định chọn4 chất ngoài kcal. Excel đã có160 nhưng đường mở trên web chưa tương ứng.
- Source `ff4741dea85f472ff229affd4367727de0b5d994`, tiếp theo `e3177c79eea08467623daf7ea47427fddfcfe6ea` sửa dữ liệu thiếu trên bảng manual. Nhánh `codex/nutrition-chat-api`, PR#4 draft/chưa merge. Triển khai branch theo quyền chủ dự án đã cấp. Không migration/seed/sửa kho hoặc thêm bộ tính.

## Thay đổi và tái sử dụng

- Service prepare nạp toàn bộ registry160 qua repository hiện có; core dùng đúng hàm tổng/nguồn/quy đổi hiện hữu để tổng hợp đủ160 ở khẩu phần/ngày/bữa. `input.fields` vẫn chọn phần hiển thị ngắn cho chat; không dùng nó để cắt mất nguồn của báo cáo web.
- Phân tích normalized có156 chỉ tiêu ngoài kcal/đạm/béo/bột đường đã có bảng riêng. Giữ14 mapping khuyến nghị hiện hữu; những chất khác không tự gán mốc. Mục tiêu thủ công có nguồn dùng lại luồng đánh giá hiện có; không hồ sơ/mục tiêu thì chỉ tính thành phần. Thiếu toàn bộ để—, thiếu một phần≥,0 nguồn giữ0.
- MultiDayAnalysis dùng cùng một bảng tổng hợp, bỏ nhóm vi chất gập thêm ở bên trong. RationDetail/ResolvedRationDetail mặc định đủ160; tái dùng NutrientFieldPicker chung với nút hiện toàn bộ/rút gọn5/chọn từng chất. Bảng cuộn ngang, không ép160cột vào chiều rộng trang hoặc ép tên thành từng chữ.
- Khi thử browser thật phát hiện reducer manual cũ ghi≥0 nếu toàn bộ nguồn thiếu. Sửa giá trị tổng thànhnull trong trường hợp này; số0 có nguồn vẫn giữ0. Không thay engine khuyến nghị manual.
- Tái dùng bộ rút gọn MCP/giới hạn140.000 ký tự; chỉ gửi các chỉ tiêu yêu cầu trong summary khi cần rút gọn, giữ nguyên hướng dẫn/link/đầu vào/duyệt. Web/REST vẫn giữ đủ160. Không tăng giới hạn hoặc thay16tool/gói1.0.11.

## Kiểm tra

- Prisma generate, TypeScript, ESLint10file và diff check đạt. Full suite Nutrition Chat đạt: core86/report37/security89/OAuth261/storage98/HTTP393/library60/workbook/fullreport/review61/clinical53/analysis56/guide97/CalculatorSSR27/native results708. Sau vá manual, chạy lại TypeScript/lint3file, ration-detail/ration-report và native results708 đạt.
- Test mới kiểm tất cả header160/dòng tổng hợp156, yêu cầu chỉ2trường vẫn giữ đầy đủ nguồn/tổng, null/zero/partial, mục tiêu thủ công cho chất bổ sung, nguồn g/ml/suất và service thực sự yêu cầu registry160. Không dùng source thiếu làm0.
- `npm run test:multi-day` cũ còn fail tại `scripts/test-multi-day.ts:29` (`600 !== null`). Test và `multi-day-analysis.ts` không đổi so với baseab7262b; ngoài phạm vi sửa bảng. Không tuyên bố mọi test của repo đạt.
- **HTTPS590 kiểm trên appff4741d**: discovery16tool/góiSHA, token cũ/mới/hai đường truyền, hồ sơ thiếu/đủ/none/manual, link bản nháp/bản tính, nguồn160 so từng trường với get_food, lượng100 tính đúng, null không thành0, XLSX tải được, guard401/403 và account counts không đổi. Lượt đầu có thêm lời gọi REST thứ7 vướng quota6/phút; đổi phép kiểm sang đọc link bản tính bằng luồng sẵn có, giữ nguyên quota.
- **Browser thật trên appff4741d và e3177c7**: mở link vào sẵn Kết quả, mở vi chất156dòng, bảng chi tiết160header, rút gọn5/khôi phục160, bỏ/chọn B12 thành159/160. Bảng manual cuối có164header (160chất+4cột định danh/lượng), nguồn thiếu hiện—, không còn≥0 giả. Viewport điện thoại390×844: phần nội dung375px/scrollWidth375px, bảng cuộn riêng không kéo rộng trang. Ảnh thực tế `evidence/nutrition-chat/full-nutrients-mobile.jpg` (ignored). Không coi đây là nghiệm thu hội thoại ChatGPT/Claude hay toàn bộ chức năng trình duyệt.

## VPS và giới hạn

- Đã đọc trực tiếp VPS trước deploy: checkoutab7262b/app4339c73 healthy, RAM2.972MB/available1.838MB, swap0, đĩa40GB/trống15GB. Build Linux và cả hai app healthy; nguồn chạy cuốie3177c7.
- Backup `/opt/dinhduong-release-backups/nutrition-full-nutrients-20261017-050902-codex` và `/opt/dinhduong-release-backups/nutrition-missing-values-20261017-051244-codex` giữ rollback/cấu hình/checksum. Canonical5bảng/25migration và env/layout/Caddy/Google checksum giữ nguyên, không OOM; timer active/enabled, swap build tắt/xóa.
- Đợt kiểm đạt đã dọn token/XLSX và các bản thử trừ bản browser được giữ đến sau QA rồi xóa đúng khóa. Một bản kỹ thuật của lượt thử quota trước đó hết hạn theo TTL30phút/timer sẵn có. Không xóa bản của người dùng.
- Kho có160 trường không có nghĩa mọi thực phẩm đủ160 giá trị. Giữ riêng Đồng VDD/RNI, Vitamin A RAE/RE/RNI; hai trường nhãn/đơn vị chưa xác minh vẫn source-only, không gộp hoặc đoán số. Bản tạm còn hạn được nạp lại nguồn đầy đủ khi mở lại; link hết hạn cần tạo lại.
