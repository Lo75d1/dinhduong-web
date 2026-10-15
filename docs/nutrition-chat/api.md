# Contract Nutrition Chat v1

- MCP: `POST /api/nutrition/v1/mcp`, JSON-RPC 2.0 trên HTTP. OAuth theo resource metadata, đăng ký động và PKCE; token phải đúng issuer/resource/scope và tài khoản.
- Source of truth: `src/lib/nutrition-chat/contracts.ts`, `validation.ts`, `tools.ts`, `protocol.ts`. Không copy thêm một schema độc lập vào plugin; `get_workflow` và tools/list trả schema phiên đang chạy.
- Contract `1.0`; hỗ trợ MCP `2026-07-28` và compatibility `2025-11-25`, `2025-06-18`, `2025-03-26`. Client mới dùng envelope `_meta` và header method/name/version theo protocol; legacy dùng initialize. List/discover mới có `resultType`, `_meta` server info, `ttlMs`, `cacheScope: private`.

## Discovery trước khi cấp quyền — server 1.0.1

- MCP initialize/discover/tools-list/ping/initialized và `get_workflow` cho phép không có Authorization để client đọc schema/hướng dẫn trước khi kết nối. Không trả dữ liệu Food/Dish, bản lưu hoặc tài khoản trong các phản hồi public này. Dùng hạn mức global/per-IP hiện có, không tạo hệ thống quota mới.
- Các công cụ dữ liệu tiếp tục kiểm bearer/issuer/audience/expiry/scope/owner. Khi thiếu token/quyền, giữ HTTP 401/403 + WWW-Authenticate cho client MCP và trả JSON-RPC isError kèm `_meta["mcp/www_authenticate"]` cho giao diện liên kết tài khoản. Không tự thực hiện thao tác sau một lỗi auth.
- Tool descriptors có `securitySchemes` ở cấp tool và mirror trong `_meta`; chỉ get_workflow là noauth, các tool còn lại oauth2 đúng scope. Envelope modern giữ nguyên metadata challenge khi thêm serverInfo. Token sai được gửi kèm vẫn bị từ chối, không fallback sang anonymous.
- Gói plugin 1.0.1 khai báo mixed OAuth/DCR rõ ràng. Cần Refresh metadata và thử hội thoại mới cho plugin đã tạo; không coi kiểm SDK hoặc fixture là nghiệm thu ChatGPT thật.

## Thống kê công khai ở chân trang

- Tái dùng `SiteSetting` singleton và API/footer hiện có, không dựng bảng analytics riêng. Hai bộ đếm bắt đầu từ 0 khi bật tính năng; không backfill các lượt thử trước đó.
- Chỉ tăng trong transaction đổi authorization code thành token lần đầu thành công. Refresh, consent chưa đổi code, code lỗi/phát lại, mở link/QR hoặc client name tự khai không tăng số.
- Phân biệt ChatGPT/Claude bằng callback chính xác đã xác thực. Callback tùy chỉnh khác không gán bừa vào một nền tảng. Đây là lượt cấp quyền kết nối, không phải số người dùng độc nhất hoặc bằng chứng đã chat trên nền tảng.
- Lũy kế được giữ khi OAuth hết hạn/thu hồi/cleanup; cập nhật atomic chung DB giữa worker, rollback không cộng số. Không ghi thêm người dùng, token hoặc nội dung hội thoại trong thống kê.
- API `/api/site-settings` chỉ trả hai tổng công khai trong `nutritionConnections`; lỗi/không có dữ liệu hiển thị `—`. SiteSetting có RLS và revoke quyền Data API để ngăn client trực tiếp sửa số hoặc đọc các cột riêng; server owner/BYPASSRLS vẫn phục vụ API/admin hiện có.

## Công cụ và quyền

