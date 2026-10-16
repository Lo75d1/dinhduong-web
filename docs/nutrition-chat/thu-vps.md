# Chạy thử nhánh Nutrition Chat trên VPS

- Nhánh GitHub: `codex/nutrition-chat-api`.
- Theo yêu cầu người dùng ngày 14/10/2026: bỏ cửa Claude duyệt cho phần việc này; người dùng tự nhập lệnh trên VPS. Codex không tự merge/deploy. Đây là thử bản mới trên VPS, chưa phải bằng chứng ChatGPT/Claude đã kết nối được.
- Lệnh dưới đây dùng checkout hiện có `/opt/dinhduong`, không clone thêm app hay tạo DB khác. App được thay bằng bản nhánh thử; ghi phiên bản và backup trước.

## 1. Kiểm tra và giữ bản phục hồi

```bash
cd /opt/dinhduong
git status --short
git log -1 --oneline
docker compose ps
df -h / /var/lib/docker
free -h
```

- Nếu Git có thay đổi đang dở, dừng trước khi chuyển nhánh; giữ chúng để xử lý riêng. Không reset/clean.
- Backup PostgreSQL/Supabase bằng cơ chế đang dùng, kiểm tra có thể phục hồi trước migration. Backup env ở thư mục riêng quyền 0700, không dán nội dung vào chat/Git.
- Giữ commit, nhánh và image đang chạy để quay về:

```bash
umask 077
nutrition_release_stamp="$(date +%Y%m%d-%H%M%S)"
nutrition_backup_dir="/opt/dinhduong-release-backups/nutrition-chat-$nutrition_release_stamp"
mkdir -p "$nutrition_backup_dir"
cp -p .env.production "$nutrition_backup_dir/env.production"
git rev-parse HEAD > "$nutrition_backup_dir/commit.txt"
git branch --show-current > "$nutrition_backup_dir/branch.txt"
nutrition_old_app="$(docker compose ps -q app)"
nutrition_old_image="$(docker inspect --format '{{.Image}}' "$nutrition_old_app")"
docker image tag "$nutrition_old_image" "dinhduong-nutrition-rollback:$nutrition_release_stamp"
printf '%s\n' "dinhduong-nutrition-rollback:$nutrition_release_stamp" > "$nutrition_backup_dir/image.txt"
```

- Nếu bất kỳ lệnh backup/tag lỗi, dừng và xử lý trước khi chuyển nhánh. Không chạy prune image trong lúc thử.

## 2. Lấy nhánh và cấu hình

```bash
git fetch origin
git switch codex/nutrition-chat-api
git pull --ff-only origin codex/nutrition-chat-api
git log -1 --oneline
```

- Lần đầu `git switch` tự tạo nhánh local từ nhánh origin cùng tên. Nếu báo không tìm thấy/không thể chuyển, gửi lỗi để rà; không dùng force.
- Mở `.env.production` bằng editor trên VPS, giữ DATABASE_URL, DOMAIN và APP_SECRET hiện có. Chỉ bổ sung cấu hình theo `env.production.nutrition.example`:

```dotenv
NUTRITION_PUBLIC_URL=https://dinhduong2598.food
NUTRITION_TRUST_PROXY=1
NUTRITION_OAUTH_REDIRECT_URIS=[]
NUTRITION_ALLOWED_ORIGINS=
```

- TRUST_PROXY chỉ hợp lệ khi app không publish cổng ra Internet và toàn bộ ingress đi qua Caddy. APP_SECRET phải ít nhất 32 ký tự; nếu thiếu/ngắn, dừng để xử lý tương thích dữ liệu mã hóa, không ghi đè khóa cũ.
- Nguồn env không được in bằng `docker compose config` thông thường; dùng `--quiet` dưới đây.

## 3. Kiểm cấu hình, migration và khởi động

Chạy từng lệnh, chỉ tiếp tục khi lệnh trước thành công:

```bash
docker compose config --quiet
docker compose run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose --profile maintenance build --no-cache migrate
docker compose --profile maintenance run --rm migrate
```

- Kiểm tra migration history/backup trước khi chạy bước migrate. Chỉ tiếp tục khi có `All migrations have been successfully applied.`; nếu drift/reset/SQL lỗi, dừng và gửi lỗi đã bỏ bí mật.
- Migration chỉ thêm trường Ration/OAuth/hạn mức. Không chạy seed hoặc migrate reset.

```bash
docker compose up -d --build app
docker compose ps app
```

- Chờ app `healthy` rồi chạy lệnh Caddy bên dưới. Nếu app chưa healthy, xem lỗi qua `docker compose logs --tail=100 app`, bỏ bí mật trước khi gửi.
- Recreate Caddy để chắc chắn bind mount đọc Caddyfile mới và các header bảo vệ đã có hiệu lực; chỉ reload app không bảo đảm Caddy nạp lại cấu hình.

```bash
docker compose up -d --no-deps --force-recreate caddy
docker compose ps
```

## 4. Kiểm tra và dùng thử

```bash
curl --fail --silent --show-error https://dinhduong2598.food/api/health
curl --fail --silent --show-error https://dinhduong2598.food/.well-known/oauth-authorization-server
curl --fail --silent --show-error https://dinhduong2598.food/.well-known/oauth-protected-resource
curl --fail --silent --show-error --output /dev/null https://dinhduong2598.food/ket-noi-ai
docker compose --profile maintenance run --rm migrate npx tsx scripts/verify-nutrition-chat-source.ts
```

- Mở `https://dinhduong2598.food/ket-noi-ai`, đăng nhập và thử upload file XLSX làm việc → xem trước → chốt → lưu/xuất. File cần đúng mẫu của tính năng; chưa có file thì bắt đầu từ kết nối MCP.
- MCP cho ChatGPT/Claude: `https://dinhduong2598.food/api/nutrition/v1/mcp`, chọn OAuth. Xem `ket-noi.md`; thử tra một Food/món, prepare, xác nhận, tính rồi xuất bản nhỏ trước.
- Link tải có hạn 600 giây. Không chia sẻ link/file/token cá nhân trong log hay chat công khai.
- Nếu xuất báo EACCES, kiểm quyền volume thay vì xóa volume:

```bash
docker compose exec -T app sh -c 'id; ls -ld /tmp/dinhduong2598-nutrition-chat-v1; test -w /tmp/dinhduong2598-nutrition-chat-v1'
```

- Image mới tạo volume owner 1001/mode 0700 kể cả maintenance mount trước; volume cũ không tự đổi quyền. Nếu kiểm trên lỗi, gửi kết quả để xử lý đúng volume, không chmod rộng hoặc xóa file.
- Các bước xác thực hai tài khoản, refresh/thu hồi, khóa nhiều worker, giới hạn/RAM và cleanup lịch được ghi ở `vps-runbook.md`. Chưa cài cron trong các lệnh thử này.

## Khi bản thử lỗi

- Dừng ở lỗi đầu tiên; giữ output lỗi, commit và trạng thái service để rà. Không sửa DATABASE_URL, reset DB hoặc xóa volume để chữa.
- Bản env/commit/nhánh/image cũ nằm ở thư mục backup đã tạo ở bước 1. Quay lại app cũ phải giữ schema bổ sung và kiểm tương thích; không xóa bảng để rollback.
- Lỗi lint/test cũ, advisory dependency và những bước chưa nghiệm thu đã ghi trong `verification.md`; chạy thử trên VPS không biến các mục đó thành đã đạt.
