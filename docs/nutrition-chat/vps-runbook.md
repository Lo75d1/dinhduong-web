# Phát hành Nutrition Chat API trên VPS

## Phạm vi và người triển khai

- Dùng app hiện có tại `/opt/dinhduong`, Docker Compose + Caddy; kho dữ liệu Food/Dish hiện có giữ nguyên. Không chạy AI model trên VPS và không dựng DB song song.
- Cập nhật theo yêu cầu trực tiếp ngày 14/10/2026: **bỏ cửa Claude duyệt cho phần việc này**; người dùng tự chạy lệnh VPS, Codex chỉ cập nhật nhánh GitHub. Chạy thử từ `codex/nutrition-chat-api` theo [thu-vps.md](thu-vps.md); chưa tự merge main hoặc deploy. Đây là ngoại lệ theo chỉ đạo người dùng đối với quy trình cũ trong AGENTS, không phải xác nhận đã phát hành.
- Migration mới chỉ bổ sung persistence/OAuth/hạn mức cho tính năng này. Rà SQL và migration history trước khi áp; tuyệt đối không `prisma migrate reset`, seed lại nguồn hoặc reset Git.

## Trước khi merge

- Giữ APP_SECRET đang dùng nếu đủ mạnh; secret này có thể liên quan các dữ liệu mã hóa hiện có. Không tự xoay secret để bật OAuth. Nếu phải thay, người triển khai cần quy trình chuyển đổi/khôi phục riêng.
- Rà `verification.md`: có lỗi lint/test cũ đã tái hiện, kiểm nguồn live và provider còn phải nghiệm thu. Không dùng kết quả fixture thay nghiệm thu hệ thống thật.

- Chạy `npx prisma generate`, `npx tsc --noEmit`, ESLint và các test Nutrition Chat/OAuth/workbook cùng các test tính đã tái dùng. Chỉ loại trừ file route Next tự sinh theo quy ước.
- Test trình duyệt `/ket-noi-ai` desktop/mobile, upload preview, xác nhận, lưu mới và xuất lại. Nếu test dùng stub, ghi rõ là stub; không coi là kiểm chứng DB.
- Test mở XLSX bằng Excel thật, sửa đầu vào và xem công thức/biểu đồ cập nhật. Test parser độc lập không thay cho nghiệm thu Excel.
- Tài khoản thật ChatGPT/Claude: tra → chuẩn bị → xác nhận → tính → xuất, có/không mục tiêu, thiếu dữ liệu, ngoài kho; lưu/mở cùng chủ, từ chối khác chủ, scope thiếu, refresh/thu hồi, gửi lại chống trùng.
- Thử tải nhẹ trên staging hoặc fixture, đo p95/RAM/thời gian xuất. Hạn mức ban đầu trong code là ngân sách bảo vệ, không phải cam kết sức chứa VPS. Không stress production.

## Cấu hình

- Thêm biến trong `.env.production` hiện có theo [env.production.nutrition.example](env.production.nutrition.example). File mẫu không có bí mật và không thay thế toàn bộ môi trường đang chạy.
- `APP_SECRET`: bí mật ngẫu nhiên riêng, tối thiểu 32 ký tự; giữ giá trị ổn định giữa worker/restart. Đổi khóa làm token xác nhận/link ký cũ hết hiệu lực; lên lịch và thông báo khi xoay.
- `NUTRITION_PUBLIC_URL`: HTTPS origin công khai, không path/query/credentials; issuer, audience, OAuth metadata và link phải cùng origin. Mặc định `https://dinhduong2598.food`.
- `NUTRITION_OAUTH_REDIRECT_URIS`: JSON array bổ sung callback **chính xác**. Code đã có callback ChatGPT/Claude; không dùng wildcard, không mở arbitrary domain khi lỗi kết nối. Đối chiếu callback nền tảng trước khi bổ sung.
- `NUTRITION_ALLOWED_ORIGINS`: origin trình duyệt được phép, phân cách dấu phẩy. Đây không phải allowlist OAuth callback. Origin cùng website đã hợp lệ; không dùng `*`.
- `NUTRITION_TRUST_PROXY=1`: chỉ bật khi Next không mở trực tiếp ra Internet, mọi ingress qua Caddy tin cậy. Compose hiện chỉ expose port app cho mạng Docker; chỉ Caddy publish 80/443.
- Không đưa token, mật khẩu, profile cá nhân hoặc file XLSX vào log. Không đổi `DATABASE_URL` đang phục vụ data chỉ để thử tính năng.
- Bản phát hành nâng Next.js và eslint-config-next lên **16.4.0**, cố định bằng lockfile để vá phiên bản 16.2.10. SCA của dependency còn lại cần rà từng advisory và đường dùng thực tế; không coi nâng Next là đã xử lý toàn bộ audit, không nâng hàng loạt ngoài phạm vi.

## Gói tải

```bash
node scripts/package-nutrition-chat-plugin.mjs
```

