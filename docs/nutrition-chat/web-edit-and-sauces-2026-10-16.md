# Bản tạm sửa trên web và nước chấm — 16/10/2026

## Yêu cầu đã chốt

- Món luộc/hấp cần làm rõ nước chấm phù hợp và lượng thực dùng, tra nguồn và đưa vào phép tính. Với hỏi ghi24giờ chỉ ghi thứ thực sự đã ăn; không tự thêm nước chấm vào lịch sử. Tránh cộng trùng gia vị đã nằm trong công thức. Mọi số AI tự đề xuất tiếp tục có dấu `*`, không tự bịa thành phần dinh dưỡng.
- Đầu vào ban đầu và kết quả phải có link mở trên hệ thống để sửa/tính lại. Chủ dự án xác nhận link dùng được cả khi không đăng nhập: bản tạm có thời hạn; muốn giữ lâu dài mới lưu tài khoản. Excel giữ làm lựa chọn tải thêm, không phải bước bắt buộc để tính hoặc xem kết quả.

## Tái dùng và phạm vi

- Tái dùng `prepareNutritionMenu`/`confirmedNutritionMenu`, bộ tính và nguồn hiện tại, `NutritionMenuInput`/`NutritionMenuAnalysis`, biểu mẫu `ReuseSavedMenu`, `LibraryIngredientPicker`, limiter PostgreSQL, vùng file tạm riêng và lịch bảo trì15phút. Luồng lưu lâu dài vẫn dùng Ration/API save hiện có.
- Không thêm model/bảng/migration/engine hoặc tài khoản ngầm. Không sửa kho Food/Dish/nguyên liệu/mã chế độ ăn/khuyến nghị, không seed hoặc thay công thức dinh dưỡng và bố cục Excel.
- Thêm trang `/ket-noi-ai/ban-tam`, API POST `/api/nutrition/v1/web-menu` để mở link và GET/POST `/api/nutrition/v1/web-menu/[id]` để đọc/chuẩn bị/tính/xuất đúng bản. Endpoint bản tạm không cho lưu Ration hoặc đọc thư viện/bản riêng của tài khoản.
- `prepare_menu`/`calculate_menu`/`export_workbook` trả thêm `webUrl`, `webExpiresAt`, `webStorage=temporary`. MCP rút gọn vẫn giữ link/hướng dẫn. Prepare là bản nháp; calculate/export là bản đã tính. Tool annotations phản ánh prepare/calculate có tạo bản tạm.
- Mở trang thấy đầy đủ đầu vào/nguồn/phân tích, sửa ngày/bữa/món/lượng/suất và chọn thêm món/thực phẩm từ kho chung. Xem trước, xác nhận rồi **Tính lại và mở bản cập nhật**. Mỗi lần tính tạo bản mới; link cũ giữ đầu vào cũ để đối chiếu. **Tải thêm Excel** dùng bộ xuất hiện có.
- Muốn lưu lâu dài: đăng nhập/đăng ký trong tab mới để giữ chỉnh sửa; chuẩn bị bản bằng identity tài khoản, duyệt lại rồi lưu. Không dùng confirmationToken của phiên tạm để lưu theo tài khoản. Tại bản tạm, bộ chọn chỉ hiển thị kho chung, không gọi thư viện riêng.
- Hướng dẫn món luộc/hấp nằm trong nguồn hướng dẫn dùng chung. Workflow, danh sách công cụ, QR/TXT, hai skill, tham chiếu và ZIP đồng bộ phiên bản cuối **1.0.8**, vẫn16tool. Rà và sửa câu cũ khiến chat hiểu phải lưu tài khoản mới có link web. Người dùng cần Refresh/Scan Tools hoặc cập nhật gói để nhận bản hướng dẫn mới; không tự publish hoặc thay kết nối đã cài.

## Hạn dùng và quyền mở bản

- Đầu vào chuẩn hóa giữ riêng tối đa30phút để mở link; đây là thay đổi so với luồng cũ chỉ tính không giữ đầu vào. Không gắn owner/account/OAuth token trong file snapshot. Link hết hiệu lực sau30phút; file được dọn khi tạo bản mới hoặc đợt bảo trì15phút tiếp theo, không hứa xóa vật lý đúng giây hết hạn.
- Link chứa khóa ngẫu nhiên256bit trong fragment, không đưa khóa vào HTTP query/path hay referrer. Khi mở, trang đổi khóa lấy cookie riêng từng bản (`HttpOnly`, `Secure`, `SameSite=Strict`, giới hạn path), gỡ fragment và để ID không bí mật trên thanh địa chỉ. Refresh dùng cookie; ID đơn lẻ hoặc cookie của bản khác không mở được. Nút **Sao chép link bản tạm** trả link đầy đủ để mở ở trình duyệt khác.
- Ai có link đầy đủ có thể mở đúng nội dung bản đó trong hạn, không có quyền với bản khác hoặc tài khoản. Trang có thông báo rõ điều này, noindex/nofollow/no-referrer, API no-store. Không đặt Bearer/OAuth token tài khoản trong URL.
- POST yêu cầu Origin chính xác; đầu vào/action có allowlist, cookie và TTL được kiểm phía máy chủ. Đọc bản luôn tra lại nguồn và báo `sourceChanged`; tính/xuất phải prepare và xác nhận đúng identity/input mới. Cookie không gia hạn hạn dùng cũ.
- Hạn mức tạo global120/giờ và principal30/giờ; snapshot≤512KiB, vùng tạm≤256file/128MiB. Đọc/tính/xuất có quota riêng tái dùng limiter atomic. Docker chuẩn bị thư mục0700/UID1001, file0600. Với volume đã có, tạo thư mục bằng UID1001 trước khi maintenance chạm đến.

