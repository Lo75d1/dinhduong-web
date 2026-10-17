# Công cụ, kết quả và cách xử lý

Phiên bản hướng dẫn: 1.0.12. Một plugin Dinh dưỡng 2598 chứa 16 công cụ; không phải cài mỗi công cụ thành một plugin.

Gọi get_workflow một lần khi bắt đầu yêu cầu dinh dưỡng. Chưa kết nối tài khoản và chỉ cần tra/tính/Excel: gọi start_guest_session công khai, dùng accessToken trong arguments.sessionToken của công cụ tiếp theo; phiên 30 phút không tạo tài khoản. Mặc định không lưu. Đọc guidance trong TỪNG phản hồi để biết thiếu gì, phải hỏi/chờ duyệt hay được gọi công cụ nào; không coi số liệu hay confirmationToken là người dùng đã đồng ý. Không gọi lại cùng truy vấn khi không có thay đổi. Người dùng có thể chưa quen kỹ thuật: tự mở phiên cần thiết qua công cụ khi đã được yêu cầu tra/tính/Excel, không bắt họ tự lấy token hoặc học tên API. Muốn lưu/dùng lâu dài thì đọc accountUse để hướng dẫn đăng ký/đăng nhập và kết nối tài khoản; giữ đầu vào, prepare lại bằng tài khoản rồi chờ duyệt trước save, không dùng ticket guest. Ưu tiên trả webUrl thật từ prepare/calculate để mở đầu vào và kết quả trên web, sửa/tính lại không cần tài khoản. Bản tạm lưu đầu vào30phút; không phải bản tài khoản. Không export hoặc save chỉ để có link xem. Món luộc/hấp cần làm rõ nước chấm và lượng thực ăn; tra nguồn thật, không tự thêm vào lịch sử24giờ.

## Bản nháp để duyệt thành phần

Bản nháp đầu tiên và mọi bản sửa phải hiện ngay trong chat từng món kèm TẤT CẢ thực phẩm/nguyên liệu của món đó, mỗi nguyên liệu một dòng với lượng, đơn vị, số suất/cơ sở và nguồn; giữ dấu * trước số AI tự điền. Có thể nhóm theo ngày/bữa/món hoặc dùng bảng, không rút thành danh sách chỉ có tên món, không giấu nguyên liệu trong link web hoặc chờ người dùng hỏi mới đưa. RNI lấy thành phần từ get_dish, dùng lượng của bản nháp đang duyệt, không mặc định lượng công thức nguồn là một suất. VDD chỉ có số cả món thì ghi Kho chưa có thành phần nguyên liệu, không tự suy công thức. Phần chưa rõ để — và hỏi lại. Bản bị rút gọn phải chia kỳ để duyệt đủ, không coi phần chưa hiện là đã được đồng ý.

## start_guest_session — Mở phiên tạm không cần tài khoản

- Khi dùng: Người dùng cần tra kho chung, tính hoặc lấy Excel mà chưa kết nối tài khoản; không gọi khi đã có phiên còn hạn.
- Đầu vào: {}; công khai, không cần OAuth. REST có POST /api/nutrition/v1/guest-session với JSON {}.
- Kết quả: accessToken/tokenType/expiresAt/expiresIn/scopes; phiên30phút chỉ giữ hash token và hạn dùng trong bộ nhớ tạm của máy chủ, không tạo User/Session/Ration.
- Tiếp theo: MCP: giữ token nội bộ và truyền arguments.sessionToken vào công cụ tra/tính/xuất; REST dùng Authorization: Bearer accessToken. Không đưa token vào URL/câu trả lời. Không lưu hoặc đọc bản riêng; hết hạn mở phiên mới, prepare và duyệt lại. Không tạo phiên mới để vượt429.

## get_workflow — Đọc hướng dẫn sử dụng

