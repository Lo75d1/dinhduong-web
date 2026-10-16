# Nghiệm thu thư viện cá nhân trên VPS — 15/10/2026

## Phạm vi và cho phép triển khai

- Sau khi xem PR/ảnh kiểm thử, chủ dự án yêu cầu trực tiếp “ok cho lên vps”. Lần này triển khai nhánh `codex/nutrition-chat-api` theo cho phép đó, gồm migration mới; không merge hoặc commit main.
- App chạy từ source **46f2659bdc9f432b62a7768057e14dc76eb0f149**, thay app 151ec6b. Những commit tài liệu nghiệm thu sau đó không đổi image ứng dụng.
- Website: `https://dinhduong2598.food`; ba mục tài khoản mới: Thực đơn của tôi, Thực phẩm của tôi, Món ăn của tôi.

## Sao lưu, migration và build

- Kiểm tra SSH thật: đúng nhánh/commit, app healthy, PostgreSQL17.6, backend có BYPASSRLS/quyền tạo schema, hai bảng thư viện chưa tồn tại. Giữ thay đổi Caddy/layout và file Google riêng trên VPS.
- Backup: `/opt/dinhduong-release-backups/nutrition-library-20261015-170422-codex`. Dump public dạng custom **3.718.861 byte / 264 entries**, SHA256 và image rollback lưu cùng thư mục mode0700; file DB/env mode0600. Cấu hình pg.env trung gian đã xóa.
- Restore vào PostgreSQL17 riêng, network none/tmpfs; áp thử SQL migration thật thành công, kiểm số lượng Food/Dish/nguyên liệu và RLS/revoke. Container thử đã dừng/xóa, không restore đè DB production.
- Đối chiếu SQL đã thử với file migration trong checkout đích; fast-forward đúng source đã chốt. Build image migrate **no-cache**, chạy migrate đến `All migrations have been successfully applied.`, rồi build/up app. Không chạy seed/reset hoặc xóa dữ liệu chuẩn.
- DB thật **25/25 migration** hoàn tất, thêm `personal_foods`/`personal_dishes`; cả hai RLS=true, anon/authenticated SELECT=false. App mới healthy, OOMKilled=false; swap1GiB chỉ dùng build đã gỡ. Timer bảo trì active/enabled.

## HTTPS và giao diện thật

- **69 kiểm tra HTTPS thực tế đạt**: create/retry đồng thời chỉ một mục; giữ null/0/vi chất; sửa có revision và chặn stale; owner khác404 ở đọc/sửa/xóa, chặn unknown owner field/Origin/token sai; bearer chỉ read không ghi được.
- Tạo món từ Food chuẩn và thực phẩm100ml có nguồn riêng, lưu thực đơn; sửa thực phẩm không đổi snapshot món/thực đơn cũ. Hai phiên bản nguồn cùng nằm trong hai ngày tính đúng. Số kiểm thử: nguyên liệu chuẩn198kcal + nguồn giả lập thành298kcal, bản hai ngày388kcal; không phải thực đơn khuyến nghị.
- SSR thật đọc đủ ba thư mục, gom Ration web cũ và bản chat/Excel; mở lại bản cũ, tạo thực đơn từ mục riêng và mở biểu mẫu điền sẵn từ bản lưu. Chủ khác không mở được các URL mục riêng.
- MCP thật trên HTTPS công bố13 công cụ; `list_personal_library`/`get_personal_library_item` trả dữ liệu đúng owner bằng bearer read dành riêng cho fixture. Token được chèn riêng để thử máy chủ, không đổi OAuth code/cấp quyền giả làm tăng bộ đếm; không coi là nghiệm thu ChatGPT/Claude thật.
- XLSX tải thật **1.573.910 byte**, nhập lại qua HTTPS giữ388kcal và hai phiên bản nguồn. Không lặp nghiệm thu native Excel vì builder/formula không đổi trong đợt này; các phép thử native trước ở biên bản Excel/link.
- Browser đăng nhập tài khoản tạm và quay về đúng Thực phẩm của tôi; sửa90→95kcal/100ml, xem trước giữ Canxi120mg rồi lưu thành revision3. Menu tài khoản đủ ba mục.
- Browser dùng món riêng lập bản mới, đổi lượng200→300ml, xem348kcal, xác nhận/lưu/mở lại đúng348; mở lối lưu món từ thực đơn sang thư viện cho biểu mẫu điền sẵn300ml/100g. Danh sách hiện cả bản web cũ và ba bản mới; không bấm nạp đè dữ liệu localStorage của công cụ hiện tại.
- **17 kiểm tra công khai cuối**: home/health/guide200, ba trang riêng chuyển anonymous về login, API riêng401; metadata/workflow13tool và ba gói tải khớp SHA256SUMS. File credential thử không còn trên app/backup/local.

## Dọn dữ liệu và đối chiếu

- Xác nhận đúng prefix/ID/email/owner/displayName của fixture trước xóa. Đã dọn **2 user, 2 phiên còn lại, 4 Ration, 1 PersonalFood, 1 PersonalDish, 1 token, 1 client và 6 audit fixture**. Các mục user/session/menu/food/dish/token/client/audit scoped còn0; không xóa dữ liệu người dùng khác. Browser đã logout và đóng tab thử.
- Canonical trước/sau giữ nguyên: Food3719 digest `e276f0ba439a43219f523fc70b9a309d`; Dish7369 `b47e289aaf51d33bd0fe51449ba19eba`; nguyên liệu41457 `336c41b1755b694b348d461ad8c1cbb1`.
- SHA env/layout/Caddy/file Google khớp backup. Bộ đếm kết nối vẫn ChatGPT1/Claude0; không đặt lại hoặc tăng giả. Các quota thử có thời hạn tiếp tục theo maintenance hiện có, không reset bộ đếm toàn hệ thống.
- Bằng chứng ignore `evidence/nutrition-chat/library-vps-https-proof.json`, `vps-library-account-directory.png`, các script SSH; biên bản/checksum/log gốc nằm trong backup riêng trên VPS. Không đưa secret, dump DB hoặc credential vào Git.

## Giới hạn

- Chưa thử nền tảng ChatGPT/Claude/Gemini thật dùng thư viện; kết nối cũ có thể cần refresh metadata để thấy hai tool đọc mới. CRUD thư viện ở web, không có tool ghi thư viện trong chat.
- Không stress tải tối đa hoặc nhiều app worker. Đây là nghiệm thu chức năng trên VPS đang chạy; không suy sức chứa từ ca thử nhỏ.
- PR vẫn chưa merge main. Nếu quay lại image cũ, giữ bảng thêm mới; không rollback bằng DROP/reset/restore DB khi chưa có lý do dữ liệu và quy trình riêng.
