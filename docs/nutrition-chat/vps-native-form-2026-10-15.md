# Sửa xác nhận OAuth bị chặn Origin — 15/10/2026

- Người dùng gửi ảnh trang cấp quyền và lỗi `invalid_request: Nguồn trình duyệt không được phép.` khi gửi form. VPS đọc thật: app healthy, issuer/resource đúng, client người dùng giữ nguyên, chưa có code/token thật.
- Trang và Caddy giữ `Referrer-Policy: no-referrer`. Với HTML form POST dạng navigation, trình duyệt có thể gửi `Origin: null` theo chính sách này; request fetch CORS trước đây trong bộ nghiệm thu không tái hiện trường hợp đó. Nguồn: [MDN Referrer-Policy, phần Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy), [OWASP CSRF / Fetch Metadata](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
- Commit app `eeef35d`: thêm kiểm nguồn riêng cho hai form xác nhận và thu hồi OAuth. Ngoại lệ chỉ nhận POST URL-encoded, Origin đúng chuỗi null, Sec-Fetch-Site same-origin, Mode navigate và Dest document; sau đó vẫn kiểm session + CSRF ký như cũ. Origin ngoại lai/same-site/iframe/thiếu metadata vẫn chặn. JSON/bearer API không dùng ngoại lệ này.
- Không đổi Caddy/chính sách referrer/callback/secret/scope, không đổi DB/schema hoặc dữ liệu nguồn. Không mở Origin null toàn cục hoặc cấp quyền thay người dùng.

## Nghiệm thu

- Prisma generate, TypeScript, lint file sửa và build Linux đạt. Security thuần **89**, OAuth PostgreSQL fixture **261**, tài khoản **62** checks đạt; ca native approval thực sự tạo code trong fixture, sai CSRF và cross-site vẫn từ chối.
- HTTPS trước vá trả 403 đúng lỗi trong ảnh với Origin null. Sau vá **28 checks** bằng HTTPS transport giữ nguyên header native: Đồng ý trả 303 với code/state/iss đúng callback; Từ chối trả access_denied; Thu hồi trả về trang quản lý và DB xác nhận revoked. JSON account API vẫn 403 với Origin null, sai CSRF/nguồn/metadata đều bị chặn. Giữ no-referrer trên trang.
- Dùng Node https.request cho request native; Undici fetch tự thay Sec-Fetch-Mode thành cors nên không dùng nó để chứng minh native navigation. Không theo callback hoặc đổi code kiểm thử thành token, không tăng bộ đếm cấp quyền thật.
- IAB hiển thị đúng trang/form và sau reload thấy token thử đã thu hồi. Click/Enter trên native form trong IAB không điều hướng trong phiên này; Chrome của người dùng không có trong tool inventory. Vì vậy không coi đây là nghiệm thu nút bấm Chrome hoặc tài khoản ChatGPT thật. Ảnh ignore `evidence/nutrition-chat/vps-native-form-after.jpg` là trạng thái tài khoản thử sau HTTP thu hồi.
- Một user/client/token/code kiểm thử đã dọn theo ID + namespace riêng; credential thử local/remote đã xóa. Food/Dish/nguyên liệu giữ nguyên count+digest. Bộ đếm tại lúc thử ChatGPT0/Claude0. Env/Caddy/nav layout/file Google giữ nguyên, swap build đã gỡ; không chạy migration/seed.
- App eeef35d healthy trên VPS. Backup image/env/local patch tại thư mục theo `/opt/dinhduong-release-backups/nutrition-native-form-codex-active.txt`. Nhánh thử vẫn chưa merge main.

## Người dùng thử lại

- Quay lại ChatGPT, bắt đầu kết nối/cấp quyền lại để lấy phiên mới rồi bấm Đồng ý kết nối. Không tiếp tục trang API báo lỗi hoặc form cũ đã quá TTL 10 phút.
- Chỉ xác nhận thành công nền tảng khi ChatGPT hoàn tất callback và gọi được công cụ dữ liệu; 303 ở server chưa đủ để khẳng định toàn luồng.