- Khi dùng: Bắt đầu hoặc cần hiểu quy trình/tham số/lỗi.
- Đầu vào: {}
- Kết quả: menuSchema là hợp đồng đầu vào; toolGuide giải thích từng công cụ; recipes là các luồng; recovery hướng dẫn xử lý lỗi.
- Tiếp theo: Chọn luồng theo yêu cầu, không hỏi lại dữ kiện đã có.

## search_foods — Tìm thực phẩm hoặc món VDD

- Khi dùng: Cần nguyên liệu; hoặc món hoàn chỉnh VDD với type=MA, source=VDD.
- Đầu vào: q là tên cần tìm, không phải cả câu; type/source/fields/limit/offset tùy chọn.
- Kết quả: items[] là Food có id/name/unit/source/nutrients/nutrientBasis; total và nextOffset để phân trang. nutrientBasis.status=per100 ghi amount=100 và unit g/ml; unverified là chưa biết mẫu số, không phải số theo một suất.
- Tiếp theo: Đối chiếu tên/nguồn/trạng thái rồi dùng get_food. VDD MA chưa xác minh mẫu số: tự tìm công thức RNI tương ứng, trình nguyên liệu/lượng để người dùng duyệt; không chỉ nói sẽ kiểm tra thêm rồi dừng. Không tự đổi món hoặc cộng món nguyên khối cùng nguyên liệu. items rỗng là không tìm thấy, khác lỗi máy chủ.

## get_food — Đọc thực phẩm theo ID

- Khi dùng: Đã chọn ứng viên thật hoặc cần đủ vi chất/đơn vị/nguồn.
- Đầu vào: {id} lấy từ search_foods, không dùng tên món thay ID.
- Kết quả: Một Food trực tiếp, không có items: id/name/unit/nutrients/source/nutrientBasis. Chỉ status=per100 mới cho biết số theo100g/100ml; VDD MA có status=unverified, amount=null: nutrients=null; số gốc chỉ nằm ở unverifiedSourceNutrients để đối soát, chưa được nhân theo gram hoặc coi là một suất. null là thiếu.
- Tiếp theo: Dùng foodId trong dòng khẩu phần; không tự đưa cả Food vào customFood. nutrientBasis chưa xác minh: tìm công thức RNI hoặc công thức có nguồn để người dùng chọn/duyệt; không tự điền100g, khối lượng một bát hay một suất để vượt lỗi.

## search_dishes — Tìm công thức món RNI

- Khi dùng: Người dùng muốn món ăn/thực đơn; tìm công thức thật trước khi tự đề xuất.
- Đầu vào: {q,limit?}, q là tên món.
- Kết quả: items[] gồm ứng viên có id/name/source; không phải khẩu phần đã tính.
- Tiếp theo: Gọi get_dish theo ID đã chọn, không coi dòng đầu là lựa chọn đã xác nhận.

## get_dish — Đọc công thức và nguyên liệu

- Khi dùng: Cần thành phần của một món RNI đã tìm thấy.
- Đầu vào: {id} từ search_dishes.
- Kết quả: Một món trực tiếp với ingredients[] và liên kết food. Đọc số lượng/cơ sở nguồn; mục chưa liên kết cần làm rõ.
- Tiếp theo: Trình từng nguyên liệu cùng lượng công thức nguồn để người dùng điều chỉnh, không chỉ tên món. Tạo từng dòng với Food ID thật, lượng đã làm rõ và recipeSource.dishId; lượng chưa biết để thiếu. Không coi định lượng nguồn là một suất. Bản nháp sau prepare phải hiện đủ từng nguyên liệu với lượng của bản đang duyệt.

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
- Đầu vào: {input}; mode=menu hoặc recall24h; mỗi ngày có id,label,date,rows, date chưa biết dùng chuỗi rỗng. profile tùy chọn; nếu gửi phải biết age/ageUnit/gender/activityLevel/physiology, số hồ sơ là chuỗi. Thiếu tuổi/giới: hỏi phần thiếu, không đoán. Chỉ tính thành phần dùng comparison.mode=none và bỏ profile; mục tiêu có nguồn dùng manual, không cần profile.
- Kết quả: input chuẩn hóa, preview.missingInputs, review.text, review.truncated, confirmationToken và expiresAt. Đây chưa phải người dùng đồng ý. Có webUrl/webExpiresAt để mở bản nháp và sửa trên web, không cần đăng nhập; đầu vào được giữ tạm30phút, chưa phải bản đã chốt.
- Tiếp theo: Trình review.text đầy đủ từng thực phẩm/nguyên liệu và lượng dưới mỗi món ngay bản nháp đầu tiên; không rút thành tên món hoặc chỉ gửi link web. Theo approvalPresentation, giữ dấu *, hỏi người dùng xác nhận đúng thành phần/định lượng rồi DỪNG CHỜ. Có thay đổi thì prepare lại; chưa đồng ý không calculate/save/export.

