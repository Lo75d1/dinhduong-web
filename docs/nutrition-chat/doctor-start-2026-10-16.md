# Hướng dẫn QR và dùng lâu dài cho bác sĩ — 16/10/2026

## Yêu cầu và thay đổi

- Người dùng chính là bác sĩ/nhân viên y tế có thể chưa quen kỹ thuật: quét QR hoặc dán link, chat đọc hướng dẫn từ đầu đến cuối và tự lấy phiên tạm. Khi cần lưu/dùng lâu dài, chỉ hướng dẫn tạo/đăng nhập tài khoản và kết nối; không tự tạo tài khoản hoặc lưu dữ liệu cho họ.
- Trang chủ có khối hướng dẫn ngay sau phần giới thiệu, trước danh sách chức năng: QR200px, ba bước, nút bắt đầu và link dùng lâu dài. Giữ nút suất ăn bệnh viện, dữ liệu, liên hệ và phần khác.
- `/ket-noi-ai/bat-dau`: lời nhắn ngắn cho người dùng, nút sao chép/mở ChatGPT/Claude, ba bước, hướng dẫn bật kết nối lần đầu theo tên nút. Gỡ câu cũ bắt OAuth để tính; phân biệt QR/link đọc hướng dẫn với plugin/công cụ đã bật. Bản đầy đủ vẫn có trong phần mở rộng khi chat không đọc được link.
- `LongTermUse` dùng lại trên trang bắt đầu và kết nối: Đăng ký mới/Đăng nhập → quay lại chat kết nối tài khoản → yêu cầu lưu → xác nhận bản → Thực đơn của tôi. Đăng nhập website không tự gắn tài khoản với chat. Nếu trước đó chỉ dùng No authentication thì cần kết nối có OAuth để dùng dữ liệu riêng.
- Chat giữ input khi chuyển guest sang tài khoản, prepare bằng identity tài khoản rồi chờ duyệt trước save; ticket guest không dùng để lưu tài khoản. Chỉ tính/Excel vẫn không cần tài khoản Dinh dưỡng 2598. Trạng thái trống của danh sách bản lưu không còn nói phải xuất/lưu kèm Excel.
- Token thủ công chuyển vào details dành cho phần mềm khác, không nằm ở luồng chính dành cho bác sĩ. Không thay API tạo phiên, limiter, bộ tính, export/import hoặc cơ chế xác thực. Không tạo tài khoản mẫu/engine/bảng/migration mới, không sửa Food/Dish.
- Workflow thêm accountUse, hướng dẫn tự xử lý phiên theo yêu cầu và cách nói bằng tên nút; QR/TXT/plugin/2skill/manifest dùng cùng1.0.6,16tool. Cần Refresh/Scan Tools hoặc cập nhật gói để nhận hướng dẫn mới. Không tự publish plugin hoặc sửa kết nối đã cài trên tài khoản nền tảng.

## Kiểm chứng

- Prisma generate, TypeScript và ESLint toàn bộ file mã sửa đạt. HTTP308 và guide/package86 đạt; React SSR20 kiểm trang bắt đầu/kết nối, lời nhắn ngắn không chứa accessToken/confirmationToken, bản dự phòng, link tài khoản và token thủ công đóng mặc định. Không thay bộ tính hoặc Excel nên không mở lại các kiểm định số liệu/native Excel đã đạt trước đó.
- Đọc trạng thái VPS mới trước deploy: checkout1342f0e/app92b4eb8 healthy,5bảng nguồn/count/digest và25migration khớp. Tại thời điểm kiểm, RAM2972MB/available2389MB, đĩa40GB/trống17GB; đây là trạng thái quan sát, không suy từ cấu hình cũ hoặc kết luận nguyên nhân sự cố trước.
- Linux build/deploy đầu app14dd7cd và cuối app7d3ecf11df8e5750e02fca9bc9d024a8c5789f2c healthy. Backup cuối `/opt/dinhduong-release-backups/nutrition-doctor-reuse-20261016-164450-codex`. Cả hai lần giữ checksum/count5bảng nguồn,25migration và env/layout/Caddy/Google; không migration. Swap build tạm đã tắt/xóa, timer active/enabled, không OOM.
- **HTTPS86**: trang chủ/QR/trang bắt đầu/kết nối/TXT, lời nhắn không có tham số kỹ thuật, mục tài khoản/đăng ký, account redirect và saved API401 khi không đăng nhập; workflow1.0.6/accountUse,16tool, SHA ZIP khớp, skill mới. Gọi start_guest_session qua MCP không tài khoản và search_foods với sessionToken thành công, save guest bị chặn, thu hồi thành công.10client assets tải200 và có clipboard handler; account/session/Ration/OAuth count trước/sau không đổi. Token thử đã dọn; không tạo tài khoản thật.
- **Bản cuối smoke19** với9client assets: trạng thái trống mới đã có trong bundle, trang chủ/trang bắt đầu và workflow/accountUse đúng, app healthy, cấu hình giữ nguyên, timer active/enabled, swap0. Không gọi lại xuất file nặng cho thay đổi hướng dẫn.
- QR PNG720x720 tải được và cùng URL `/ket-noi-ai/bat-dau`; chưa giải mã bằng camera điện thoại. CUA inventory rỗng nên chưa kiểm click/clipboard thực, hydration/mobile hoặc hội thoại ChatGPT/Claude thật. Không dùng render React/HTTP để tuyên bố đã nghiệm thu hành vi AI.
- Nhánh codex/nutrition-chat-api/PR#4 vẫn draft, chưa merge main; triển khai theo quyền chủ dự án đã cấp trong hội thoại. Không thay luật repo hoặc mở luồng duyệt mới.

## Nguồn nền tảng

- [OpenAI Quickstart](https://developers.openai.com/plugins/quickstart): thêm MCP, No authentication cho công cụ công khai, cài plugin và bật trong cuộc chat Work bằng @.
- [Connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt): Refresh khi metadata đổi và kiểm từ đầu đến cuối sau cài; [Authentication](https://developers.openai.com/plugins/build/auth): công cụ public/mixed/OAuth và UI cấp quyền. Không có bằng chứng QR/link tự cài công cụ vào cuộc chat.
