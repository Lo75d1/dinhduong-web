# Công cụ, kết quả và cách xử lý

Phiên bản hướng dẫn: 1.0.4. Một plugin Dinh dưỡng 2598 chứa 15 công cụ; không phải cài mỗi công cụ thành một plugin.

Gọi get_workflow một lần khi bắt đầu yêu cầu dinh dưỡng. Mặc định chỉ tính và trả báo cáo trong chat, không lưu tài khoản. Có quyền ghi không đồng nghĩa người dùng yêu cầu lưu. Không gọi lại cùng truy vấn khi không có thay đổi.

## get_workflow — Đọc hướng dẫn sử dụng

- Khi dùng: Bắt đầu hoặc cần hiểu quy trình/tham số/lỗi.
- Đầu vào: {}
- Kết quả: menuSchema là hợp đồng đầu vào; toolGuide giải thích từng công cụ; recipes là các luồng; recovery hướng dẫn xử lý lỗi.
- Tiếp theo: Chọn luồng theo yêu cầu, không hỏi lại dữ kiện đã có.

## search_foods — Tìm thực phẩm hoặc món VDD

- Khi dùng: Cần nguyên liệu; hoặc món hoàn chỉnh VDD với type=MA, source=VDD.
- Đầu vào: q là tên cần tìm, không phải cả câu; type/source/fields/limit/offset tùy chọn.
- Kết quả: items[] là Food có id/name/unit/source/nutrients; total và nextOffset để phân trang.
- Tiếp theo: Đối chiếu tên/nguồn/trạng thái rồi dùng get_food. items rỗng là không tìm thấy, khác lỗi máy chủ.

## get_food — Đọc thực phẩm theo ID

- Khi dùng: Đã chọn ứng viên thật hoặc cần đủ vi chất/đơn vị/nguồn.
- Đầu vào: {id} lấy từ search_foods, không dùng tên món thay ID.
- Kết quả: Một Food trực tiếp, không có items: id/name/unit/nutrients/source. Số trên cơ sở100g hoặc100ml, null là thiếu.
- Tiếp theo: Dùng foodId trong dòng khẩu phần; không tự đưa cả Food vào customFood.

## search_dishes — Tìm công thức món RNI

- Khi dùng: Người dùng muốn món ăn/thực đơn; tìm công thức thật trước khi tự đề xuất.
- Đầu vào: {q,limit?}, q là tên món.
- Kết quả: items[] gồm ứng viên có id/name/source; không phải khẩu phần đã tính.
- Tiếp theo: Gọi get_dish theo ID đã chọn, không coi dòng đầu là lựa chọn đã xác nhận.

## get_dish — Đọc công thức và nguyên liệu

- Khi dùng: Cần thành phần của một món RNI đã tìm thấy.
- Đầu vào: {id} từ search_dishes.
- Kết quả: Một món trực tiếp với ingredients[] và liên kết food. Đọc số lượng/cơ sở nguồn; mục chưa liên kết cần làm rõ.
- Tiếp theo: Tạo từng dòng nguyên liệu với Food ID thật, lượng đã làm rõ và recipeSource.dishId. Không coi định lượng nguồn mặc định bằng một suất.

## search_diet_codes — Tìm mã chế độ ăn

- Khi dùng: Người dùng có bệnh lý/chỉ định và cần tra mã, tên hoặc nhóm đối tượng.
- Đầu vào: q/targetGroup/diseaseGroup/limit/offset tùy chọn; targetGroup=NguoiLon hoặc TreEm.
- Kết quả: items[] gồm id/code/name/targetGroup/diseaseGroup; total/nextOffset. Không phải chỉ định điều trị.
- Tiếp theo: Đọc get_diet_code, trình lựa chọn phù hợp dữ kiện và chờ xác nhận; không tự chọn mã đầu.

## get_diet_code — Đọc mã chế độ ăn và ghi chú

