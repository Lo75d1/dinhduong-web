# Công cụ kho mẫu ổn định trước và sau ủy quyền

## Vấn đề và cách xử lý

Trước đây, `tools/list` chỉ trả công cụ kho mẫu sau khi phiên OAuth có grant;
grant chỉ đọc còn ẩn công cụ lưu. Client quét công cụ trước khi cấp quyền có thể
giữ danh mục thiếu. Hướng dẫn yêu cầu tải lại công cụ cũng dễ bị hiểu thành ngắt
và đăng nhập lại, trong khi grant được ràng buộc với đúng OAuth family.

MCP nay công bố cố định **20 mô tả công cụ**: 16 công cụ khẩu phần và 4 công cụ
kho mẫu, kể cả lần quét ẩn danh. Bốn công cụ kho mẫu khai báo OAuth bắt buộc. Việc
công bố tên/schema không trả dữ liệu mẫu, nội dung hướng dẫn Admin hoặc phiên kết
nối. Thực thi vẫn kiểm tra token, tài khoản hoạt động, vai trò ADMIN hiện tại,
grant đúng user/client/family, hạn dùng và quyền đọc/ghi ở mỗi lần gọi; ghi vẫn
kiểm tra lại trong transaction. Không có migration hay thay đổi scope OAuth.

Thiếu grant hoặc chỉ có quyền đọc khi gọi lưu là lỗi nghiệp vụ MCP:
`isError:true`, `error=menu_library_access`, `status=403` trong kết quả HTTP 200,
có URL cấp quyền và hướng dẫn giữ nguyên kết nối. Không phát OAuth challenge cho
lỗi này. Token OAuth thực sự thiếu/sai/hết hạn vẫn đi qua xử lý xác thực hiện có.
REST Admin giữ HTTP 401/403 như trước và thêm hướng dẫn với lỗi quyền kho mẫu.

Mỗi family có mã đối chiếu 12 ký tự lấy từ SHA-256, hiển thị trên trang ủy quyền,
trong lỗi thiếu grant/quyền ghi và workflow đã được phép đọc. Đây chỉ là nhãn,
không phải token. Đổi access token trong cùng family giữ mã; family mới có mã
khác. Trang cấp quyền đổi nút thành “Làm mới danh sách” và hướng dẫn dùng tiếp
cuộc chat hiện tại sau khi cấp quyền.

## Giao thức và cập nhật client

Giữ `listChanged:false`: endpoint hiện trả JSON theo từng yêu cầu và chưa có kênh
SSE/subscription đẩy thông báo. Không khai báo khả năng chưa thực thi. Grant không
còn thay đổi danh mục nên không cần list-changed khi cấp hay thu hồi quyền.

Sau khi triển khai thay đổi danh mục này, client đã giữ bản cũ có thể cần Refresh
metadata một lần trên kết nối hiện có. Không xóa hoặc ngắt kết nối chỉ để nhận
grant. Nếu OAuth thật sự tạo family mới, Admin phải chọn đúng mã mới; quyền cũ
không tự chuyển. Chưa có log nền tảng/phiên thực tế để khẳng định thao tác Refresh
của người dùng đã tạo family mới; kiểm thử dưới đây xác nhận quy tắc máy chủ.

Nguồn đối chiếu ngày 21/10/2026:

- [MCP 2025-11-25: tools, tool errors, list-changed](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- [OpenAI: khai báo OAuth và kiểm tra trong handler](https://developers.openai.com/plugins/build/auth)
- [OpenAI: Refresh metadata sau thay đổi danh mục](https://developers.openai.com/plugins/deploy/connect-chatgpt)

## Kiểm tra đã chạy

- `npm run test:menu-library`: 153 kiểm tra nguồn, hợp đồng, hướng dẫn và quyền.
- `npm run test:menu-library-write`: 214 kiểm tra PGlite/route thật, gồm danh mục
  giống nhau trước grant, chỉ đọc, được ghi, hết hạn, thu hồi và đổi token; chặn
  guest/người không phải Admin/phiên khác; dùng token cũ đọc và lưu sau cấp quyền;
  mã phiên khớp trang Admin; lỗi thiếu grant không tạo OAuth challenge.
- `node --import tsx scripts/test-nutrition-chat-http.ts`: 454 kiểm tra REST,
  legacy/modern MCP, xác thực, owner, CSRF, Origin, scope và nhập workbook.
- `node --import tsx scripts/test-nutrition-oauth-db.ts`: 261 kiểm tra migration,
  ACL/RLS, token hash, refresh rotation/reuse, thu hồi và rate limit SQL.
- `npx tsc --noEmit`, ESLint các tệp thay đổi, `git diff --check` và production
  build đều đạt.

PGlite/session fixture không phải tài khoản Admin thật hoặc database production.
Chưa nghiệm thu phiên ChatGPT/Claude thật, giao diện đồng ý OAuth hay triển khai
website trong đợt sửa này. Không cập nhật nhật ký vận hành `PROJECT_STATUS.md`.
