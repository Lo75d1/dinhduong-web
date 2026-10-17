# Giao diện Tính khẩu phần dùng chung — 17/10/2026

Người tự nhập tại `/tinh-khau-phan`, mở bản từ ChatGPT/Claude hoặc mở bản lưu tài khoản cần cùng bố cục và cách thao tác. Bản từ chat một ngày trước đây luôn dùng báo cáo nhiều ngày, dù cây bữa/món đã dùng chung.

## Thay đổi

- Tách `CalculatorLayout` thành tiêu đề, khung nhập, tiêu đề kết quả và bố cục báo cáo một ngày dùng chung: 1. Hồ sơ & khuyến nghị; 2. Khẩu phần & phân tích; 3. Chi tiết Bữa → Món → Thực phẩm.
- Tách thẻ tổng ngày, g/kg và tổng bữa thành `DailyNutritionSummary`; cả nhập tay và bản từ hội thoại dùng cùng component. Bản theo nguồn đọc tổng chuẩn từ server, giữ null/0/≥, 160 chỉ tiêu, ml/suất và phần chưa biết. Không chuyển bản chuẩn thành Row chỉ có gram, không tính lại sống/chín hoặc khối lượng riêng.
- Bản từ chat một ngày dùng bố cục một ngày; bản nhiều ngày tiếp tục dùng `MultiDayAnalysis`. Giữ mục tiêu, bảng vi chất, P/L/G, lưu ý nguồn, mã bệnh lý, WHO, quy đổi và đi chợ. Thanh xác nhận/tính/xuất/lưu được đưa vào thanh thao tác của báo cáo qua portal; editor giữ nguyên state khi chuyển bước.
- Dùng chung thanh chọn Khẩu phần 24h/Lập thực đơn và `PersonalProfile`. Hồ sơ được truyền theo bản đang mở, có thể sửa rồi chuẩn bị lại, không đọc/ghi hồ sơ hoặc mã bệnh lý của bản nhập tay trong localStorage. Đối chiếu theo hồ sơ, chỉ thành phần hoặc mục tiêu có sẵn là lựa chọn rõ ràng; không tự đổi chế độ so sánh.
- Sửa đầu vào vẫn hủy xác nhận/kết quả cũ. Tính, xuất hoặc lưu tiếp tục cần chuẩn bị và xác nhận theo luồng hiện có. Không thêm ID làm việc, đồng bộ chat hai chiều, API, engine, migration hoặc thay quyền.
- Thanh bước xếp rộng trên điện thoại; ẩn dòng trang trí gây đè tiêu đề nhỏ. Giữ phông Times New Roman và cây bữa/món/khung nguyên liệu dùng chung.

## Kiểm chứng

- `npm run build`, `npx tsc --noEmit`, ESLint các file đổi và `git diff --check`: đạt. `MealInput` giữ bốn warning có sẵn (ba img, một hàm chưa dùng).
- `npm run test:nutrition-chat`: đạt toàn bộ runner, gồm các fixture core/report/OAuth/storage/HTTP/library/Excel/review/clinical/guide và React SSR. Thêm `test-calculator-shared-interface.tsx`: 31 kiểm bố cục một ngày, tổng nguồn, ml/suất, null/zero/partial và hồ sơ controlled. Các kiểm link27, tài khoản46 và kết quả nguồn708 tiếp tục đạt.
- `test-ration`, `test-ration-detail`, `test-ration-report`: đạt khi chạy `node --import tsx`. CLI tsx cần Unix socket không được môi trường này hỗ trợ; dùng Node import loader để chạy cùng test.
- `test-multi-day.ts` cũ lỗi `600 !== null` tại dòng29. Đã chạy lại trên worktree sạch ở commit gốc `a572085f3407d85da4e0510a5df99ff73ac1a565`, cùng lỗi trước thay đổi. Không sửa engine hoặc bài kiểm cũ trong việc này.
- Chromium/Playwright chạy component thật trong harness cục bộ, API và thực phẩm giả lập: desktop1440×1000 và mobile390×844, 15 kiểm mỗi kích thước. So ba mục báo cáo của nhập tay/bản chat; mở/sửa hồ sơ60→61; giữ localStorage nhập tay777; chuẩn bị giữ ml và hồ sơ sửa; hủy checkbox sau sửa; xác nhận/tính và bỏ nhãn nháp; các nút bản lưu tài khoản còn thấy; không lỗi runtime của ứng dụng hoặc tràn ngang toàn trang. Có xem ảnh chụp bố cục, bảng nguyên liệu cuộn riêng trên điện thoại.
- Harness kiểm client tương tác, không phải nghiệm thu VPS, dữ liệu bệnh nhân, backend thật hoặc hội thoại ChatGPT/Claude thật. Build Next riêng ở trên xác nhận biên dịch ứng dụng. Tại commit `ccdd4a4`, chưa triển khai production; kết quả triển khai bổ sung bên dưới.

## Nhánh

