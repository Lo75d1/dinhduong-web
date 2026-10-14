# QR / link bắt đầu hội thoại

- Điểm bắt đầu chung: `/ket-noi-ai/bat-dau`; menu/trang chủ và QR cùng đưa về đây. Trang cài kết nối/nhập lại Excel `/ket-noi-ai` vẫn có.
- Bản AI đọc không cần JavaScript: `/ket-noi-ai/bat-dau/huong-dan.txt`; public, ngoài vùng `/api/` bị robots chặn, không chứa dữ liệu riêng hoặc bí mật. HTML cũng có hướng dẫn đầy đủ trong details server-rendered.
- QR PNG 720 px, margin 4/error correction Q, màu xanh rêu; chỉ chứa URL bắt đầu, không chứa token/user ID/menu. Tải QR để in/chia sẻ; quét bằng máy ảnh mở trang, sao chép lời nhắn, mở chat đã bật kết nối và gửi.
- `start-guide.ts` tái dùng `NUTRITION_WORKFLOW`/giới hạn hiện có, tạo liên kết/lời nhắn/hướng dẫn cho cả HTML và bản chữ. Không dựng API tính, bảng nguồn, auth hoặc storage khác.
- Lời nhắn có chỉ dẫn tự đủ khi AI không mở được link: kiểm tool, hỏi tối đa 3 phần còn thiếu, không hỏi hồ sơ khi chỉ tính, preview/xác nhận trước tính, chỉ lưu khi người dùng muốn, trả Excel từ công cụ thật.
- Link không tự cài/cấp quyền. ChatGPT cần plugin cá nhân đã cài, hội thoại Work và @ chọn plugin; Claude cần connector được bật. Tài khoản/tổ chức quyết định quyền cài. Thiếu công cụ thì giữ bản nháp và báo tra/tính/lưu/xuất chưa xong.
- Nguồn đối chiếu 15/10/2026: [OpenAI Quickstart](https://developers.openai.com/plugins/quickstart), [OpenAI package/auth](https://developers.openai.com/plugins/build/plugins), [Claude remote MCP](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).
- Copy thành công mới báo đã sao chép; clipboard bị chặn thì giữ textarea/input readonly để chọn/copy thủ công. Mở ChatGPT/Claude bằng link riêng; không dùng deep link tự điền chưa được xác minh, không gửi nội dung tới nền tảng trước khi người dùng dán/gửi.
- Chỉ đọc public guide/QR không tăng bộ đếm OAuth. Pipeline prepare/confirm/calculate/save/export/Excel reimport và kiểm owner/scope/nguồn giữ nguyên. Không backfill lượt test vào thống kê.
- Kiểm decode dùng jsQR 1.4.0 trong `evidence/.../qr-decoder` ignore, PNGJS sẵn có; không thêm dependency vào app/package.json hoặc image. Verifier route/QR/hướng dẫn có 41 checks; decode 720/180/128 đúng URL, alternate HTTPS origin và cấu hình origin sai cũng kiểm. Không có DB write trong verifier.
- Nghiệm thu nền tảng với tài khoản thật vẫn cần người dùng cấp quyền. Không coi giải mã QR, copy prompt hoặc GET guide thành công là chứng minh ChatGPT/Claude đã thực thi tính/xuất.

## Nghiệm thu VPS — 15/10/2026

- Nhánh `codex/nutrition-chat-api`, app build từ `461d8bd`; PR #4 vẫn draft/chưa merge main. Triển khai theo ủy quyền trực tiếp đã có của người dùng. Lần này không chạy migration/seed hoặc sửa Food/Dish.
- `prisma generate`, `tsc --noEmit`, ESLint file mới/sửa với `--max-warnings=0`, `git diff --check` và app build Linux/TypeScript đạt. 41 checks hướng dẫn/route/QR là kiểm tra chỉ đọc riêng, không cộng với 41 kiểm tra OAuth/MCP/Excel HTTPS lần triển khai API đầu.
- HTTPS `/`, `/ket-noi-ai`, `/ket-noi-ai/bat-dau`, bản chữ, QR, health và file Google đều 200. Trang chủ có đúng hai href tới trang bắt đầu. Hướng dẫn text/plain UTF-8 9.242 bytes, PNG image/png 5.307 bytes/720×720; PNG tải từ VPS được jsQR giải mã đúng `https://dinhduong2598.food/ket-noi-ai/bat-dau`.
- Browser thật kiểm ba nút sao chép: chỉ báo thành công sau Clipboard API resolve; nội dung readonly đúng lời nhắn/link/MCP. Link “Xem cách kết nối ChatGPT / Claude →” mở `/ket-noi-ai#cai-ket-noi`. QR tải được, ảnh naturalWidth 720. Panel 319 px/document 304 px không tràn ngang.
- Giới hạn clipboard: API đọc của bridge trình duyệt trả chuỗi rỗng, còn navigator.clipboard.readText không khả dụng trong công cụ đọc; chưa chứng minh độc lập bytes trong clipboard hệ điều hành. Trang vẫn cho chọn/copy thủ công khi trình duyệt chặn ghi.
- Giới hạn đọc link: công cụ web trong phiên trả “not accessible via this tool” cho HTML/bản chữ, trong khi Node HTTPS và browser thật đọc được. Không suy đoán nguyên nhân, không cam kết mọi hội thoại sẽ đọc được URL. Lời nhắn sao chép có chỉ dẫn tự đủ và báo rõ nếu thiếu công cụ/kết nối.
- `/api/site-settings` vẫn ChatGPT 0/Claude 0. Không tạo lượt cấp quyền giả để thử QR/copy. Chưa nghiệm thu tài khoản ChatGPT/Claude thật.
- Backup `/opt/dinhduong-release-backups/nutrition-start-20261015-055411-codex`: env/Caddy/layout/file Google/patch/stash và image rollback giữ riêng. Apply lại layout VPS chỉ thêm đúng 6 dòng menu “Thông tin mới”; Caddy/file Google không đổi. Temporary swap 1 GiB chỉ phục vụ build đã gỡ. Maintenance image `3fb8cc3` giữ nguyên.
- Bằng chứng cục bộ được ignore khỏi Git/Docker: `evidence/nutrition-chat/start-verification.json`, `live-start-summary.json`, `live-start-qr.png`, `live-start-guide.txt`, `vps-start-flow.jpg`.