| Công cụ | Quyền | Vai trò |
| --- | --- | --- |
| `get_workflow` | Public qua MCP; `nutrition:read` qua REST | Quy trình, giới hạn, schema đầu vào. |
| `search_foods`, `get_food` | `nutrition:read` | Food ID, nguồn và dữ liệu trên cơ sở 100 g/ml. |
| `search_dishes`, `get_dish` | `nutrition:read` | Công thức gốc và liên kết nguyên liệu; định lượng nguồn không mặc định bằng một suất. |
| `list_personal_library`, `get_personal_library_item` | `nutrition:read` | Tìm/đọc thực phẩm hoặc công thức riêng thuộc tài khoản; nguồn theo phiên bản khi sử dụng. |
| `prepare_menu` | `nutrition:calculate` | Chuẩn hóa đầu vào, preview, token xác nhận 600 giây. |
| `calculate_menu` | `nutrition:calculate` | Tính đúng bản người dùng đã xem/chốt, trả partial/null và nguồn. |
| `save_menu` | `nutrition:write` | Bản riêng Ration, chống trùng; cập nhật cần ID/revision. |
| `list_saved_menus`, `get_saved_menu` | `nutrition:read` | Chỉ đọc bản thuộc chủ đã cấp quyền; mở lại tính nguồn hiện tại và báo `sourceChanged`. |
| `export_workbook` | `nutrition:export` | XLSX làm việc và link tải 600 giây. |

- Không có MCP tool nhập URL file bên ngoài hoặc sửa kho Food/Dish/quản trị. Upload là REST multipart, xem trước rồi chốt.
- Token prepare ràng buộc tài khoản, ứng dụng, đầu vào và phiên bản nguồn. Dùng `input` chuẩn hóa/`preview.input` đi cùng preview; dữ liệu thay đổi hoặc token hết hạn phải chuẩn bị/xác nhận lại.
- Token kỹ thuật không chứng minh người dùng đã đồng ý. Skill/UI yêu cầu xác nhận bản đã xem, phân biệt việc tính/xuất với chủ ý lưu.

## Báo cáo ngay trong hội thoại

- `calculate_menu` và REST `/calculate` trả thêm `chatReport: {format: "markdown", text}` để AI trình bày trước link Excel, kể cả khi MCP rút gọn kết quả. Không thay các trường totals/analysis có sẵn hoặc lưu báo cáo vào DB.
- Tái dùng totals/dayTotals/analysis: kcal, g đạm–béo–bột đường, tỷ lệ năng lượng P–L–G, chất xơ/natri/canxi/sắt và các chất đã chọn, trung bình/ngày có đầu vào, bảng từng ngày, mục tiêu có nguồn, phần thiếu/ước tính.
- Mẫu số tỷ lệ ba chất là `4P + 9L + 4G`, khác số kcal từ bảng nguồn; thiếu một chất hoặc tổng bằng 0 thì tỷ lệ để `—`. Guard riêng theo ngày ngăn hiển thị tỷ lệ chắc chắn từ tổng một phần. Không có mục tiêu thì không kết luận đủ/thiếu/vượt; mốc giới hạn trên không diễn giải thành nhu cầu phải ăn đủ.
- Nguồn/lưu ý trong báo cáo giới hạn 5 mục, có thông báo số mục còn lại. Dữ liệu đầy đủ tiếp tục ở kết quả/Excel; Markdown escape tên/nguồn người dùng, không chuyển chúng thành chỉ dẫn hoặc liên kết.

## REST cho web và ứng dụng

| Đường dẫn | Body/query | Kết quả |
| --- | --- | --- |
| `POST /api/nutrition/v1/prepare` | JSON `{input}` | `{input,preview,confirmationToken,expiresAt}`. |
| `POST /api/nutrition/v1/calculate` | JSON `{input,confirmationToken}` | Kết quả tính có nguồn/cảnh báo. |
| `POST /api/nutrition/v1/import` | Multipart, đúng một trường `file` | Đọc đầu vào XLSX, trả preview/confirmationToken; không lưu tự động. |
| `POST /api/nutrition/v1/save` | JSON `{input,confirmationToken,idempotencyKey,rationId?,expectedRevision?}` | `{ration:{id,title,revision},input,preview,...}`. |
| `GET /api/nutrition/v1/saved` | `offset` tùy chọn | `{items,nextOffset}`, chỉ chủ sở hữu; 20 bản mỗi trang. |
| `GET /api/nutrition/v1/saved?id=...` | ID chính xác | `{ration,input,preview,confirmationToken,sourceChanged,savedDataVersion,history,historyTruncated}`. |
| `DELETE /api/nutrition/v1/saved` | JSON `{id,expectedRevision}` | `{deleted:true}`, đúng chủ và revision; UI có xác nhận xóa. |
| `POST /api/nutrition/v1/export` | JSON `{input,confirmationToken,saveToAccount?}` | `{downloadUrl,expiresAt,filename,savedMenuUrl,...}`; true cần thêm nutrition:write. |

