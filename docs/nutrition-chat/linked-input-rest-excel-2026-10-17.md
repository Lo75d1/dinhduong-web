# Nhập liệu bản chat, REST phiên tạm và Excel — 17/10/2026

## Hành vi sau sửa

- Bản nháp từ prepare mở bước Nhập khẩu phần; bản đã calculate mở Kết quả. Hai bước tiếp tục nằm tại `/tinh-khau-phan`, dùng nguyên dữ liệu link, không mở trang tính trống.
- Bản chat/bản lưu dùng cùng component `MealInput` của trang nhập tay: cây bữa/món, đổi tên/thứ tự, thêm/nhân đôi/xóa món và thanh tìm thực phẩm/món ghim phía dưới cùng bộ lọc. Bộ điều khiển có dữ liệu từ ngoài không đọc/ghi khẩu phần, chế độ hoặc thuốc trong localStorage nhập tay.
- Lớp hiển thị không thay `MenuInput` bằng dữ liệu gram cũ. Khi đổi tên, sắp xếp, nhân đôi hoặc đổi ngày, giữ quantity, g/ml, servings, customFood, recipeSource, clinicalContext, hệ số/mật độ/nguồn và dấu sao. Bảng cho sửa lượng/suất, đơn vị, cơ sở, hệ số và nguồn, mật độ và nguồn, giờ ăn, trạng thái nguồn, ghi chú; hiện lượng nguồn/mua/thải bỏ khi đủ dữ liệu. Kết quả cũ không được hiện như số mới sau sửa.
- Thêm thực phẩm vào đúng món đang hiển thị, kể cả chưa bấm chọn lại cây. Thêm công thức giữ đủ thành phần; không bỏ qua nguyên liệu chưa liên kết hoặc tự thay lượng thiếu bằng100g. Khung bữa/món trống chỉ phục vụ nhập, không giả làm dòng thực phẩm khi gửi tính.
- Tìm kiếm hủy yêu cầu cũ khi đổi từ khóa/bộ lọc; lỗi HTTP/JSON hiện riêng, không coi là kho không có món.

## Cơ sở dinh dưỡng VDD