- Khi dùng: Đã có ID ứng viên hoặc mã do người dùng cung cấp cần kiểm chứng.
- Đầu vào: {id} lấy từ search_diet_codes, code như GU01-X không phải id.
- Kết quả: Một mã trực tiếp: id/code/name/ranges/note/source/qualityWarnings/rawWater. ranges là khoảng tham khảo, không tự thành mục tiêu cá nhân.
- Tiếp theo: Sau xác nhận điền clinicalContext.dietCodeId/targetGroup/selection; chưa chốt dùng proposed. Không tự đổi đơn vị nước hay ghép ngưỡng nhiều mã.

## list_personal_library — Tìm trong thư viện riêng

- Khi dùng: Người dùng muốn dùng lại thực phẩm hoặc món của họ.
- Đầu vào: {kind:food|dish,q?,page?}; cần tài khoản đã kết nối.
- Kết quả: Danh sách mục riêng theo chủ, chưa phải đầu vào đã duyệt.
- Tiếp theo: Đọc get_personal_library_item. Không cần gọi khi chỉ dùng kho chung.

## get_personal_library_item — Đọc thực phẩm hoặc món riêng

- Khi dùng: Đã chọn ID thuộc thư viện người đang kết nối.
- Đầu vào: {kind:food|dish,id} từ danh sách thư viện.
- Kết quả: content của mục: food dùng như customFood; dish có content.days[0].rows.
- Tiếp theo: Giữ nguồn/phiên bản, cấp ID dòng riêng, đặt ngày/bữa/lượng rồi prepare. Không phải tool ghi/sửa thư viện.

## prepare_menu — Chuẩn bị bản để duyệt

- Khi dùng: Đã có đầu vào theo menuSchema; cần kiểm phần thiếu hoặc chuẩn bị chốt.
- Đầu vào: {input}; mode=menu hoặc recall24h; mỗi ngày có id,label,date,rows, date chưa biết dùng chuỗi rỗng.
- Kết quả: input chuẩn hóa, preview.missingInputs, review.text, review.truncated, confirmationToken và expiresAt. Đây chưa phải người dùng đồng ý.
- Tiếp theo: Sửa các missingInputs ảnh hưởng tính rồi prepare lại; khi đủ, trình review.text một lần và chờ đồng ý. Dùng input/token cùng phản hồi cho calculate/export/save.

## calculate_menu — Tính và trả báo cáo, không lưu

- Khi dùng: Người dùng đã đồng ý bản prepare hiện hành; cần xem số liệu.
- Đầu vào: {input,confirmationToken} từ cùng lần prepare; không gửi thêm saveToAccount.
- Kết quả: chatReport.summaryText để trả ngắn; chatReport.text để xem đầy đủ; totals/dayTotals/analysis/clinicalAssessment và phần thiếu. Không có link tải hay link bản lưu.
- Tiếp theo: Trả số liệu ngay. Kết thúc nếu chỉ tính; export khi cần file, save chỉ khi người dùng yêu cầu lưu. Không bắt lưu để hoàn tất tính.

## save_menu — Lưu hoặc cập nhật thực đơn riêng

- Khi dùng: Chỉ khi người dùng yêu cầu lưu vào tài khoản; cần nutrition:write.
- Đầu vào: {input,confirmationToken,idempotencyKey}; cập nhật thêm rationId và expectedRevision đã đọc.
- Kết quả: ration.id/title/revision/url và input/preview; ration.url là link lâu dài yêu cầu đăng nhập đúng chủ.
- Tiếp theo: Trả ration.url thật. Thử lại cùng thao tác giữ idempotencyKey; khác nội dung dùng khóa mới. Không gọi trong luồng chỉ tính hoặc chỉ tải file.

## list_saved_menus — Tìm thực đơn đã lưu

- Khi dùng: Người dùng muốn mở/dùng lại bản trong tài khoản.
- Đầu vào: {offset?}; không nhận ownerId hay tài khoản khác.
- Kết quả: items[] và nextOffset; chỉ bản thuộc người đang kết nối.
- Tiếp theo: Chọn đúng ID rồi get_saved_menu; có ID trong link sẵn thì mở trực tiếp, không cần liệt kê.

## get_saved_menu — Mở và tính lại bản đã lưu