- REST chấp nhận session web cùng origin hoặc OAuth theo scope. Mutations bằng session có kiểm tra Origin; không chuyển token xác nhận từ một client sang client khác.
- Link tải ký là capability ngắn hạn để nền tảng tải không cần cookie. Người có link có thể tải trong thời hạn; không đưa link vào log, analytics hoặc nơi công khai.
- Khi mở bản nguồn thay đổi, số đã tính lại không mặc định bằng số lần lưu; UI hiển thị cảnh báo trước khi xuất/lưu tiếp. Snapshot lần lưu giữ trong persistence để truy dấu.
- Lịch sử giữ tối đa 20 lần lưu gần nhất: revision, thời điểm xác nhận, client, phiên bản nguồn và đầu vào trước/sau của phần đã đổi. Khi vượt giới hạn có `historyTruncated`; không coi đó là lịch sử đầy đủ vô thời hạn. REST mở bản trả lịch sử, còn giao diện hiện tập trung bản hiện tại và xuất Excel.

## Giới hạn và dữ liệu thiếu

- REST hỗ trợ tối đa 90 ngày, tổng 1.000 dòng, 40 chất chọn, catalogue nhúng tối đa 6.000, JSON 512 KB. MCP còn giới hạn kết quả 140.000 ký tự để phù hợp nền tảng: bản lớn được trả summary có cờ rút gọn, giữ đầu vào cho bước xác nhận. Nếu riêng đầu vào vượt ngân sách hội thoại, server yêu cầu chia kỳ; không hứa 90 ngày luôn vừa một lượt ChatGPT/Claude.
- File nhập/xuất `.xlsx` tối đa 5 MB để file tải xuống có thể nhập lại; archive còn bị giới hạn số entry/kích thước giải nén theo `workbook-security.ts`.
- Mỗi tài khoản tối đa 200 bản hội thoại và 25 MB snapshot theo code persistence. Người dùng có thể cập nhật có revision hoặc xóa bản không dùng trên trang riêng; không xóa kho nguồn.
- Tên lượng/nguồn phải hợp lệ. Thiếu lượng, tỷ trọng khi đổi ml/g, hệ số sống/chín hoặc chấp nhận tham chiếu → `missingInputs`, chưa chốt được. Thiếu nutrient → `null`/partial với danh sách dòng còn thiếu.
- Ngày trống không là ngày ăn 0 kcal; số 0 nguồn được giữ khác `null`. Mục tiêu nhu cầu tùy chọn; không có mục tiêu thì không kết luận đạt/thiếu/vượt.
- Nhận xét AI nhập lại không được coi là nhận xét mới sau chỉnh file. Kết quả chuẩn do server tính lại từ đầu vào đã kiểm tra.
- HTTP 401/403 cần kết nối/quyền phù hợp; 409 là xung đột revision/khóa chống trùng/quota; 413 quá dung lượng; 422 còn thông tin cần chốt; 429 kèm Retry-After; lỗi DB trả mô tả chung, không connection string.
- Xuất Excel có khóa phân tán PostgreSQL, tối đa một tác vụ cùng lúc, 4 lượt/tài khoản/phút và 60 lượt toàn hệ thống/giờ. Tác vụ quá 60 giây hoặc khóa đang bận được xử lý theo code; khi trả 503 bận có Retry-After 15 giây. Đây là ngân sách bảo vệ ban đầu, chưa là cam kết sức chứa VPS.

## Bằng chứng protocol

- `evidence/nutrition-chat/mcp-official-schema-verification.json` ghi kiểm tra sáu frame bằng JSON Schema chính thức 2026-07-28: discover/list/call request và response. Frame do constructor production tạo, không phải gọi API có DB thật.
- [Schema Reference MCP](https://modelcontextprotocol.io/specification/2026-07-28/schema) và [schema JSON chính thức](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.json) là nguồn kiểm tra. API smoke/OAuth thật vẫn cần nghiệm thu riêng.
