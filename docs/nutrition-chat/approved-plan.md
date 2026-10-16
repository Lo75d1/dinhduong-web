# Kế hoạch API hội thoại — Dinh dưỡng 2598

> Bản kế hoạch gốc đã được người dùng chốt trước triển khai. Trạng thái code, kiểm chứng và cửa phát hành hiện tại xem `verification.md` / `vps-runbook.md` cùng thư mục.

- Ngày: **14/10/2026**.
- Trạng thái: **Chủ dự án đã chốt hướng; tài liệu này là kế hoạch, chưa phải chức năng đã triển khai.**
- Mục tiêu: dùng **ChatGPT và Claude** để nhập, làm rõ và chỉnh khẩu phần/thực đơn bằng hội thoại; hệ thống Dinh dưỡng 2598 tra dữ liệu, tính toán và tạo **Excel chỉnh được, tự tính lại**.
- Phạm vi phiên này: lập kế hoạch. Không sửa code, ghi DB, chạy migration, merge hoặc deploy.

## 1. Các quyết định đã chốt

- Dinh dưỡng 2598 là nguồn dữ liệu chuyên môn; API dùng chung cho ChatGPT, Claude và có thể mở rộng cho ứng dụng khác.
- QR/link dẫn người dùng tới hướng dẫn hoặc nơi bắt đầu hội thoại. QR/link không tự cấp quyền gọi API và không chứa bí mật.
- Quy trình có **ba bước**: làm rõ đầu vào → người dùng chốt và gửi → hệ thống tính, trả kết quả và Excel.
- Hỗ trợ khẩu phần 24 giờ, thực đơn một ngày và nhiều ngày. Không cố định số ngày là 7; giới hạn kỹ thuật sẽ được xác định sau kiểm thử tải.
- Đối chiếu nhu cầu là tùy chọn. Người chỉ muốn cộng dinh dưỡng không phải nhập hồ sơ cá nhân.
- AI có thể mở món thành nguyên liệu, đề xuất công thức và thay nguyên liệu; người dùng xác nhận trước khi tính bản cuối.
- Thay đổi thuộc bản cá nhân, giữ nguyên kho Food/Dish gốc. Món do AI đề xuất không tự trở thành công thức đã kiểm chứng.
- Tính và lưu là hai thao tác riêng. Chỉ lưu lâu dài khi người dùng muốn giữ bản đã chốt.
- Excel phải có công thức: sửa đầu vào làm các bảng số và biểu đồ liên quan cập nhật. Không chỉ xuất các số đã tính sẵn.
- Chỉnh Excel không bắt buộc gửi lại web. Gửi lại là tùy chọn khi muốn lưu bản cuối, bổ sung dữ liệu hoặc nhờ AI phân tích lại.

## 2. Hiện trạng đã rà trên máy

- `web/PROJECT_STATUS.md`, `web/CLAUDE_HANDOFF.md`, `web/docs/handoff-*.md`, `web/README-data.md` và AGENTS.md đã được đọc.
- Repo web có API tìm Food/Dish, bộ lọc, lấy nhiều trường dinh dưỡng, bảng khuyến nghị, mã chế độ ăn, URL ảnh và proxy ảnh RNI.
- Có `FoodAlias` và logic tìm không dấu; cần kiểm tra thêm xếp hạng tên có dấu và tên gọi vùng miền trước khi dùng cho hội thoại.
- Có `Ration`/`RationItem`: ID, chủ sở hữu, dòng thực phẩm, số lượng và số liệu đã dùng. API đọc/sửa kiểm tra ID cùng chủ sở hữu.
- Nhiều ngày hiện có mô hình `MenuDay` và phân tích theo ngày/bữa/món; dữ liệu board lưu ở trình duyệt. Chưa có cầu nối hội thoại đáp ứng toàn bộ kế hoạch này.
- Có engine thuần ở `suat-an-benh-vien/packages/nutrition-engine`, nhưng một số cách xử lý dữ liệu thiếu khác với web. Chỉ tái dùng sau khi đối chiếu, không coi hai bản mặc nhiên tương đương.
- Bộ XLSX hiện có dùng ExcelJS; khung nhập mới có công thức cơ bản. Bản báo cáo nhiều ngày chủ yếu xuất giá trị đã tính, chưa tự tính lại đầy đủ khi sửa.
- File xuất ngày 14/10/2026 đã kiểm tra: **3.719 thực phẩm, 7.369 món, 41.457 nguyên liệu, 6.187 thuốc/TPBS tham khảo**. Không có nguyên liệu thiếu hoặc trỏ tới Food ID không tồn tại trong file này.
- File còn thiếu đạm ở 243 thực phẩm, béo ở 466, bột đường ở 394; không chứa aliases, bảng khuyến nghị hoặc mã chế độ ăn. Có số cần xác minh, ví dụ Cốm làng vòng ghi 2.992 kcal và 669 g bột đường.
- Số trong tài liệu cũ khác bản xuất mới; không dùng thống kê cũ thay cho kiểm tra nguồn thực tế.
- Checkout web đang có thay đổi ngoài nhiệm vụ. Khi triển khai phải đối chiếu `main` mới nhất và tạo nhánh riêng, giữ nguyên công việc đang dở.

