# Kết nối Dinh dưỡng 2598 với ChatGPT và Claude

- Link dán vào chat / link trong QR: https://dinhduong2598.food/ket-noi-ai/bat-dau
- Bản chữ cho AI đọc: https://dinhduong2598.food/ket-noi-ai/bat-dau/huong-dan.txt
- Tải QR: https://dinhduong2598.food/ket-noi-ai/bat-dau/qr.png
- Trang cài kết nối và gửi Excel: https://dinhduong2598.food/ket-noi-ai
- URL MCP: `https://dinhduong2598.food/api/nutrition/v1/mcp`.
- Quét QR bằng máy ảnh, sao chép lời nhắn trên trang bắt đầu, mở chat đã bật kết nối rồi dán/gửi. Chỉ dán link cũng cho AI đọc hướng dẫn nếu chat có công cụ mở web; lời nhắn tự đủ là phương án khi AI không mở được link.
- QR/link không tự cài plugin/cấp quyền. Skill dạy quy trình; connector cung cấp công cụ. Tài khoản riêng và màn hình OAuth cấp quyền truy cập dữ liệu. Không dán mật khẩu hoặc token vào hội thoại.

## ChatGPT

1. Mở Plugins, thêm custom MCP server bằng URL trên. Chọn **OAuth or no authentication** nếu có, hoặc OAuth.
2. Tạo plugin và kiểm danh sách có **13 công cụ**, gồm `get_workflow`. Cài plugin cá nhân, mở hội thoại Work mới và dùng @ chọn plugin.
3. Yêu cầu gọi `get_workflow` để kiểm tra; công cụ hướng dẫn và discovery public không cần token. Khi gọi công cụ dữ liệu, ChatGPT yêu cầu kết nối: đăng nhập Dinh dưỡng 2598, kiểm tên ứng dụng và quyền rồi đồng ý.
4. Nếu đã thêm plugin nhưng phiên không có công cụ: vào plugin → **Refresh**, kiểm lại danh sách và thử trong hội thoại mới. Tên plugin trong chat không chứng minh đã cấp quyền; server phải có lần đổi code thành token thành công. Gói ZIP là lựa chọn thêm.

Nguồn xử lý thiếu công cụ/cập nhật metadata: [Connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt); khai báo quyền và tín hiệu cấp quyền: [Authentication](https://developers.openai.com/plugins/build/auth).

Gói ZIP portable không tự xuất hiện trong thư viện công khai. Đăng ký/thẩm định/public listing là việc riêng; không có ID ứng dụng đã đăng ký giả trong package. Nếu bề mặt hiện tại chưa hỗ trợ cài ZIP, dùng connector và hướng dẫn dưới đây; kiểm tra `get_workflow` trước khi gọi chức năng. [Nguồn cấu trúc và cài thử của OpenAI](https://developers.openai.com/plugins/build/plugins).

## Claude

1. Customize → Connectors → Add custom connector, dùng URL MCP trên.
2. Chọn đăng nhập OAuth và **Register automatically** vì máy chủ sử dụng đăng ký động DCR; không yêu cầu client secret chung.
3. Bật connector trong hội thoại và gửi lời nhắn bắt đầu. Skill ZIP là lựa chọn thêm: vào Customize → Skills → Create skill → Upload a skill để cài `dinh-duong-2598-skill.zip`.

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

- **Tài khoản → Dữ liệu của tôi** có **Thực đơn của tôi**, **Thực phẩm của tôi**, **Món ăn của tôi**. Thực phẩm/công thức riêng thêm, sửa độc lập và dùng lại trong nhiều thực đơn.
- Chat tra bằng `list_personal_library` / `get_personal_library_item`; thêm/sửa/xóa thư viện trên web. Sửa thư viện không tự thay những thực đơn đã lưu.

1. **Làm rõ:** AI tra data, tách công thức và hỏi lượng/số suất/khối lượng sống hay chín. Món chưa có công thức hoặc nguyên liệu tham chiếu phải ghi là ước lượng. Nhãn ngoài kho chỉ nhập những chất có số và đơn vị được xác minh.
2. **Chốt:** xem review món/lượng/suất/nguồn gọn, có `*` trước mọi số AI tự điền; xác nhận trước khi tính. Lưu khi chọn nhận link bản riêng trên tài khoản; món thay đổi không sửa kho gốc.
3. **Kết quả:** nhận tóm tắt kcal/P–L–G và link bản riêng để xem phân tích, chỉnh và dùng lại trên web. Excel chỉ tạo khi cần tải, không bắt tải file để xem số. Chỉ tính thành phần không cần hồ sơ; thiếu mục tiêu không kết luận đạt nhu cầu. Phiếu hỏi ghi 24h bám Phụ lục 1/2 mục 11 QĐ 2598/QĐ-BYT, phần chưa biết để —.

File sửa trên máy không tự đồng bộ. Khi cần, đăng nhập trang hướng dẫn để tải bản `.xlsx` cuối (tối đa 5 MB), xem preview rồi xác nhận lưu mới hoặc xuất lại. Server đọc đầu vào và tính lại, không tin số tổng/công thức đã có trong file. Không tải file qua URL bất kỳ. Bản đã lưu mở riêng tại `https://dinhduong2598.food/ket-noi-ai/ban-luu` để giữ đúng nhiều ngày và nguồn.

## Kiểm tra kết nối

- `get_workflow` thành công → thử tìm thực phẩm tên có dấu → chọn đúng ID và nguồn.
- Nhập một bản nhỏ → `prepare_menu` → xem → xác nhận → `calculate_menu`.
- Thử dữ liệu thiếu và ngoài kho; kết quả phải báo thiếu/ước lượng.
- Nếu cần lưu: kiểm tra quyền ghi, lưu một lần, mở lại cùng tài khoản. Không thử đọc bản của người khác.
- Nếu chưa có tool hoặc API lỗi, AI phải nói chưa hoàn thành; không tự điền số để thay kết quả server.
- Sau khi ngắt kết nối ở nền tảng, thu hồi quyền tại `https://dinhduong2598.food/ket-noi-ai/authorize/connections` khi muốn vô hiệu hóa token còn hạn. Mất kết nối không xóa bản khẩu phần đã chủ ý lưu.

Ngày đối chiếu tài liệu nền tảng: 15/10/2026; [OpenAI Quickstart](https://developers.openai.com/plugins/quickstart). Tên mục trên giao diện có thể thay đổi; nghiệm thu bằng tài khoản thật, không coi link/QR hoặc kết quả fixture là bằng chứng đã kết nối nền tảng.
