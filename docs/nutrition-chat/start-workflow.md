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