## 3. Quy trình hội thoại ba bước

### Trước bước 1 — đọc hướng dẫn

- Bộ hướng dẫn chung quy định thứ tự hỏi, nguồn được dùng, cách xử lý dữ liệu thiếu, cách chốt và cách trình bày kết quả.
- Người dùng chọn: khẩu phần 24 giờ / thực đơn một ngày / nhiều ngày; chỉ tính thành phần / đối chiếu nhu cầu.
- Kết nối công cụ được cấu hình riêng cho ChatGPT và Claude. Không dựa vào việc mô hình tự đọc link rồi tự có quyền kết nối.

### Bước 1 — nhận và làm rõ đầu vào

- Tra tên thực phẩm/món; đưa những ứng viên cần phân biệt kèm loại và nguồn.
- Hỏi lượng, đơn vị, sống/chín, số phần và ngày/bữa khi những thông tin đó ảnh hưởng phép tính.
- Phân biệt **thiếu đầu vào** với **thiếu số liệu nguồn**. Thiếu đầu vào cần hỏi; thiếu chất trong nguồn cần báo rõ, không bịa giá trị.
- Công thức có sẵn: lấy làm bản nền. Công thức người dùng cung cấp: giữ nguồn người dùng. Chỉ có tên món: AI có thể đề xuất công thức ước lượng để người dùng xác nhận.
- Món chỉ có bảng thành phần dinh dưỡng không đủ để suy ra công thức chính xác. Cho phép tính trực tiếp theo bản ghi món hoặc dùng công thức nguyên liệu đã xác nhận; không cộng cả hai.
- Thay nguyên liệu được chia thành **có trong data** và **không có trong data**; không tự coi nguyên liệu mới tương đương với nguyên liệu cũ.
  - Có trong data: xác định đúng Food ID, định lượng, nguồn và cách quy đổi.
  - Chưa tìm thấy: kiểm tra tên gọi khác/alias trước khi kết luận nguyên liệu ngoài data.
  - Thực sự ngoài data: có thể dùng nhãn sản phẩm, tài liệu thành phần hoặc bản ghi nguồn ngoài phù hợp. Giữ nguồn, đơn vị, cơ sở tính và những chất chưa được cung cấp; người dùng xác nhận bản số liệu trước khi tính.
  - Nếu người dùng chấp nhận một thực phẩm tham chiếu tương tự có dữ liệu: giữ cả tên nguyên liệu thực tế và Food ID tham chiếu, ghi rõ phép tính ước lượng. Không trình bày như số liệu đo của nguyên liệu thực tế.
  - Không có nguồn số liệu hoặc tham chiếu được chấp nhận: trả phần tính được và danh sách chất/nguyên liệu chưa tính được, không điền 0 hoặc lấy số từ trí nhớ AI làm dữ liệu chuẩn.
- Cho xem bản nháp: Ngày → Bữa → Món → Thực phẩm, các phần ước lượng, phần thay đổi và chỗ còn thiếu.

### Bước 2 — chốt và gửi

- Người dùng xác nhận bản đầu vào cụ thể; thay đổi sau đó phải tạo bản nháp mới hoặc phiên bản mới cần chốt.
- Gửi cấu trúc đã kiểm tra, ID nguyên liệu và số lượng; không gửi cả kho dữ liệu hay mặc nhiên tin số dinh dưỡng AI đưa ra.
- Nếu chỉ tính thành phần: không yêu cầu hồ sơ. Nếu đối chiếu nhu cầu: nhận hồ sơ đủ cho phương pháp đã chọn, hoặc mục tiêu do người dùng/chuyên môn cung cấp có ghi nguồn.
- Lưu lâu dài là tùy chọn. Bản lưu thuộc người dùng đã xác thực; chống lưu trùng khi công cụ gửi lại yêu cầu.

