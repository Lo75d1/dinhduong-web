# Nghiệm thu OAuth/MCP thật và dọn dữ liệu kiểm thử

- Script: `evidence/nutrition-chat/live-smoke.mjs`. Thư mục `evidence/` được Git ignore; script không nằm trong image app. Root/quản trị copy riêng tới thư mục nghiệm thu, chỉ chạy sau khi bản triển khai và HTTPS đã sẵn sàng.
- Ngày 14/10, Codex đã chạy script trên HTTPS VPS: 41 kiểm tra đạt và dữ liệu test đã dọn, xem [báo cáo thực tế](vps-2026-10-14.md). Khi chuẩn bị, `--self-test` chỉ kiểm helper offline; không dùng kết quả đó để thay nghiệm thu API/OAuth/DB thật.
- Lượt smoke này chạy trước khi bật bộ đếm footer. Sau khi có tổng công khai, nghiệm thu OAuth giả nên chạy trên môi trường riêng: một grant thành công của tài khoản giả vẫn là lượt cấp quyền theo định nghĩa bộ đếm; không dùng smoke để tăng số hoặc sửa/xóa tổng production sau test.
- Đã đọc public `/api/auth/register` và `src/lib/auth.ts` của bản nguồn: đăng ký chỉ tạo User `CLINICIAN` và session, không có gửi email. Hai email giả dùng `@example.invalid`; mọi tên/bản/client có prefix **NUTRITION-VPS-TEST-20261014** và mã lượt chạy riêng.
- Script không sửa Food/Dish, không tạo hồ sơ bệnh nhân, không liên hệ ChatGPT/Claude hoặc gửi email. Callback nằm trong allowlist hiện có, nhưng **mọi redirect đều manual**: chỉ đọc code từ Location rồi đổi code tại server của dự án. HTTP wrapper từ chối URL khác origin, gồm callback nền tảng.

## Chạy và lưu bằng chứng

```bash
node /private/acceptance/live-smoke.mjs --self-test
node /private/acceptance/live-smoke.mjs --run --base-url https://dinhduong2598.food
```

- Node từ 20 trở lên; không cần npm package, secret server hoặc bypass session/signature. Không chạy với `NODE_DEBUG`, proxy ghi body/header, hoặc terminal tùy chọn in request để tránh lộ dữ liệu xác thực.
- Console là NDJSON chỉ gồm assertion, PASS/FAIL, HTTP status và bộ đếm; không in response body, password, code, cookie, token, ticket hoặc URL tải ký. Có thể lưu stdout vào báo cáo nghiệm thu; không sao chép private mapping vào báo cáo/chat/PR.
- Khi không có `--run`, script không chạy mạng. Chỉ chấp nhận HTTPS origin; không có tùy chọn bỏ TLS hoặc giả chữ ký. Không tự retry/hạ bảo mật khi server lỗi hoặc hết hạn mức.
- Luồng kiểm: 2 tài khoản + login/session → DCR/PKCE và HTML consent/CSRF thật → grant → MCP 2026-07-28 discover/list → tra Food/Dish có nguồn → preview/tính → sửa input với ticket cũ bị từ chối → thiếu lượng bị chặn → scope đọc không được tính → lưu chống trùng → khác chủ bị từ chối → cập nhật revision/lịch sử → chỉ tính không hồ sơ → mục tiêu có nguồn từ hồ sơ giả → xuất/tải XLSX → nhập lại chỉ preview → refresh → revoke từ chối access/refresh cũ.
- Kiểm số liệu từ nguồn Food hiện hành: khẩu phần giả 3 ngày có ngày đủ nguồn, ngày thiếu số và ngày trống. Tổng một phần/`null` được kiểm riêng; phần 200 ml có nguồn giả và calcium thiếu. Không dùng đầu vào này để tư vấn thực tế.
- File tải xuống chỉ giữ trong bộ nhớ cho việc import; không ghi workbook ra thư mục public. Không đăng ký client secret chung, không mở callback wildcard.

## Private mapping