## Kiểm chứng

- Full suite Nutrition Chat đạt: core67/report37/security89/OAuth261/storage98/HTTP347/personal library60/review51/clinical49/guide89 và các bài workbook/parser/báo cáo đầy đủ. Prisma generate, TypeScript, ESLint các file sửa và diff check đạt. Sau rà câu chữ1.0.8, TypeScript/lint/guide89 chạy lại đạt; fixture SSR bổ sung đủ kiểu `NutritionFood` rồi TypeScript sạch.
- React SSR10: biểu mẫu bản tạm không bắt đăng nhập, Excel tùy chọn, lối chuẩn bị/lưu tài khoản và login tab mới, kho chung và trang ban đầu không chứa đầu vào riêng. CUA inventory không có browser kết nối; chưa kiểm click/hydration/mobile/clipboard hoặc hội thoại ChatGPT/Claude thật. Không coi HTTP/SSR là bằng chứng nghiệm thu AI.
- Đọc VPS trước triển khai: checkoutf886418/app7d3ecf1 healthy, RAM2972MB, nguồn5bảng/25migration/cấu hình được ghi lại thực tế. App **b054b47f931fbae9f655c779f48ff98863786e70** build Linux/healthy; image maintenance cũng build lại để timer có code dọn web-menus, chạy cleanup1batch có `webMenus`. Không chạy migrate deploy vì không có migration mới.
- **HTTPS99**,10client assets: workflow1.0.7/16tool, hướng dẫn nước chấm và link, ZIP khớp SHA; mở guest, tra cơm/nước mắm từ nguồn thật, prepare có link bản nháp, exchange và cookie đúng, refresh được. Sửa cơm100→150g, tính ra đúng năng lượng từ hai Food hiện tại, mở link cập nhật150g, link cũ vẫn100g. ID không cookie/cookie bản khác/Origin ngoài bị chặn; action save bị chặn. Bản tạm không chứa token/owner, file0600. Excel thật1.550.729byte tải200; đổi hạn của chính snapshot thử sang quá hạn rồi xác nhận410.
- Account/User/web Session/Ration/OAuth client/token count không đổi sau kiểm HTTPS. Các snapshot/token/Excel của chính đợt thử đã dọn theo khóa đã biết, không xóa dữ liệu khác. Count/digest5bảng nguồn/25migration và SHA env/layout/Caddy/Google khớp trước/sau; timer active/enabled, app không OOM, swap0. Không kết luận nguyên nhân sự cố VPS trước đây.
- Bản rà câu chữ cuối app **ea26cdf9a4db65fe05afea3ba68b1666f94f20b9** build Linux/healthy, **HTTPS smoke20** đạt: workflow1.0.8, persistence/link30phút/nước chấm, trang kết nối bỏ câu phải lưu mới dùng web, TXT/metadata/trang ban đầu, bốn gói khớp SHA, skill Excel và quyền thư mục0700/UID1001. Nguồn/cấu hình giữ nguyên, timer active/enabled, không OOM/swap. Backup đầu `/opt/dinhduong-release-backups/nutrition-web-editor-20261016-174930-codex`; backup câu chữ `/opt/dinhduong-release-backups/nutrition-web-editor-copy-20261016-175632-codex`. Maintenance image giữ sourceb054b47 vì đợt cuối chỉ sửa hướng dẫn; code dọn bản tạm đã có và chạy đạt.
- Nhánh `codex/nutrition-chat-api`, PR#4 vẫn draft/chưa merge main; deploy theo quyền trực tiếp chủ dự án đã cấp trong hội thoại. Checkout gốc `web` giữ nguyên.

## Tham chiếu kỹ thuật

- [Fetch Standard — Origin](https://fetch.spec.whatwg.org/#origin-header): fetch mặc định chế độ CORS giữ Origin khi POST cùng nguồn dù no-referrer; API vẫn bắt Origin chính xác. Không nới ngoại lệ Origin null cho endpoint bản tạm. Kiểm chứng bằng HTTP phía trên không thay thế thử thực tế trình duyệt.