## calculate_menu — Tính và trả báo cáo, không lưu

- Khi dùng: Người dùng đã đồng ý bản prepare hiện hành; cần xem số liệu.
- Đầu vào: {input,confirmationToken} từ cùng lần prepare; không gửi thêm saveToAccount.
- Kết quả: chatReport.summaryText/text, totals/dayTotals/analysis/clinicalAssessment cùng webUrl/webExpiresAt. Link mở bản tạm đã tính, xem/sửa/tính lại không cần đăng nhập; lưu đầu vào30phút, không tạo Ration. Không có link Excel nếu chưa xuất.
- Tiếp theo: Trả tóm tắt cùng webUrl và thời hạn; người dùng mở để sửa trên hệ thống thay vì chat. Excel là tải thêm trên web hoặc export khi họ cần; chỉ save khi yêu cầu giữ lâu dài.

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
- Kết quả: downloadUrl/expiresAt/filename; savedMenuUrl có thể null. Link tải tạm10phút; không cần tải file vào chat để hoàn tất. Đồng thời có webUrl/webExpiresAt để xem/sửa bản tạm trên web không cần tài khoản; đây không phải savedMenuUrl lâu dài.
- Tiếp theo: Trả link server ngay. Không gọi calculate/export lặp chỉ để tải lại. File offline không tự đồng bộ; chỉ yêu cầu nhập lại nếu họ đã sửa file.

## Các luồng

- **Không cần tài khoản:** get_workflow → start_guest_session → giữ accessToken trong arguments.sessionToken cho mỗi tool tra/tính/xuất → tra kho → prepare → hỏi/chờ người dùng duyệt → calculate hoặc export_workbook saveToAccount=false. Không lưu hoặc đọc dữ liệu cá nhân. Đọc guidance sau từng phản hồi; không tạo phiên mới để vượt hạn mức.
- **Chỉ tính, không lưu:** Tra kho → prepare_menu → đưa review.text và webUrl để duyệt/sửa trên web → người dùng đồng ý → calculate_menu → trả chatReport.summaryText cùng webUrl30phút. Không tạo bản tài khoản; Excel chỉ tải thêm khi cần.
- **Chỉ tải Excel, không lưu:** Tra kho → prepare_menu → người dùng đồng ý → export_workbook với saveToAccount=false → trả downloadUrl. Không cần tạo bản tài khoản và không bắt tải file vào cuộc chat.
- **Lưu để dùng lại:** Sau khi duyệt đầu vào, save_menu theo yêu cầu → trả ration.url. Lần sau get_saved_menu, hỏi phần muốn đổi, prepare lại trước tính/lưu.
- **Có bệnh lý/chỉ định:** Hỏi dữ kiện liên quan còn thiếu → search_diet_codes → get_diet_code → trình mã/ghi chú để xác nhận → clinicalContext → prepare/chốt/tính. Không có mã vẫn tính thành phần, không kết luận đạt chế độ bệnh lý.

## Khi không hoàn thành