### Bước 3 — tính, trả và xuất Excel

- Server kiểm tra lại ID, số lượng, đơn vị, nguồn và quyền; lấy dữ liệu chuyên môn cần dùng rồi chạy logic tính đã tái dùng từ dự án.
- Trả kết quả có cấu trúc theo món/bữa/ngày và toàn đợt, trạng thái thiếu dữ liệu, nguồn và phiên bản dữ liệu.
- Không có mục tiêu thì không kết luận đạt/thiếu/vượt nhu cầu. Ngày chưa nhập không được tính thành ngày ăn 0 kcal.
- Từ cùng bản đầu vào và nguồn đã dùng, tạo XLSX; trả kết quả cho AI giải thích và link tải file.
- Nhận xét AI phải phản ánh cảnh báo của hệ thống, không biến tổng chưa đầy đủ thành kết luận chắc chắn.

## 4. Ranh giới dữ liệu và tính toán

- **Nguồn công thức** và **nguồn số dinh dưỡng** là hai thông tin riêng.
- Nguyên liệu trong kho dùng Food ID ổn định. Nguyên liệu ngoài kho dùng định danh riêng trong bản cá nhân, không giả làm Food ID trong kho; chỉ tham chiếu Food ID khi thật sự dùng bản ghi đó. Không ghép món/nguyên liệu chỉ bằng tên gần giống.
- Với số liệu ngoài kho: lưu tên, nguồn/ảnh nhãn hoặc tài liệu tham chiếu, đơn vị, cơ sở tính theo 100 g/100 ml/theo phần và khối lượng phần nếu có. Không tự đổi ml sang g khi chưa có hệ số phù hợp; chất không có trên nhãn vẫn để thiếu.
- Tái dùng quy ước chất, đơn vị và khối lượng trong repo. Đọc README-data trước khi gộp trường; không tự đổi đơn vị nghi vấn hoặc suy ra GI.
- Quy đổi sống/chín, phần ăn được/mua vào chỉ dùng hệ số có cơ sở. Thiếu hệ số thì hỏi hoặc để phần kết quả liên quan chưa xác định.
- Giữ `null` khác số 0. Tổng từ phần có dữ liệu phải có trạng thái chưa đầy đủ; dữ liệu đáng ngờ cần cảnh báo riêng.
- Công thức mới/thay thế là bản cá nhân. Muốn vào kho chung phải đi luồng biên tập có preview, lý do và DataChangeLog.
- Ưu tiên Ration/RationItem hiện có. Mô hình vật lý cho nhiều ngày, nguồn công thức và phiên bản phải được rà ở M0; chỉ bổ sung phần thiếu, không dựng kho Food/Dish song song.
- Không sao chép toàn bộ data cho từng người. Chỉ lưu bản đã chốt, nguyên liệu đã dùng, nguồn và số liệu/phiên bản cần để tái hiện kết quả.
- Tách lưu bản cá nhân khỏi tạo file tải tạm. Không giữ mọi file Excel lâu dài nếu có thể tạo lại.

## 5. Excel chỉnh được và tự phân tích

### Cấu trúc ban đầu

- **Phân tích:** kết quả theo bữa/ngày/toàn đợt, tỷ lệ năng lượng, biểu đồ và đối chiếu mục tiêu nếu có.
- **Nhập khẩu phần:** ngày, bữa, món, lựa chọn nguyên liệu, gram, số suất, hệ số đã xác nhận và ghi chú. Các ô được phép sửa có màu riêng.
- **Dữ liệu thực phẩm:** danh mục và các chất phục vụ báo cáo, đơn vị, nguồn, trạng thái thiếu; nhúng đủ danh mục cần để thay nguyên liệu khi offline. Không nhúng toàn bộ JSON công thức và thuốc/TPBS không liên quan.
- Bảng đi chợ là phần tùy chọn khi người dùng cần. Có thể đặt cùng sheet phân tích nếu vẫn dễ đọc.

### Hành vi bắt buộc

