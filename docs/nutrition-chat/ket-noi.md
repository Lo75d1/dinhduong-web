# Kết nối Dinh dưỡng 2598 với ChatGPT và Claude

- Trang hướng dẫn/QR: https://dinhduong2598.food/ket-noi-ai
- URL MCP: `https://dinhduong2598.food/api/nutrition/v1/mcp`.
- QR/link mở hướng dẫn. Skill dạy quy trình; connector cung cấp công cụ. Tài khoản riêng và màn hình OAuth cấp quyền truy cập dữ liệu. Không dán mật khẩu hoặc token vào hội thoại.

## ChatGPT

1. Mở Plugins, thêm custom MCP server bằng URL trên và chọn OAuth.
2. Đăng nhập Dinh dưỡng 2598, kiểm tra tên ứng dụng và quyền rồi đồng ý.
3. Bật kết nối trong hội thoại. Cài gói plugin/skill trên giao diện hỗ trợ cài gói riêng. Nói: “Dùng Dinh dưỡng 2598 tính khẩu phần hôm nay, hỏi lại phần chưa rõ trước khi chốt”.

Gói ZIP portable không tự xuất hiện trong thư viện công khai. Đăng ký/thẩm định/public listing là việc riêng; không có ID ứng dụng đã đăng ký giả trong package. Nếu bề mặt hiện tại chưa hỗ trợ cài ZIP, dùng connector và hướng dẫn dưới đây; kiểm tra `get_workflow` trước khi gọi chức năng. [Nguồn cấu trúc và cài thử của OpenAI](https://developers.openai.com/plugins/build/plugins).

## Claude

1. Customize → Connectors → Add custom connector, dùng URL MCP trên.
2. Chọn đăng nhập OAuth và **Register automatically** vì máy chủ sử dụng đăng ký động DCR; không yêu cầu client secret chung.
3. Tải `dinh-duong-2598-skill.zip`; vào Customize → Skills → Create skill → Upload a skill. Bật skill và connector trong hội thoại.

Quyền thêm connector/skill phụ thuộc tài khoản và quản trị tổ chức. [Nguồn connector của Claude](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp); [nguồn upload skill](https://support.claude.com/en/articles/12512180-use-skills-in-claude).

## Quyền

| Quyền | Chức năng |
| --- | --- |
| `nutrition:read` | Tra kho thực phẩm/món và đọc bản cá nhân của tài khoản đã cấp quyền. |
| `nutrition:calculate` | Chuẩn bị/xác nhận/tính khẩu phần. |
| `nutrition:write` | Lưu mới hoặc sửa bản cá nhân; không có quyền sửa kho Food/Dish. |
| `nutrition:export` | Tạo link tải Excel có thời hạn. |

Muốn lưu cần kết nối có `nutrition:write`. Nếu đã cấp thiếu quyền, kết nối lại với quyền cần dùng. Không yêu cầu quyền ghi khi chỉ tra/tính/xuất.

## Cách làm việc

1. **Làm rõ:** AI tra data, tách công thức và hỏi lượng/số suất/khối lượng sống hay chín. Món chưa có công thức hoặc nguyên liệu tham chiếu phải ghi là ước lượng. Nhãn ngoài kho chỉ nhập những chất có số và đơn vị được xác minh.
2. **Chốt:** xem bản chuẩn bị và cảnh báo, xác nhận trước khi tính. Lưu chỉ khi yêu cầu; món thay đổi thuộc bản riêng, không thay kho gốc.
3. **Kết quả:** số từ server kèm nguồn và chất còn thiếu; chọn nhận Excel. Chỉ tính thành phần không cần hồ sơ, không kết luận đạt nhu cầu khi chưa có mục tiêu.

File sửa trên máy không tự đồng bộ. Khi cần, đăng nhập trang hướng dẫn để tải bản `.xlsx` cuối (tối đa 5 MB), xem preview rồi xác nhận lưu mới hoặc xuất lại. Server đọc đầu vào và tính lại, không tin số tổng/công thức đã có trong file. Không tải file qua URL bất kỳ. Bản đã lưu mở riêng tại `https://dinhduong2598.food/ket-noi-ai/ban-luu` để giữ đúng nhiều ngày và nguồn.

## Kiểm tra kết nối

- `get_workflow` thành công → thử tìm thực phẩm tên có dấu → chọn đúng ID và nguồn.
- Nhập một bản nhỏ → `prepare_menu` → xem → xác nhận → `calculate_menu`.
- Thử dữ liệu thiếu và ngoài kho; kết quả phải báo thiếu/ước lượng.
- Nếu cần lưu: kiểm tra quyền ghi, lưu một lần, mở lại cùng tài khoản. Không thử đọc bản của người khác.
- Nếu chưa có tool hoặc API lỗi, AI phải nói chưa hoàn thành; không tự điền số để thay kết quả server.
- Sau khi ngắt kết nối ở nền tảng, thu hồi quyền tại `https://dinhduong2598.food/ket-noi-ai/authorize/connections` khi muốn vô hiệu hóa token còn hạn. Mất kết nối không xóa bản khẩu phần đã chủ ý lưu.

Ngày đối chiếu tài liệu nền tảng: 14/10/2026. Tên mục trên giao diện có thể thay đổi; nghiệm thu bằng tài khoản thật sau khi VPS phát hành.