- Mặc định tạo `<thư mục script>/private/live-smoke-<mã lượt chạy>.json`; thư mục mới mode `0700`, file mode `0600` trên Linux. Có thể chỉ định `--private-file /private/acceptance/private/mapping.json`; file mới bắt buộc chưa tồn tại.
- File chứa credential giả, cookie/token, user/client ID và bản test để phục hồi cleanup khi quá trình dừng. Trên Windows, mode Unix không thay cho ACL; giữ trong thư mục riêng có quyền phù hợp. Không commit, tải lên public, đưa vào artifact công khai hoặc in cả file bằng `cat`.
- Script ghi mapping trước/sau các thao tác tạo. Mapping giữ lại sau chạy để root dọn user/client bằng ID chính xác. Dữ liệu xác thực còn lại là test; vẫn xử lý file như bí mật đến khi dọn xong.
- Nếu mất response ngay lúc tạo và mapping chưa có ID, root tra bằng **email/displayName hoặc client name chính xác có mã lượt chạy** trong mapping, đối chiếu đầy đủ rồi bổ sung danh sách ID cần dọn. Không dùng tìm-xóa chỉ theo prefix, không coi thiếu ID trong mapping là bằng chứng chưa tạo hàng DB.

## Cleanup qua API

- Kết thúc thành công hoặc lỗi: `finally` đăng nhập lại từng chủ test, đọc `/api/auth/me` và đối chiếu ID/tên, chỉ chọn bản có đúng prefix + mã lượt chạy, mở lại revision rồi DELETE. Script không xóa bản của tài khoản khác hoặc kho nguồn.
- Thu hồi các connection có đúng tên client lượt chạy bằng endpoint session/CSRF; gọi revoke cho grant đã ghi, rồi logout. Kiểm tra danh sách không còn bản test. Nếu có FAIL cleanup, root dừng nghiệm thu và dọn theo mapping; không tuyên bố dữ liệu đã sạch.
- Khi script bị kill/mất mạng trước `finally`, chạy lại cleanup riêng với cùng mapping và origin:

```bash
node /private/acceptance/live-smoke.mjs --run --cleanup \
  --base-url https://dinhduong2598.food \
  --private-file /private/acceptance/private/live-smoke-MA-LUOT-CHAY.json
```

- Đây là command mẫu; thay đường dẫn bằng file private thực tế. Cleanup không tạo thêm user/client, chỉ tạo session đăng nhập lại để dọn. Console vẫn chỉ có status/counts.
- Session tạo lúc register/login trước đó có thể còn hàng DB sau logout session cuối; bước dọn User của root xử lý quan hệ cascade. File export tạm giữ tối đa TTL 600 giây và được maintenance dọn; không xóa cả volume hoặc tìm-xóa file tùy tiện.

## Root dọn User/client bằng DB sau nghiệm thu

- Public API không có xóa tài khoản hoặc DCR client. Script báo `operator_db_cleanup_pending` kể cả API cleanup PASS; root phải dọn riêng theo mapping, không coi revoke là đã xóa client/user.
- Dùng transaction của Prisma/image maintenance để **đọc và đối chiếu trước**: đúng user ID + email `@example.invalid` + displayName chính xác; đúng client ID + client name chính xác + callback/auth method của lượt chạy. Nếu lệch bất kỳ trường nào, dừng; không xóa bằng prefix rộng.
- Kiểm tra Ration của hai chủ chỉ chứa bản test lượt này và không có Patient/dữ liệu khác. API cleanup phải làm sạch Ration trước; nếu còn bản do response mất, đọc rõ từng bản rồi dọn đúng chủ/revision hoặc transaction giới hạn ID đã xác minh.
- Sau đối chiếu: xóa hai User đã xác minh (quan hệ Session/OAuth theo schema cascade), rồi hai NutritionOAuthClient đã xác minh. Không động Food/Dish/RNI/migration hoặc bảng unrelated. Cửa sổ hạn mức có key hash được maintenance hết hạn tự dọn, không xóa toàn bảng hạn mức khi production đang phục vụ.
- Đọc lại count theo **danh sách ID chính xác**: users/clients/sessions/codes/tokens/rations của lượt chạy đều 0; lưu bộ đếm và thời điểm trong bằng chứng không chứa định danh thật. Khi đã xác nhận sạch, xóa private mapping bằng thao tác file giới hạn chính xác đường dẫn. Giữ script và báo cáo assertion không bí mật để review.