- Công thức Excel tính từ đầu vào, số liệu nguồn và mục tiêu; sửa một chỗ thì các kết quả phụ thuộc cập nhật.
- Cho sửa gram, số suất, phân bổ ngày/bữa và nguyên liệu trong danh mục nhúng. Nhận diện đúng những tên trùng nhưng bản ghi khác nhau.
- Nếu cho sửa số dinh dưỡng/nhu cầu, dùng vùng tự nhập có nguồn riêng; không ghi đè âm thầm dữ liệu chuẩn.
- Muốn thêm thực phẩm không có trong danh mục: bổ sung dòng tự nhập có nguồn và cờ chưa xác minh, hoặc yêu cầu hệ thống bổ sung. Không tự phát sinh số liệu.
- Ngưỡng nhu cầu là tùy chọn; không có thì bỏ phần đối chiếu. Nếu hồ sơ được phép sửa, các mục tiêu phụ thuộc phải tính lại hoặc báo cần cập nhật, không giữ ngưỡng cũ mà vẫn coi là mới.
- Ô công thức được bảo vệ để tránh sửa nhầm; bảo vệ sheet không được coi là biện pháp giữ bí mật dữ liệu.
- Các bảng phân tích và biểu đồ phải liên kết với dữ liệu/công thức. Rà khả năng tạo biểu đồ Excel thực sự của bộ xuất ở M0; không dùng ảnh biểu đồ cố định thay cho yêu cầu tự cập nhật.
- Nhận xét AI là nội dung tại thời điểm xuất. Khi đầu vào đổi, đánh dấu nhận xét đó cần cập nhật; các cảnh báo bằng quy tắc/công thức có thể tự đổi.
- Có mã bản lưu/phiên bản, ngày xuất và nguồn để đối chiếu, nhưng không chứa bí mật kết nối.
- Bản đầu không dùng macro hoặc yêu cầu kết nối mạng để tính những phần đã nhúng đủ dữ liệu.
- Kiểm tra Excel và web cho cùng kết quả với cùng đầu vào/nguồn; kiểm tra cả dữ liệu thiếu, thay nguyên liệu và nhiều ngày.

### Gửi lại tùy chọn

- Người dùng sửa và phân tích ngay trong Excel, không phải gửi lại sau từng lần chỉnh.
- Khi muốn lưu bản cuối hoặc nhờ AI phân tích lại, tải file lên một lần; hệ thống đọc vùng đầu vào và giữ nguồn của các giá trị tự nhập.
- Server tính lại từ dữ liệu được kiểm tra, không tin sẵn kết quả/công thức nằm trong file tải lên.
- Không tự đồng bộ một file Excel cục bộ với web. Đồng bộ trực tiếp là yêu cầu khác, ngoài bản đầu.

## 6. Kết nối, bảo mật và cấu hình thấp

- Hai adapter phục vụ một quy trình và một nguồn tính. Hướng đề xuất sau khi đối chiếu tài liệu: **skill/bộ hướng dẫn + công cụ MCP**, đóng gói và kết nối theo từng nền tảng; GPT Actions vẫn là phương án thay thế của ChatGPT nếu phù hợp hơn với giao diện/tài khoản thực tế. M0 phải thử trước khi chốt cách triển khai.
- Skill quy định cách hỏi, chọn nguồn, xử lý nguyên liệu ngoài kho, chốt đầu vào và trình bày kết quả. Skill không tự cấp quyền gọi API hoặc lưu dữ liệu.
- MCP/connector cung cấp các công cụ được kiểm soát để gọi API Dinh dưỡng 2598. Trên ChatGPT, plugin có thể đóng gói skill và kết nối MCP; trên Claude dùng connector MCP cùng skill, hoặc gói plugin phù hợp với nền tảng đó. Không mặc định một gói cài đặt hoạt động giống nhau ở mọi giao diện.
- API chỉ cung cấp những thao tác cần: tra cứu, xem/kiểm tra bản nháp, tính, xuất file và lưu/mở bản cá nhân khi có quyền. Không cấp công cụ sửa kho nguồn hoặc quản trị.
- Xác thực người dùng khi lưu/mở dữ liệu cá nhân; kiểm tra chủ sở hữu ở mỗi yêu cầu. ID khó đoán không thay cho kiểm tra quyền.
- QR/link hướng dẫn không chứa khóa. Bí mật kết nối nằm trong cấu hình được bảo vệ; không yêu cầu người dùng dán khóa dùng chung vào chat.
- Chống spam từ bước tra cứu: hạn mức theo người dùng/ứng dụng, giới hạn đồng thời và dung lượng. Không chỉ dựa vào IP của nền tảng.
- Kiểm tra schema và allowlist trường; giới hạn số ngày, số dòng, số lượng, chuỗi, file và thời gian chạy. Không để một yêu cầu tạo lượng công việc không giới hạn.
- Chống gửi lại gây lưu trùng bằng mã yêu cầu gắn với người dùng và phiên bản đầu vào. Không gộp nhầm những bản người dùng chủ ý lưu riêng.
- Dữ liệu lấy từ nguồn, tên món và nội dung tải lên là dữ liệu, không phải chỉ dẫn cho AI thực thi quyền mới.
- HTTPS, log không chứa token/bí mật; giảm thông tin nhận dạng không cần cho phép tính. File tải dùng quyền phù hợp hoặc link tạm có thời hạn/khả năng thu hồi.
- ChatGPT/Claude xử lý hội thoại; VPS chủ yếu tra data, tính và xuất file. Gom truy vấn, cache dữ liệu phù hợp, ảnh trả URL, kiểm soát lượt xuất Excel đồng thời.
- Chưa có bằng chứng CPU/RAM, tải đồng thời và hiệu năng DB hiện tại. Không chốt sức chứa hay giới hạn bằng số trước khi đo.