- Nguồn công khai đã đọc: [trang món ăn VDD](https://viendinhduong.vn/vi/cong-cu-va-tien-ich/gia-tri-dinh-duong-mon-an) và GET `/api/fe/tool/getPageFoodData?name=phở&pageSize=2&page=1` trên cùng tên miền. Các bản ghi đọc được SFF-213074/SFF-211061 có số dinh dưỡng và đơn vị của chất, nhưng không có mẫu số khối lượng/khẩu phần. Tên biến frontend có `food_per_100g_column` không đủ chứng minh mẫu số của từng bản ghi. Không suy rằng mọi món theo phần hoặc số gốc sai chỉ từ tên/năng lượng/tổng macro.
- Kho hiện không có cơ sở đã xác minh riêng cho VDD `MA`. `nutrientBasis` công khai trạng thái `unverified`, amount=null; `nutrients` để null, số gốc chỉ giữ ở `unverifiedSourceNutrients` để đối soát. Dữ liệu canonical không bị sửa. Food theo quy ước per100 đang dùng có amount=100 cùng unit g/ml; không coi đó là lượng một suất hoặc bằng chứng về trạng thái sống/chín.
- Luồng chat không nhân gram/suất vào số VDD MA chưa rõ mẫu số. prepare trả thiếu `nutrientBasis`; calculate/save/export không chốt dòng có lượng khác0. Số0, null và phần thiếu vẫn khác nhau. Catalogue Excel cũng bỏ số chưa xác minh khỏi ô dùng tính. Không sao chép số chưa rõ sang customFood để lách chặn.
- AI được hướng dẫn tự tìm công thức RNI tương ứng, kiểm Food từng nguyên liệu, trình phương án để người dùng duyệt; không chỉ hứa kiểm tra thêm rồi dừng, không âm thầm đổi/bỏ món. Ô tìm chung cũng chuyển món VDD chưa rõ sang tìm công thức, không gắn nhãn kcal/100g. Công thức chứa Food VDD MA chưa rõ hoặc thiếu liên kết không được thêm bằng cách bỏ thành phần đó.
- Đây chưa phải kiểm chứng lại toàn bộ nguồn VDD hoặc khôi phục các số đã null từ những lần xử lý dữ liệu cũ. Các snapshot nhập tay cũ trong localStorage không bị xóa/ghi lại; không coi thay đổi này là đã rà mọi bản khẩu phần lịch sử.

## REST và hướng dẫn

- TXT, lời nhắn ngắn/đầy đủ, trang bắt đầu, skill chính/onboarding và tham chiếu cài sẵn phân biệt ba khả năng: MCP có sẵn; công cụ HTTP gửi được POST/header/JSON; chỉ đọc được trang. Có HTTP phù hợp thì gọi REST phiên tạm, không bắt tạo tài khoản. Nếu không có cả MCP lẫn HTTP mới hướng dẫn kết nối; không cam kết mọi cuộc chat đều thực thi được HTTP.
- GET `/api/nutrition/v1/workflow` và POST `/get_workflow` công khai như MCP, giới hạn đọc hướng dẫn hiện có và kiểm Origin. Header Authorization sai vẫn lỗi, không được bỏ xác thực để lùi về công khai. Không mở quyền dữ liệu riêng.
- OpenAPI trước đây mô tả mọi công cụ chỉ có OAuth. Nay khai báo đúng thao tác công khai, Bearer phiên tạm hoặc OAuth cho tra/tính/Excel, và OAuth cho tài khoản; REST schema không có sessionToken của MCP. Có đường tạo/kết thúc phiên và workflow; không biến thiếu Bearer thành yêu cầu đăng ký.
- Gói hướng dẫn/plugin phiên bản1.0.12 đã sinh lại cùng SHA256/digest resource. Phiên tạm vẫn30phút; duyệt trước tính, không tự lưu, Excel tùy chọn.
- Đã thử REST thật trên website hiện hành1.0.11: POST guest-session201/accountRequired=false/expiresIn1800 → get_workflow200 → search_foods200 → DELETE phiên200. Token chỉ giữ trong bộ nhớ tiến trình, không in/lưu/Git; không tạo thực đơn/tài khoản hoặc ghi kho để thử. Đây là bằng chứng HTTP không cần tài khoản, chưa phải triển khai bản mới hay nghiệm thu hội thoại ChatGPT/Claude thật.

## Excel

- Mở file đầy đủ tại Thuc don, rồi Bao cao và các phụ lục. Giữ tên sheet, ID thực phẩm, công thức nhập/sửa/tự tính, nguồn, biểu đồ, validation và hợp đồng import; thay thứ tự hiển thị, không trải dữ liệu thành giá trị tĩnh.
- Không đóng băng hoặc tách khung ở các sheet hiển thị, cả bản đầy đủ lẫn bản gọn. Bỏ khóa sheet bằng mật khẩu ngẫu nhiên để người dùng chỉnh lề in, căn ô, độ rộng cột và chiều cao dòng trực tiếp. Công thức vẫn có trong file; bảo vệ sheet không phải cơ chế xác thực dữ liệu: import vẫn kiểm đầu vào và tính lại Food theo ID trên máy chủ. Đã kiểm XML xuất không có pane/sheetProtection ở mọi sheet hiển thị và các kiểm công thức/import hiện có vẫn đạt.
- Đồng bộ Times New Roman; căn phải số, không ngắt chữ số hoặc thu phông; tăng chiều cao dòng theo nội dung bọc. Lề trái/phải0,45 inch, trên/dưới0,5 inch. Bảng hẹp vừa chiều ngang A4; ma trận rộng được chia trang và lặp cột nhận diện thay vì ép160 chất vào một trang.
- Đã render các vùng Thuc don/Bao cao/Phan tich chi tiet trước/sau, xem ảnh và kiểm trường hợp tên món dài. Artifact Tool import không tính đúng một số công thức hiện có, nên ảnh bố cục dùng bản sao tạm lấy giá trị cache và bỏ công thức chỉ trong bản sao QA. Không xuất bản sao đó cho người dùng, không dùng ảnh làm bằng chứng Excel tính lại. File thật vẫn giữ công thức; kiểm số/công thức/import bằng các fixture hiện hành. Chưa mở Microsoft Excel thật hoặc nghiệm thu in giấy cho đợt này.

## Kiểm tra và triển khai

- Full runner Nutrition Chat đạt: core115/report37/security89/OAuth261/storage100/HTTP417/library60/review63/clinical53/analysis56/native708/link27/shared31/saved57/account46, workbook/full-report; package/guide102 sau bổ sung tham chiếu REST. TypeScript và ESLint file sửa đạt; bốn warning cũ tại MealInput (ba img, một hàm chưa dùng) giữ riêng.
- Browser thật chạy component ứng dụng với API/thực phẩm giả lập: desktop1440×1000 và mobile390×844. Kiểm bản nháp mở nhập, dùng ô tìm chung, sửa hồ sơ, giữ localStorage nhập tay777, thêm thực phẩm và đủ hai nguyên liệu công thức, giữ ml, prepare/duyệt/tính/link, bản lưu tài khoản, thêm/chọn ngày2 không mất sáu dòng ngày1, ngày trống vẫn trống; không lỗi runtime/tràn ngang toàn trang. VDD chưa rõ chuyển sang tìm công thức thay vì giả100g. Harness/ảnh là QA cục bộ, không phải backend thật hoặc dữ liệu bệnh nhân.
- Production build Linux/Next16.4.0 đạt khi dùng cache build sạch. Cache Turbopack có sẵn của môi trường này báo `Loading persistence directory failed / invalid digit found in string`; giữ riêng cache sinh tự động rồi build lại, không đổi source/config để né lỗi.
- Bản này cập nhật GitHub trên nhánh `codex/unify-calculator-interface`, PR#5 còn draft, chưa merge main. **Chưa triển khai VPS trong lượt này**. Không migrate/seed/reset hoặc ghi Food/Dish. Bản app trước đã triển khai là đợt64a42a9 trong biên bản giao diện chung; các kiểm VPS cũ không thay cho nghiệm thu đợt này.