Bản sửa dựa trên `codex/nutrition-chat-api`, vì `main` chưa có luồng API và bản tạm đang được dùng. Tạo PR vào nhánh API để đánh giá đúng phạm vi; không gộp toàn bộ nhánh API vào main trong việc này.

## Triển khai và nghiệm thu VPS bổ sung — 17/10/2026

- Chủ dự án yêu cầu trực tiếp triển khai PR#5. Kiểm chỉ đọc trước khi cập nhật: VPS `/opt/dinhduong` đang ở nhánh API/source `a572085f3407d85da4e0510a5df99ff73ac1a565`, app healthy; chỉ có override Caddy/layout và tệp xác minh Google đã biết. RAM available1696MiB, swap0, ổ đĩa còn14GiB. Giữ nguyên các override và `.env.production` theo checksum.
- Chuyển checkout sang đúng nhánh PR#5, nguồn `ccdd4a41eb032a65f7a2956458eb324e8e44a4ea`; không merge main/nhánh API. Backup image/cấu hình/checksum trước build tại `/opt/dinhduong-release-backups/nutrition-shared-calculator-20261017-075858-codex`. Build app Linux thành công; không migration/seed. Maintenance hiện có kiểm chạy thành công.
- Chạy lại Prisma generate, TypeScript, ESLint các file thay đổi (0 lỗi,4 warning có sẵn tại MealInput), toàn bộ `test:nutrition-chat`, ba test ration/detail/report và diff check: đạt. Các bộ hiện hành gồm core86/report37/security89/OAuth261/storage98/HTTP393/library60/review61/clinical53/analysis56/guide97/native708/link27/shared31/saved-ration57/account46 và workbook/full-report.
- HTTPS55 kiểm trên website:11 assets mới, khung nhập/báo cáo chung, trang riêng không lộ đầu vào trong HTML, metadata riêng tư, guide1.0.11, phiên khách30phút, một/hai ngày, đủ160 trường tổng dù đầu vào yêu cầu một trường, phép tính đúng Food nguồn và tài khoản khách vẫn401. Kiểm account/session/Ration/thư viện/OAuth count không đổi. Hai lượt đầu của script kiểm tra nhầm payload MCP đã rút gọn là payload REST đầy đủ, nên script lỗi TypeError; sửa script sang REST đầy đủ rồi đạt. Không sửa API để vượt kiểm tra.
- Browser thật trên VPS, dữ liệu kỹ thuật riêng: mở link nháp tại `/tinh-khau-phan`, thấy ba mục báo cáo một ngày/160 chỉ tiêu; mở hồ sơ chung và sửa tuổi45→46/cân nặng60→61; đổi món và lượng100→150g; xem trước cập nhật38→57kcal từ nguồn38kcal/100g. Checkbox xác nhận bị hủy khi sửa; xác nhận rồi tính lại mở link mới, bỏ nhãn nháp. Tải lại đúng link vẫn giữ46tuổi/61kg/150g/57kcal. Không tạo tài khoản hay bản Ration để thử.
- QA mobile390×844 phát hiện `sr-only` ở đầu cột thao tác của `MenuDraftEditor` thoát khỏi phần cuộn: scrollWidth537 so clientWidth375. Commit `64a42a9bc34a9eee6ac8d3423f44742a33ede2c2` chỉ thêm `relative` vào wrapper bảng, theo cách đã dùng ở PersonalLibrary. Lint/diff/TypeScript đạt; build lại tại `/opt/dinhduong-release-backups/nutrition-shared-calculator-mobile-20261017-080259-codex`. Browser nạp lại bundle mới, khung nhập và kết quả đều375/375px, bảng cuộn riêng và giữ150g. Đây là lệch nhỏ thêm một file so với PR ban đầu, cần thiết để hoàn tất QA triển khai.
- Nguồn app cuối **64a42a9**, healthy/OOMfalse; timer active/enabled, swap tạm build đã tắt và xóa. Cấu hình khớp checksum. Canonical giữ nguyên: foods3719/dishes7369/ingredients41457/diet_codes246/recommendations72 và25 migration; digest cả5bảng khớp trước/sau. Không sửa engine, contract, quyền, package hoặc dữ liệu nguồn.
- Dọn7 snapshot thử và2 phiên biết khóa; xóa file credential/context kỹ thuật khỏi container/backup/máy local. Một phiên khách của lượt script đầu không giữ được khóa, chờ TTL gốc30phút và timer hiện có; không tài khoản/quyền lâu dài. Bản cuối không chứa dữ liệu người bệnh. Không coi việc kiểm web/API là nghiệm thu hội thoại ChatGPT/Claude thật; không chạy tải tối đa. Lỗi `test-multi-day.ts`600!==null đã xác nhận có ở commit nền, không thay engine trong việc này.
- Ảnh thật (ignored evidence): `evidence/nutrition-chat/shared-calculator-vps-desktop.png`, `shared-calculator-vps-mobile.png`, `shared-calculator-vps-mobile-entry.png`. PR#5 còn draft, chưa merge. Commit bàn giao chỉ cập nhật tài liệu; image đang chạy giữ nguồn64a42a9.