- **Món VDD chưa rõ100g hay một phần:** Đọc nutrientBasis: unverified là kho chưa xác minh mẫu số, không phải lỗi định lượng của người dùng. Tự tra search_dishes/get_dish cho công thức RNI tương ứng và kiểm từng Food thành phần; trình phương án thay để người dùng duyệt. Không có thì làm rõ công thức có nguồn hoặc giữ món chưa tính, không âm thầm bỏ món. Không chỉ hứa kiểm tra rồi dừng; không lấy unit=g làm bằng chứng100g, không tạo customFood từ các số chưa rõ mẫu số để lách chặn.
- **Hồ sơ chưa đủ tuổi/giới hoặc trường bắt buộc:** Hỏi đúng field còn thiếu, giữ cân nặng/chiều cao/vận động đã biết. Không đoán tuổi, giới hay tình trạng sinh lý. Tính nhu cầu cần hồ sơ đầy đủ theo menuSchema; nếu người dùng chỉ cần thành phần hoặc có mục tiêu xác nhận kèm nguồn, giải thích dùng none hoặc manual và bỏ profile chưa đủ. Không âm thầm đổi chế độ hoặc nhập hồ sơ rỗng.
- **Token được gửi cả ở header và sessionToken:** Header xác thực hợp lệ quyết định tài khoản/quyền; sessionToken chỉ là tham số vận chuyển cho các công cụ hỗ trợ phiên tạm. Không gửi sessionToken khi đã dùng OAuth. Header sai vẫn bị từ chối, không chuyển lùi sang phiên tạm để bỏ qua xác thực.
- **410 bản tạm:** Link hết hạn hoặc thiếu quyền mở: lấy đúng link đầy đủ từ chat hoặc yêu cầu tạo link mới từ đầu vào còn giữ. Không thử ID khác và không bắt đăng ký chỉ để sửa bản tạm. Giữ lâu dài thì lưu tài khoản theo yêu cầu.
- **Không có công cụ trong phiên:** Nếu không có MCP, kiểm tra khả năng gửi HTTP thực thi được POST/header/JSON. Có thì dùng REST phiên tạm theo hướng dẫn TXT; không bắt đăng ký để tính. Không có cả hai thì hướng dẫn kết nối/cập nhật plugin và vẫn làm rõ bữa ăn. Link/QR không tự thêm công cụ; không giả vờ đã gọi server.
- **401/403:** Phiên tạm hết hạn: start_guest_session rồi prepare và duyệt lại. Thao tác tài khoản cần OAuth đúng scope; không tự nâng quyền. Token cá nhân và mật khẩu không gửi vào chat. Token phiên tạm do công cụ giữ nội bộ, không hiện cho người dùng.
- **400:** Đọc field/message, sửa đúng tham số theo schema một lần; ID phải lấy từ lookup, mode chỉ menu/recall24h, ngày chưa biết là chuỗi rỗng. Không gửi lại nguyên lỗi.
- **404:** Mã/ID không tồn tại hoặc không thuộc chủ; tìm lại đúng loại ID. Không thử ID chủ khác và không tự tạo mã.
- **409:** Ticket khác đầu vào/nguồn hoặc hết hạn: prepare lại. Xung đột expectedRevision: mở bản mới và hỏi thay đổi; không lặp save với revision cũ.
- **422:** Đọc missingInputs, hỏi gọn phần còn thiếu/chưa xác nhận. Thiếu nutrient null khác thiếu lượng/hệ số khiến chưa chốt được.
- **429 hoặc503:** Báo chưa hoàn thành, giữ bản nháp; dùng Retry-After khi có. Không gọi dồn, không tự đổi số liệu để vượt lỗi.
- **outputCompacted/truncated/413:** Không nói đã đọc chi tiết bị lược; giữ đầu vào chuẩn hóa, chia kỳ theo ngày khi server yêu cầu. Không bỏ dòng hoặc coi summary là toàn bộ.
- **Phản hồi MCP:** Đọc structuredContent nếu có, nếu không parse JSON trong content[type=text].text. Kiểm isError trước khi dùng; REST trả đối tượng trực tiếp, không có lớp result/content.