- Sinh `public/nutrition-chat/`: plugin ZIP, skill ZIP, hướng dẫn và `SHA256SUMS`; không chứa credential hoặc ID ứng dụng đã đăng ký giả.
- Với tên miền khác, dùng `--public-url https://ten-mien` cùng origin `NUTRITION_PUBLIC_URL`; command chỉ chấp nhận HTTPS origin. Build image từ gói đã sinh; Dockerfile hiện copy `public` vào runner.
- Skill ZIP chứa thư mục `dinh-duong-2598/SKILL.md`; plugin ZIP có root `plugin.json`, `mcp.json` và `skills/`. MCP khai báo transport/URL portable, dùng OAuth discovery của server; không nhúng secret.
- Phát hành file tĩnh không tự niêm yết plugin trên thư viện công khai. Đăng ký MCP trên từng tài khoản và public submission nếu có là công việc riêng.

## Backup và triển khai

1. Ghi commit đang chạy, image app hiện hành và tình trạng migration. Tạo snapshot/backup PostgreSQL bằng cơ chế của dịch vụ DB đang dùng, kiểm tra khả năng phục hồi trên môi trường riêng; không xuất secret lên terminal.
2. Giữ bản `.env.production` an toàn và gói image trước đó để phục hồi app. Không commit backup DB hoặc env.
3. Đối với bản chính thức đã merge main, theo `CLAUDE_HANDOFF.md` (bản chạy thử nhánh dùng `thu-vps.md`):

```bash
cd /opt/dinhduong
git pull origin main
docker compose --profile maintenance build --no-cache migrate
docker compose --profile maintenance run --rm migrate
docker compose up -d --build
```

- Chỉ build/chạy app mới khi migration báo `All migrations have been successfully applied.`. Nếu drift hoặc yêu cầu reset, dừng và reconcile migration history; không áp reset.
- Giữ Caddy HTTPS. Endpoint MCP và metadata phải truy cập được từ cloud ChatGPT/Claude; truy cập localhost trên máy người dùng không chứng minh cloud kết nối được.
- Không thay Caddy log thành ghi body/header Authorization. Nếu bật access log, phải bỏ query chứa link tải ký hoặc redact trước khi lưu.

## Smoke chỉ đọc sau phát hành

```bash
curl --fail --silent --show-error https://dinhduong2598.food/api/health
curl --fail --silent --show-error https://dinhduong2598.food/.well-known/oauth-protected-resource
curl --fail --silent --show-error https://dinhduong2598.food/.well-known/oauth-authorization-server
curl --fail --silent --show-error --output /dev/null https://dinhduong2598.food/ket-noi-ai
curl --fail --silent --show-error --output /dev/null https://dinhduong2598.food/nutrition-chat/dinh-duong-2598-plugin.zip
```

- Kiểm tra HTTP/status và metadata resource/issuer/scopes đúng HTTPS origin. MCP không token phải trả challenge xác thực, không data cá nhân. Không in bearer token/cookie để làm smoke.
- Tài khoản nghiệm thu riêng: OAuth cấp đúng scope, tools/list và một query ít kết quả, rồi một khẩu phần nhỏ. Kiểm tra kết quả và XLSX, thử replay cùng khóa lưu, thu hồi và xác nhận token bị từ chối.
- Hạn mức theo user/client và lớp anonymous đều cần thử trên staging; kết quả 429 phải có Retry-After. Không cố vượt hạn mức trên production chung.

## Dung lượng, TTL và bảo trì

- OAuth: authorization code 120 giây; consent 600 giây; access token 900 giây; refresh tối đa 30 ngày tuyệt đối, client hết hạn theo hoạt động tối đa 30 ngày. Thu hồi ngăn dùng access/refresh cũ.
- `cleanupNutritionOAuth(batchSize)` chỉ xóa bản ghi OAuth/hạn mức hết hạn, có batch bound; không xóa Food/Dish/Ration. Bảo trì gọi theo entrypoint của bản phát hành, chạy theo lịch đã duyệt, ghi số lượng và thời gian, không ghi token.
- Link export có thời hạn 600 giây và quyền theo code phát hành. File tạm và OAuth được dọn bằng `scripts/cleanup-nutrition-chat.ts`; cấu hình lịch bảo trì chỉ sau khi kiểm tra entrypoint trong image phát hành. Không lưu XLSX vào thư mục public hoặc giữ file tạm vô thời hạn.
- Compose mount **cùng volume `nutrition_chat_tmp`** vào app và maintenance tại `/tmp/dinhduong2598-nutrition-chat-v1`; runner tạo thư mục với quyền UID 1001. Kiểm tra volume owner và dung lượng khi phát hành, không xóa volume để chữa quyền.
- Upload/export `.xlsx` tối đa 5 MB để file làm việc nhập lại được, giới hạn file giải nén/entry/dòng theo `workbook-security.ts`. File không có macro/link ngoài; parser không chạy công thức và không tải URL bên ngoài.
- Kết quả MCP có ngân sách 140.000 ký tự, bản lớn trả summary hoặc yêu cầu chia kỳ. Export dùng khóa phân tán PostgreSQL một tác vụ, 4 lượt/user/phút, 60 lượt toàn hệ thống/giờ; bận trả 503 Retry-After. Kiểm thử hàng đợi và thời hạn khóa trên staging trước khi điều chỉnh.
- Theo dõi 401/403/429/5xx, RAM CPU app, thời gian query/export, số client/token/hạn mức và dung lượng DB. Cảnh báo theo nền tải đã đo; chưa có số đo thì không tuyên bố sức chứa.