- Khi dùng: Có ID bản riêng cần đọc hoặc dùng lại.
- Đầu vào: {id}, lấy ID cuối link /ket-noi-ai/ban-luu/ID; không gửi cả URL làm ID.
- Kết quả: ration/input/preview/review/confirmationToken/sourceChanged/history; nguồn hiện tại có thể khác lần lưu.
- Tiếp theo: Dùng input mới trả về. Đọc không ghi thay đổi; nếu sửa thì prepare lại và xác nhận, chỉ save khi được yêu cầu. Không bắt tải lên Excel.

## export_workbook — Tạo link tải Excel

- Khi dùng: Người dùng yêu cầu file Excel của bản đã xác nhận; cần nutrition:export.
- Đầu vào: {input,confirmationToken,saveToAccount:false}; chỉ true khi được yêu cầu lưu và có nutrition:write.
- Kết quả: downloadUrl/expiresAt/filename; savedMenuUrl có thể null. Link tải tạm10phút; không cần tải file vào chat để hoàn tất.
- Tiếp theo: Trả link server ngay. Không gọi calculate/export lặp chỉ để tải lại. File offline không tự đồng bộ; chỉ yêu cầu nhập lại nếu họ đã sửa file.

## Các luồng

- **Chỉ tính, không lưu:** Tra kho → prepare_menu → trình review.text, xử lý missingInputs → người dùng đồng ý → calculate_menu → trả chatReport.summaryText. Không save_menu, không export nếu chưa cần file.
- **Chỉ tải Excel, không lưu:** Tra kho → prepare_menu → người dùng đồng ý → export_workbook với saveToAccount=false → trả downloadUrl. Không cần tạo bản tài khoản và không bắt tải file vào cuộc chat.
- **Lưu để dùng lại:** Sau khi duyệt đầu vào, save_menu theo yêu cầu → trả ration.url. Lần sau get_saved_menu, hỏi phần muốn đổi, prepare lại trước tính/lưu.
- **Có bệnh lý/chỉ định:** Hỏi dữ kiện liên quan còn thiếu → search_diet_codes → get_diet_code → trình mã/ghi chú để xác nhận → clinicalContext → prepare/chốt/tính. Không có mã vẫn tính thành phần, không kết luận đạt chế độ bệnh lý.

## Khi không hoàn thành

- **Không có công cụ trong phiên:** Chỉ giải thích kết nối/cập nhật plugin; vẫn làm rõ bữa ăn. Link/QR/token không tự thêm công cụ cho AI, không giả vờ đã gọi server.
- **401/403:** Kết nối lại hoặc cấp đúng scope bằng giao diện; không yêu cầu token/mật khẩu trong chat. Thiếu write không ngăn chỉ tính nếu đã có calculate.
- **400:** Đọc field/message, sửa đúng tham số theo schema một lần; ID phải lấy từ lookup, mode chỉ menu/recall24h, ngày chưa biết là chuỗi rỗng. Không gửi lại nguyên lỗi.
- **404:** Mã/ID không tồn tại hoặc không thuộc chủ; tìm lại đúng loại ID. Không thử ID chủ khác và không tự tạo mã.
- **409:** Ticket khác đầu vào/nguồn hoặc hết hạn: prepare lại. Xung đột expectedRevision: mở bản mới và hỏi thay đổi; không lặp save với revision cũ.
- **422:** Đọc missingInputs, hỏi gọn phần còn thiếu/chưa xác nhận. Thiếu nutrient null khác thiếu lượng/hệ số khiến chưa chốt được.
- **429 hoặc503:** Báo chưa hoàn thành, giữ bản nháp; dùng Retry-After khi có. Không gọi dồn, không tự đổi số liệu để vượt lỗi.
- **outputCompacted/truncated/413:** Không nói đã đọc chi tiết bị lược; giữ đầu vào chuẩn hóa, chia kỳ theo ngày khi server yêu cầu. Không bỏ dòng hoặc coi summary là toàn bộ.
- **Phản hồi MCP:** Đọc structuredContent nếu có, nếu không parse JSON trong content[type=text].text. Kiểm isError trước khi dùng; REST trả đối tượng trực tiếp, không có lớp result/content.