## 7. Các phần có sẵn sẽ tái dùng

- `web/src/app/api/foods/search/route.ts`, `web/src/lib/search.ts`, `normalize.ts`: tìm kiếm và xếp hạng.
- `web/src/app/api/dishes/search/route.ts`: công thức và liên kết nguyên liệu.
- `web/src/app/api/foods/report-nutrients/route.ts`, `web/src/lib/nutrient-fields.ts`: danh sách chất và lấy theo nhu cầu.
- `web/src/app/tinh-khau-phan/quantity.ts`, `ration-detail.ts`, `multi-day.ts`, `multi-day-analysis.ts`, `matchRecommendation.ts`: quy đổi, tổng và phân tích.
- `web/src/lib/ration-persistence.ts`, `web/src/app/api/rations/`, model Ration/RationItem: lưu bản cá nhân.
- `web/src/lib/menu-analysis-workbook.ts`, `web/src/app/tinh-khau-phan/ReportActions.tsx`, `multi-day-export.ts`: nền xuất Excel và nội dung báo cáo.
- `web/src/app/api/dish-images/rni/[imageId]/route.ts`: proxy ảnh.
- `suat-an-benh-vien/packages/nutrition-engine`: tham chiếu các hàm thuần đã port; chưa quyết định sửa repo này hoặc chuyển ứng dụng suất ăn sang API mới.

## 8. Thứ tự triển khai và điều kiện hoàn thành

### M0 — đặc tả và kiểm tra khả thi

- Đối chiếu main mới nhất, nguồn DB/data và những thay đổi đang dở. Chọn checkout/nhánh theo AGENTS.
- Chốt contract đầu vào/đầu ra, mô hình lưu tối thiểu và cơ chế kết nối/xác thực cho hai nền tảng.
- Thử một luồng tra Food và một luồng tính trên dữ liệu nhỏ, có dữ liệu thiếu; thử một XLSX sửa gram và biểu đồ tự cập nhật.
- Đo tải nền và xác định giới hạn tạm có căn cứ; không thử tải gây ảnh hưởng production.
- **Đạt khi:** có spec cụ thể để Claude rà, bằng chứng kết nối và Excel; liệt kê mọi migration cần thiết trước khi dựng phần lưu.

### M1 — tìm/chọn và dựng bản nháp

- Tái dùng tìm Food/Dish; ưu tiên tên có dấu, tìm không dấu và aliases có ghi trạng thái.
- Mở công thức, thay nguyên liệu, giữ nguồn và cảnh báo; cho người dùng xem/chốt bản nháp.
- **Đạt khi:** các ca cơm/cốm, dưa/dứa/dừa, tên vùng miền, tên trùng, món chưa có công thức và công thức thay thế được xử lý đúng. Có ca thay bằng Food trong kho, nguyên liệu ngoài kho có nhãn/nguồn, tham chiếu ước lượng được xác nhận và không đủ dữ liệu để tính.

### M2 — tính trên server

- Tái dùng logic hiện có, tách phần phụ thuộc UI khi cần; không tạo engine tính khác song song.
- Nhận một/nhiều ngày; chỉ tính thành phần hoặc đối chiếu nhu cầu tùy chọn; trả kết quả và cảnh báo có cấu trúc.
- **Đạt khi:** kết quả đối chiếu với logic chuẩn đã chọn, không cộng trùng món/nguyên liệu, không coi dữ liệu thiếu là 0 hoặc ngày trống là ngày đã ăn.

