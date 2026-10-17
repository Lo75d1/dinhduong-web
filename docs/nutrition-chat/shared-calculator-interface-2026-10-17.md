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
- Harness kiểm client tương tác, không phải nghiệm thu VPS, dữ liệu bệnh nhân, backend thật hoặc hội thoại ChatGPT/Claude thật. Build Next riêng ở trên xác nhận biên dịch ứng dụng. Không triển khai production.

## Nhánh

Bản sửa dựa trên `codex/nutrition-chat-api`, vì `main` chưa có luồng API và bản tạm đang được dùng. Tạo PR vào nhánh API để đánh giá đúng phạm vi; không gộp toàn bộ nhánh API vào main trong việc này.
