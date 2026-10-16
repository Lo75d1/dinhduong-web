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
2. Tạo plugin và kiểm danh sách có **16 công cụ**, gồm `get_workflow` và `start_guest_session`. Cài plugin cá nhân, mở hội thoại Work mới và dùng @ chọn plugin.
3. Yêu cầu gọi `get_workflow`. Chỉ tra kho chung/tính/Excel: `start_guest_session` không cần tài khoản; dùng `accessToken` trong `arguments.sessionToken` cho công cụ tiếp theo. Muốn lưu/mở bản riêng mới kết nối OAuth: đăng nhập Dinh dưỡng 2598, kiểm tên ứng dụng và quyền rồi đồng ý.
4. Nếu đã thêm plugin nhưng phiên không có công cụ: vào plugin → **Refresh**, kiểm lại danh sách và thử trong hội thoại mới. Tên plugin trong chat không chứng minh đã cấp quyền; server phải có lần đổi code thành token thành công. Gói ZIP là lựa chọn thêm.

Nguồn xử lý thiếu công cụ/cập nhật metadata: [Connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt); khai báo quyền và tín hiệu cấp quyền: [Authentication](https://developers.openai.com/plugins/build/auth).

Gói ZIP portable không tự xuất hiện trong thư viện công khai. Đăng ký/thẩm định/public listing là việc riêng; không có ID ứng dụng đã đăng ký giả trong package. Nếu bề mặt hiện tại chưa hỗ trợ cài ZIP, dùng connector và hướng dẫn dưới đây; kiểm tra `get_workflow` trước khi gọi chức năng. [Nguồn cấu trúc và cài thử của OpenAI](https://developers.openai.com/plugins/build/plugins).

## Claude

1. Customize → Connectors → Add custom connector, dùng URL MCP trên.
2. Chỉ tra/tính/Excel: dùng phiên tạm nếu connector cho phép không đăng nhập. Lưu/mở dữ liệu riêng: chọn OAuth và **Register automatically**; không yêu cầu client secret chung. Nếu giao diện bắt buộc OAuth, làm theo giao diện và giải thích giới hạn đó.
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
2. **Chốt:** bản nháp đầu tiên hiện ngày/bữa, từng món và từng thực phẩm/nguyên liệu kèm lượng/đơn vị, số suất/cơ sở/nguồn để điều chỉnh. Không chỉ tên món hoặc link web. RNI có công thức thì hiện đủ thành phần; VDD không có thì ghi rõ, không tự đoán. Có `*` trước mọi số AI tự điền; xác nhận trước khi tính. Lưu khi chọn nhận link bản riêng trên tài khoản; món thay đổi không sửa kho gốc.
3. **Kết quả:** nhận tóm tắt kcal/P–L–G cùng link bản tạm để sửa/tính lại trên web, không cần đăng nhập, có hạn30phút. Không cần lưu tài khoản hoặc tải Excel để dùng link này. Muốn giữ lâu dài mới lưu vào tài khoản; cần Excel thì tải thêm với saveToAccount=false. Chỉ tính thành phần không cần hồ sơ; thiếu mục tiêu không kết luận đạt nhu cầu. Phiếu hỏi ghi24h bám Phụ lục1/2 mục11 QĐ2598/QĐ-BYT, phần chưa biết để —.

## Plugin nào làm gì, kết quả ở đâu?

- Một plugin Dinh dưỡng2598 chứa16 công cụ; không cài mỗi tool thành plugin riêng. Khi chỉ thêm URL MCP, gọi `get_workflow` để nhận hướng dẫn hiện tại; không giả định skill ZIP đã được nạp.
- `get_workflow.toolGuide` chỉ rõ khi dùng, đầu vào, trường kết quả và bước tiếp theo; `recipes` chọn luồng chỉ tính/chỉ Excel/lưu/bệnh lý; `recovery` giải thích400/401/403/404/409/422/429/503 và kết quả rút gọn.
- Gói ZIP có README, SKILL và `references/cong-cu.md` từ cùng hợp đồng với server. Phiên bản hướng dẫn1.0.10. Danh sách và kết quả cũng xem trực tiếp ở trang kết nối.
- Tìm kiếm trả `items`; `get_food/get_dish/get_diet_code` trả một đối tượng trực tiếp. Code như GU01-X khác ID trong kho. `calculate_menu` trả `chatReport` cùng `webUrl/webExpiresAt`, không tự tạo file tải hoặc bản tài khoản.
- API token là bí mật đặt trong header xác thực. `confirmationToken` từ prepare chỉ ràng buộc đầu vào đã duyệt; không thay token API hoặc sự đồng ý của người dùng.

## Token API chỉ tính, không lưu

1. Đăng nhập **Tài khoản → Kết nối ứng dụng → Token API**, đặt tên, hạn1giờ/24giờ/7ngày và tùy chọn xuất Excel. Xác nhận mật khẩu hiện tại để tạo; token chỉ hiển thị một lần, máy chủ lưu hash. Tối đa3 token còn hiệu lực; thu hồi trên cùng trang.
2. Dùng ứng dụng hỗ trợ header `Authorization: Bearer TOKEN_CUA_BAN`, gửi qua HTTPS tới REST `/api/nutrition/v1/...` hoặc MCP. Không đặt token vào URL, QR, JSON đầu vào hay lời nhắn chat. Token không tự tạo khả năng gọi công cụ cho một chat chưa có kết nối.
3. Quyền cố định `nutrition:read` + `nutrition:calculate`; có thể thêm `nutrition:export`, **không có nutrition:write**. Token đọc được dữ liệu riêng của đúng chủ; hết hạn/thu hồi/khóa tài khoản thì bị từ chối. Không refresh, không đếm thành lần kết nối ChatGPT/Claude.
4. Chuẩn bị `{input}` → xem/chốt → tính `{input,confirmationToken}` → nhận báo cáo và link web tạm30phút; không tạo Ration. Cần file thì export với `saveToAccount:false`, nhận link tải tạm10phút; việc giữ bản/file tạm khác lưu thực đơn tài khoản.
5. Nếu giao diện nền tảng không hỗ trợ Bearer token thủ công, tiếp tục dùng OAuth bình thường và luồng chỉ tính; không tắt xác thực hay yêu cầu AI tự dùng công cụ duyệt web để gửi POST.

File sửa trên máy không tự đồng bộ. Khi cần, đăng nhập trang hướng dẫn để tải bản `.xlsx` cuối (tối đa 5 MB), xem preview rồi xác nhận lưu mới hoặc xuất lại. Server đọc đầu vào và tính lại, không tin số tổng/công thức đã có trong file. Không tải file qua URL bất kỳ. Bản đã lưu mở riêng tại `https://dinhduong2598.food/ket-noi-ai/ban-luu` để giữ đúng nhiều ngày và nguồn.

## Kiểm tra kết nối

- `get_workflow` thành công → thử tìm thực phẩm tên có dấu → chọn đúng ID và nguồn.
- Nhập một bản nhỏ → `prepare_menu` → xem → xác nhận → `calculate_menu`.
- Thử dữ liệu thiếu và ngoài kho; kết quả phải báo thiếu/ước lượng.
- Nếu cần lưu: kiểm tra quyền ghi, lưu một lần, mở lại cùng tài khoản. Không thử đọc bản của người khác.
- Nếu chưa có tool hoặc API lỗi, AI phải nói chưa hoàn thành; không tự điền số để thay kết quả server.
- Sau khi ngắt kết nối ở nền tảng, thu hồi quyền tại `https://dinhduong2598.food/ket-noi-ai/authorize/connections` khi muốn vô hiệu hóa token còn hạn. Mất kết nối không xóa bản khẩu phần đã chủ ý lưu.

Ngày đối chiếu tài liệu nền tảng: 15/10/2026; [OpenAI Quickstart](https://developers.openai.com/plugins/quickstart). Tên mục trên giao diện có thể thay đổi; nghiệm thu bằng tài khoản thật, không coi link/QR hoặc kết quả fixture là bằng chứng đã kết nối nền tảng.

## Phiên tạm không cần tài khoản

- Trang tạo thủ công: https://dinhduong2598.food/ket-noi-ai#phien-tam. Token30phút chỉ giữ hash/hạn trong vùng tạm máy chủ; không tạo User, web Session, OAuth client/token hoặc Ration. Khi chuẩn bị/tính/xuất, đầu vào được giữ riêng tối đa30phút để mở link web; không lưu vào tài khoản.
- Plugin dùng chế độ OAuth or no authentication: get_workflow → start_guest_session công khai → truyền accessToken trong arguments.sessionToken cho search/get kho chung, prepare_menu, calculate_menu, export_workbook. Không dùng sessionToken khi đã có OAuth. Token không xuất trong câu trả lời hoặc URL; không hỏi token tài khoản của người dùng.
- REST: POST /api/nutrition/v1/guest-session với JSON {} → dùng Authorization: Bearer accessToken. DELETE cùng URL với Bearer token để kết thúc ngay; hết hạn không tự gia hạn. Link file đã xuất có hạn riêng10phút.
- Phiên tạm không lưu/mở bản cá nhân hoặc thư viện riêng; saveToAccount phải false. Có thể nhận link Excel mà không tạo bản trên tài khoản.
- Hạn mức: tạo6phiên/giờ theo IP qua proxy tin cậy (không có proxy dùng chung một bộ đếm), toàn hệ60phiên/giờ;30yêu cầu/phút/phiên,6lần chuẩn bị/tính/phút,2lần xuất/phút và giới hạn xuất toàn hệ có sẵn.429 giữ đầu vào và chờ Retry-After, không tạo thêm phiên để lách.
- Mỗi kết quả có guidance: stage, instruction, nextTools, requiresUserConfirmation, questions khi cần. needs_input: hỏi phần thiếu; awaiting_user_confirmation: trình review.text rồi dừng chờ; calculated: trả chatReport.summaryText; download_ready: trả downloadUrl ngay. Lỗi có chỉ dẫn khôi phục; confirmationToken không phải bằng chứng người dùng đã đồng ý.
- Cập nhật plugin bằng Refresh/Scan Tools hoặc cài lại gói mới nhất để có công cụ và tham số mới. Nền tảng buộc OAuth riêng có thể vẫn yêu cầu đăng nhập; không khẳng định luồng khách đã chạy trong ChatGPT/Claude chỉ từ kiểm thử máy chủ.

## Dành cho bác sĩ: QR/link và tự mở phiên

- Trang chủ có QR và nút Bắt đầu và xem hướng dẫn. QR/link cùng mở /ket-noi-ai/bat-dau; sao chép lời nhắn ngắn, mở chat đã bật kết nối, dán và gửi. Chat tự gọi get_workflow/start_guest_session theo yêu cầu, giữ token nội bộ. Không bắt người dùng tự tạo token hoặc đọc JSON.
- Chưa có kết nối: trang bắt đầu có mục Lần đầu dùng, chỉ tên nút và địa chỉ server; QR/link không tự cài plugin. Trong ChatGPT ưu tiên OAuth or no authentication để dùng cả phiên tạm và tài khoản, hoặc No authentication khi chỉ dùng phiên tạm.
- Muốn giữ lâu dài: mở /dang-nhap?next=%2Ftai-khoan, chọn Đăng ký mới/Tạo tài khoản hoặc Đăng nhập, rồi quay lại chat kết nối tài khoản và yêu cầu lưu. Đăng nhập web chưa tự gắn tài khoản với chat; nếu kết nối hiện tại chỉ No authentication, thêm kết nối hỗ trợ OAuth. Giữ input, prepare lại bằng identity tài khoản, chờ duyệt trước save; không dùng confirmationToken guest. Trả ration.url để mở lại trong Thực đơn của tôi, không bắt nhập lại hoặc gửi Excel.
- Hướng dẫn web/QR/TXT/skill và workflow.accountUse cùng phiên bản1.0.10. Tùy chọn token thủ công nằm trong phần mở rộng dành cho phần mềm khác, không phải thao tác bắt buộc cho bác sĩ.

## Link sửa/tính lại trên web —1.0.10

- prepare_menu trả webUrl/webExpiresAt cho đầu vào ban đầu, calculate_menu trả link bản đã tính; mở/sửa/tính lại không cần tài khoản. Đầu vào giữ tạm30phút trong vùng riêng, không tạo tài khoản/Ration. Ai có link đầy đủ mở được đúng bản, không mở dữ liệu khác; chỉ chia sẻ theo ý bạn. Link có fragment trao đổi lấy cookie HttpOnly/Secure/SameSiteStrict rồi được gỡ khỏi thanh địa chỉ, không đưa Bearer/OAuth token vào URL/log truy cập.
- Sửa món/thực phẩm/lượng trên web, xem trước/duyệt lại rồi Tính lại để mở bản cập nhật. Bản cũ giữ để đối chiếu. Sao chép link đầy đủ bằng nút trên trang; địa chỉ có ID rút gọn chỉ mở lại được trong trình duyệt đã nhận quyền. Excel giữ làm nút tải thêm.
- Chỉ tra kho chung trong bản tạm; muốn lưu tài khoản thì đăng nhập trong tab mới, chuẩn bị bản bằng identity tài khoản và xác nhận lại, không dùng ticket guest để save. Phiên/browser link không đọc thư viện riêng hoặc tự nâng scope. Mỗi yêu cầu giữ nguyên hạn dùng, không gia hạn khi mở.
- Món luộc/hấp: hỏi chọn nước chấm hoặc không dùng và lượng thực ăn, tra ID/nguồn thật và tính cùng bữa; không cộng trùng gia vị. Hỏi ghi24giờ không tự thêm nước chấm chưa ăn.

- Link bản tạm mở trực tiếp trang Tính khẩu phần, nạp sẵn món và nguyên liệu, hai bước Nhập khẩu phần / Kết quả. Không ghi đè bản nhập thủ công trên máy. Link cũ /ket-noi-ai/ban-tam tiếp tục mở cùng giao diện.