### M3 — bản cá nhân và dùng lại

- Lưu/mở bản đã chốt, phiên bản và nguồn; tái dùng Ration/RationItem tối đa.
- Chọn lại món từ bản đã lưu; chống lưu trùng và kiểm tra chủ sở hữu.
- **Đạt khi:** mở lại tái hiện được đầu vào/nguồn; người khác không đọc/sửa được bằng ID; kho Food/Dish không bị đổi.

### M4 — Excel tự tính

- Tạo XLSX theo mẫu thống nhất từ bản đã chốt; có vùng nhập, dữ liệu nhúng, phân tích và biểu đồ liên kết.
- Kiểm tra sửa gram, số suất, ngày/bữa, thay nguyên liệu, dữ liệu thiếu và mục tiêu tùy chọn.
- **Đạt khi:** các phép tính và biểu đồ liên quan cập nhật trong Excel thực tế, khớp kết quả hệ thống với cùng đầu vào; nhận xét AI cũ được nhận diện rõ.

### M5 — gửi lại bản cuối và nghiệm thu toàn luồng

- Nhập vùng đầu vào của XLSX, preview thay đổi, xác nhận rồi tính/lưu bản mới khi được yêu cầu.
- Thử đủ ba bước trên ChatGPT và Claude, cả trường hợp chỉ tính không lưu.
- Kiểm tra auth, quyền sở hữu, gửi lại, hạn mức, thời hạn file tải và tải hệ thống.
- **Đạt khi:** người dùng không phải nhập tay trên web; sửa Excel vẫn làm việc độc lập; bản cuối có thể gửi lại mà không làm sai nguồn hoặc tạo bản trùng.

## 9. Nghiệm thu và quy trình repo

- Thay đổi trong repo: nhánh `codex/<viec>` từ main mới nhất → PR → Claude review → Claude merge/deploy theo AGENTS và CLAUDE_HANDOFF.
- Không sửa/xóa Food/Dish, chạy seed phá dữ liệu, migrate reset hoặc deploy VPS trong quá trình làm nhiệm vụ này.
- Mọi migration phải nêu trong PR và chỉ áp theo quy trình VPS sau khi merge.
- Chạy Prisma generate, TypeScript, ESLint và các test tính phù hợp. Lỗi loại trừ chỉ theo quy ước repo, ghi rõ giới hạn xác minh.
- Có bằng chứng gọi API thật; nếu dùng fixture/mock phải ghi rõ, không coi đó là kiểm thử DB thật.
- Có bằng chứng sửa XLSX và tự tính lại, kiểm tra biểu đồ/nguồn/ô thiếu; render và kiểm tra bố cục. Nếu sửa UI, kiểm tra trình duyệt thật.
- Mỗi milestone bàn giao phạm vi, phần đã tái dùng, kiểm thử, hạn chế và lệch kế hoạch nếu có. Không gộp thay đổi ngoài nhiệm vụ.

## 10. Ngoài phạm vi bản đầu

- Đồng bộ trực tiếp một file Excel đang mở với web.
- AI chạy cục bộ trên VPS, đặt thêm hệ quản trị dữ liệu nguồn hoặc xây lại hệ suất ăn bệnh viện.
- Tự duyệt món AI vào kho chung, tự điền số dinh dưỡng thiếu hoặc đề xuất điều trị cá nhân.
- Đổi toàn bộ UI web hoặc sửa nghiệp vụ báo ăn/bếp/kho.
- Cam kết sức chứa khi chưa có kết quả đo.

## 11. Tài liệu kết nối để đối chiếu khi triển khai

- OpenAI GPT Actions: https://developers.openai.com/api/docs/actions/introduction
- OpenAI plugin, skill và MCP: https://developers.openai.com/plugins/concepts/plugins
- Claude custom connectors / remote MCP: https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
- Claude skill, connector và plugin: https://support.claude.com/en/articles/14328846-browse-skills-connectors-and-plugins-in-one-directory
- USDA FoodData Central, dữ liệu nhãn, đơn vị và phân biệt thiếu với 0: https://fdc.nal.usda.gov/docs/Branded_Foods_Documentation_Apr2024.pdf
- OWASP API4, giới hạn tài nguyên và tần suất: https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption/
- Hành vi và quyền của nền tảng có thể thay đổi; M0 phải kiểm tra tài liệu và tài khoản thực tế trước khi chốt adapter.