Số đo fixture trên Windows, Node 26.5.0; RSS là tiến trình xuất/nhập độc lập, chưa gồm app Next, PostgreSQL, Caddy hoặc tác vụ đồng thời:

| Tác vụ | Kích thước | RSS đỉnh | Thời gian |
| --- | --- | --- | --- |
| Xuất thông thường | 3.719 thực phẩm, 18 chất, 7 ngày, 21 dòng | 393 MiB | 2,0 giây |
| Xuất tối đa dòng, chất mặc định | 3.719 thực phẩm, 18 chất, 90 ngày, 1.000 dòng | 611 MiB | 4,3 giây |
| Xuất tối đa catalogue/chất | 6.000 thực phẩm, 40 chất, 90 ngày, 1.000 dòng | 1.064 MiB | 8,0 giây |
| Nhập lại | 90 ngày, 1.000 dòng | 363 MiB | 1,5 giây |

- Bằng chứng: `evidence/nutrition-chat/workbook-export-*-benchmark.json` và `workbook-import-benchmark.json`. Parser bỏ qua các ô tính sẵn; file tối đa đã đo còn dưới 5 MB.
- Dự trù staging từ 2 GiB RAM cho mức thông thường, 4 GiB nếu cần mức tối đa. Đây là điểm khởi đầu đo tải, không bảo đảm cùng mức RAM/thời gian trên Linux VPS. Đo lại trong image production, tính thêm DB/app và theo dõi RAM thực trước khi chốt cấu hình hoặc mở hạn mức.

Bảo trì sau merge/migration, chạy thử trước khi đặt lịch:

```bash
cd /opt/dinhduong
docker compose --profile maintenance run --rm migrate npx tsx scripts/cleanup-nutrition-chat.ts
docker compose --profile maintenance run --rm -e NUTRITION_MAINTENANCE_ENABLED=1 migrate npx tsx scripts/cleanup-nutrition-chat.ts --apply --batches=10
```

- Lệnh đầu là dry run, không truy cập DB/file. Lệnh `--apply` chỉ dùng sau khi kiểm tra backup, migration và volume; mỗi vòng cleanup có giới hạn batch.
- Ví dụ crontab **chưa được cài**, dành cho quản trị VPS sau khi kiểm chứng bản chạy thử (15 phút/lần):

```cron
*/15 * * * * cd /opt/dinhduong && docker compose --profile maintenance run --rm -e NUTRITION_MAINTENANCE_ENABLED=1 migrate npx tsx scripts/cleanup-nutrition-chat.ts --apply --batches=10 >> /var/log/dinhduong-nutrition-maintenance.log 2>&1
```

- Cấu hình logrotate/giới hạn log và giám sát lỗi lịch; giữ đầu ra chỉ có bộ đếm cleanup, không token/bí mật. Việc cài cron là thao tác vận hành riêng sau cửa duyệt, chưa diễn ra trong nhiệm vụ phát triển.

## Phục hồi

- Khi migration đã áp nhưng app mới lỗi: quay lại image/commit app đã ghi nhận, giữ các bảng bổ sung; không rollback DB bằng xóa bảng. Đối chiếu tương thích schema trước khi khởi động app cũ.
- Khi phát hiện sai dữ liệu người dùng hoặc lỗi auth: ngừng bề mặt Nutrition Chat tại ingress, thu hồi các phiên bị ảnh hưởng; các trang tra cứu/công cụ cũ giữ theo đánh giá vận hành. Không mở scope hoặc bỏ kiểm tra chủ sở hữu để chữa lỗi.
- Restore DB chỉ khi có mất/hỏng dữ liệu đã xác nhận, bằng bản backup đã thử và quy trình của dịch vụ DB; người triển khai điều phối cửa bảo trì. Không ghi đè DB production chỉ vì endpoint lỗi.
- Lưu bằng chứng nghiệm thu và giới hạn chưa thử trong PR/run report. Không đánh dấu ChatGPT/Claude/Excel/VPS đã chạy nếu mới kiểm bằng fixture local.

## Phương pháp nhu cầu đang tái dùng

- Chế độ chỉ tính không có mục tiêu và không bắt nhập hồ sơ. Chế độ thủ công dùng mức người dùng cung cấp kèm nguồn.
- Chế độ hồ sơ tái dùng `multi-day-analysis`: ưu tiên khuyến nghị RNI phù hợp, sau đó fallback Mifflin–St Jeor khi logic hiện có có đủ điều kiện; kết quả ghi nguồn cụ thể. Không tự đổi khuyến nghị hoặc dữ liệu canonical để làm phép đối chiếu.
- Không diễn giải tổng thiếu dữ liệu như kết luận đạt/vượt. Một ngày chưa nhập phải có trạng thái riêng và không đưa vào mẫu số ngày có khẩu phần.
