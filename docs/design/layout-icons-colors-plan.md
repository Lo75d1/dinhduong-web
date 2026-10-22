# Kế hoạch bố cục, biểu tượng và màu sắc — Dinh dưỡng 2598

Ngày: 21/10/2026. Người dùng đã chốt triển khai phương án A: xanh ngọc–trắng,
logo bát/lá, icon Lucide và minh họa Storyset Pana. Đã triển khai trong mã nguồn
PR#9; bản84dec6c đã lên VPS. Sau phản hồi quá nhiều xanh, người dùng chốt đợt
điều chỉnh trung tính trong `neutral-ui-2026-10-21.md` (chưa lên VPS).
Chi tiết tài sản/giấy phép: `asset-sources.md`.

## 1. Mục tiêu và quyết định đã chốt

Giúp người dùng tìm đúng thao tác nhanh hơn, đọc được số liệu và hiểu bước tiếp
theo. Thứ tự thiết kế: công việc → bố cục → icon/nhãn → màu → ảnh minh họa.
Không dùng số lượng icon, ảnh hoặc hiệu ứng làm thước đo cải thiện.

Đối tượng gồm người tra cứu/lập khẩu phần cá nhân, chuyên gia dinh dưỡng và
Admin quản lý kho mẫu. Bố cục phải giữ ranh giới quyền và khả năng đang có.

Bản UI ở PR#9 có tra cứu đầu trang, menu điện thoại và trợ giúp thu gọn. Đợt
triển khai này bổ sung nhận diện, token màu dùng chung, tranh có nguồn và bố cục
nhập khẩu phần rộng hơn. Các màn tra cứu, Admin và AI dùng cùng quy tắc.

Đã chọn xanh ngọc–trắng, giữ ý tưởng bát/lá, icon Lucide và Storyset Pana.
Đây là lựa chọn thiết kế cho sản phẩm, không phải kết luận từ nghiên cứu rằng
một màu hoặc một bộ icon sẽ làm mọi người thao tác nhanh hơn.

## 2. Bố cục chung

- Đầu trang gọn: nhận diện và tài khoản; điều hướng tác vụ có nhãn, chỉ rõ trang
  hiện tại. Tra cứu và Tính khẩu phần dễ thấy, các mục còn lại vẫn tìm được.
- Đầu mỗi màn hình: tên việc đang làm, trạng thái nếu có và một thao tác chính
  phù hợp ngữ cảnh. Các nút phụ cùng khu vực nhưng nhẹ hơn.
- Dữ liệu có cấu trúc dùng bảng hoặc danh sách hàng; mô tả dùng đoạn ngắn.
  Thanh tìm kiếm/lọc đặt ngay trên dữ liệu, kèm xóa lọc và số kết quả khi API có.
- Hướng dẫn dùng một khung trắng thu gọn; cảnh báo ảnh hưởng thao tác hiện tại
  và lỗi nhập vẫn phải hiện gần trường/nút liên quan, không bị chôn trong trợ giúp.
- Desktop dùng chiều rộng cho bảng/đối chiếu; đoạn đọc dài giới hạn độ dài dòng.
  Không trải một đoạn hướng dẫn thành dòng kéo ngang toàn màn hình.
- Điện thoại xếp lại cột, giữ nhãn và chỗ chạm đủ rộng. Chỉ bảng nhiều cột cần
  cuộn ngang trong vùng riêng; tên món, giá trị và đơn vị vẫn hiểu được.
- Thanh thao tác cố định chỉ dùng ở quy trình dài khi hữu ích; kiểm bàn phím,
  vùng an toàn và tránh che ô nhập/thông báo. Không cố định mọi nút trên mọi trang.

## 3. Kế hoạch theo màn hình

| Màn hình | Bố cục đề xuất | Thao tác ưu tiên | Nội dung thu gọn |
| --- | --- | --- | --- |
| Trang chủ | Tra cứu ở đầu; các lối vào bộ tính, món ăn và AI liền sau; minh họa vừa phải ở bên cạnh trên desktop | Tra cứu hoặc mở Tính khẩu phần | Giới thiệu dài, nguồn, hỗ trợ/cảm ơn |
| Tra cứu thực phẩm / món ăn | Tìm kiếm và lọc trên cùng; danh sách/bảng là vùng chính; chi tiết mở riêng theo luồng hiện có | Tìm, mở chi tiết; trong bộ tính mới có thao tác thêm vào khẩu phần | Giải thích nguồn, khác biệt thực phẩm/món ăn |
| Tính khẩu phần | Giữ hai bước Nhập / Kết quả. Desktop: cây ngày–bữa–món và chi tiết nhập cạnh nhau; kết quả có tổng quan trước, bảng đối chiếu sau | Thêm thực phẩm/món ở bước nhập; xem/tính kết quả và xuất theo khả năng hiện có | Các diễn giải dài; không giấu nguyên liệu hoặc số liệu cần duyệt |
| Kho mẫu Admin | Thanh tìm/lọc, danh sách hàng; xem mẫu chọn ngày/bữa/nhóm và bảng định lượng | Xem mẫu; thêm qua AI đã ủy quyền | Hướng dẫn, lưu ý không chặn thao tác, lịch sử |
| Admin tổng quan | Ba nhóm công việc, hàng thao tác trực tiếp; form chỉ hiện khi mở công việc | Mở công việc tương ứng | Giải thích vận hành chung |
| Kết nối AI | Bắt đầu → kết nối → giao việc; trạng thái kết nối/quyền rõ. Admin có khu cấp/thu hồi riêng | Sao chép lời nhắn/kết nối; Admin chọn đúng phiên để cấp quyền | Chi tiết kỹ thuật và cách cấu hình nâng cao |

Kho mẫu tập thể hiện lưu nháp, chưa có máy tính nhiều nhóm hoặc xuất đi chợ;
không vẽ nút “Tính tập thể”, “Duyệt chuyên môn” hoặc “Xuất đi chợ” như tính năng
đã dùng được. Lưu thực đơn cá nhân vẫn theo yêu cầu của người dùng.

## 4. Icon thao tác, logo và ảnh minh họa

Ba thành phần có nhiệm vụ riêng: logo nhận diện thương hiệu; icon hỗ trợ nhận
ra thao tác; tranh giải thích tình huống. Không dùng logo làm icon cho mọi chức
năng hoặc dùng tranh lớn thay nút thao tác.

### Icon thao tác

Đã chọn 28 SVG Lucide từ commit cố định, nét và kích thước thống nhất, màu theo
giao diện. Lưu SVG chọn lọc và giấy phép trong repo; không thêm dependency mới.
Bảng dưới là ánh xạ tác vụ; các nút nghiệp vụ vẫn theo khả năng thực tế hiện có.

| Công việc | Biểu tượng đề xuất | Nhãn hiển thị |
| --- | --- | --- |
| Tìm thực phẩm | Search | Tra cứu |
| Nhập/tính khẩu phần | Calculator | Tính khẩu phần |
| Tra công thức | CookingPot / Utensils | Món ăn |
| Kho mẫu thực đơn | NotebookTabs | Kho thực đơn |
| Phân tích kết quả | ChartPie | Kết quả |
| Làm việc với AI | MessagesSquare | Nhập qua AI |
| Tìm hướng dẫn | CircleHelp | Trợ giúp |
| Lưu / tải / lọc | Save / Download / SlidersHorizontal | Lưu nháp / Tải báo cáo / Bộ lọc |

Nhãn đi cùng icon ở điều hướng và tác vụ quan trọng; không dựa vào tooltip chỉ
xuất hiện khi rê chuột. Kích thước hình dự kiến20–24px, vùng chạm tối thiểu44px
là mục tiêu thiết kế của dự án. Trạng thái chọn có cả nhãn/đường nhấn, không chỉ màu.

### Logo, favicon và icon ứng dụng

Đã xem tệp hiện có: avatar bát/lá1280×1280, ảnh bìa1280×400; icon192/512 đang
là chữ2598. Avatar và ảnh bìa có chữ “Dola AI”. Cần bộ nhận diện sạch, nhất quán.

Hướng đề xuất: giữ liên hệ với bữa ăn bằng hình bát hoặc đĩa đơn giản, tối đa
hai yếu tố hình, tách chữ “Dinh dưỡng 2598” khỏi biểu tượng khi dùng ở cỡ nhỏ.
Đã làm bản màu, một màu, nền sáng/tối, app icon và maskable; raster hóa favicon
16/32px từ SVG. Logo là vector biên soạn riêng cho dự án.

Danh mục thay khi triển khai: avatar đầu trang, `src/app/icon.png`,
`public/icon-192.png`, `public/icon-512.png`, icon maskable riêng nếu cần,
ảnh chia sẻ `public/dinh-duong-2598-og.png`, màu theme của manifest và metadata.
Giữ nguyên URL bắt đầu, chức năng và phạm vi Admin của PWA Phân loại hiện có.

### Tranh minh họa

Đề xuất chọn cùng phong cách semi-flat Pana: bố cục ít chi tiết, có lớp trước/sau
vừa phải, khoảng trống cho giao diện; chữ giữ là HTML, không nhúng vào tranh.
Chọn các chủ đề bữa ăn, lập kế hoạch và dữ liệu, dùng ở trang chủ/onboarding hoặc
trạng thái trống phù hợp; khu nhập liệu/bảng số không lặp lại ảnh nền trang trí.

Mẫu tham khảo cụ thể:
- Healthy food, Pana: https://storyset.com/illustration/healthy-food/pana
- Healthy food, Rafiki (so sánh nét phẳng hơn): https://storyset.com/illustration/healthy-food/rafiki
- Eating healthy food, Bro (so sánh nét hoạt hình hơn): https://storyset.com/illustration/eating-healthy-food/bro
- unDraw, nhóm health: https://undraw.co/search/health

Storyset cho chỉnh màu/lớp và dùng miễn phí có ghi công theo điều khoản; dùng
đúng điều kiện của tài sản đã chọn. unDraw có điều khoản riêng, cho dùng thương
mại không yêu cầu ghi công trong phạm vi giấy phép; không gọi toàn bộ kho là
public domain. Khi triển khai lưu nguồn, tác giả/nhà cung cấp, ngày lấy và giấy
phép/ghi công tương ứng. Đã đưa Healthy food — Pana vào trang chủ, đổi màu và bỏ nền phụ; nguồn, thay
đổi và ghi công được lưu trong `asset-sources.md`. Các mẫu khác chỉ tham khảo.

## 5. Bảng màu đã chọn và các phương án tham khảo

| Phương án | Màu chính | Nền | Chữ chính | Điểm nhấn | Nhận xét thiết kế |
| --- | --- | --- | --- | --- | --- |
| A — xanh ngọc, đề xuất | #0F766E | #F3FAF8 + #FFFFFF | #153A3D | #F4B183 | Sáng hơn bản xanh rêu hiện tại, vẫn nối được nhận diện cũ |
| B — xanh dương | #1D4ED8 | #F4F8FC + #FFFFFF | #12324A | #0F766E | Phân biệt rõ với màu lá, thiên về công cụ phân tích |
| C — xanh lá | #236C4B | #F5F8F5 + #FFFFFF | #163629 | #C8802D | Gắn với thực phẩm; cần tránh làm mọi thành phần cùng xanh |

Chỉ một màu chính cho nút quan trọng; màu nhấn dùng tiết chế. Màu đạt/chưa đạt,
thiếu dữ liệu và lỗi phải có chữ hoặc ký hiệu kèm theo. Thiếu dữ liệu vẫn là —,
0 vẫn là số0; không tô xanh để ngầm khẳng định thực đơn đã đạt khi chưa có căn cứ.

Giữ Times New Roman/Times/serif của web trong đợt này; sửa thứ bậc, cỡ và khoảng
cách trước. Kiểm từng cặp màu thực tế: chữ thường tối thiểu4.5:1; chữ lớn3:1;
những nét/thành phần có ý nghĩa áp dụng yêu cầu non-text contrast3:1 theo phạm
vi WCAG. Các mã màu trong bảng chưa phải chứng nhận mọi trạng thái đã đạt.

## 6. Thứ tự thực hiện và đầu ra

| Đợt | Việc làm | Đầu ra có thể xem lại |
| --- | --- | --- |
| 1 | Chốt tông màu, kiểm kê tác vụ và vị trí điều hướng | Bảng màu theo vai trò, sơ đồ bố cục cho từng màn hình |
| 2 | Chọn icon và hình tham khảo, phác logo/favicon | Bảng icon–nhãn; danh mục ảnh có nguồn; biến thể logo |
| 3 | Dựng mẫu hai trang đại diện trước | Trang chủ và màn nhập khẩu phần ở desktop/điện thoại |
| 4 | Thử tác vụ, sửa điểm khó tìm rồi áp dụng tiếp | Tra cứu, kho mẫu, Admin và AI theo cùng quy tắc |
| 5 | Kiểm kỹ thuật, đối chiếu quyền và nghiệm thu | Build/browser/ảnh thực tế, danh sách thay đổi và hướng dẫn triển khai |

Đã thực hiện đợt 1–4 và kiểm kỹ thuật ở đợt 5: nhận diện, màu chung, trang chủ,
nhập khẩu phần, tra cứu và Admin/AI. Biên bản: `ui-implementation-2026-10-21.md`.
Chưa nghiệm thu trên VPS hoặc đo thời gian thao tác với người dùng thật. Các
trang sâu nhận token chung nhưng chưa được kiểm từng tương tác trên mọi trang.

## 7. Cách đánh giá “tìm đúng thao tác nhanh hơn”

Thử bản cũ và bản đề xuất với cùng tác vụ, tốt nhất3–5 người đại diện khi có thể.
Đây là thử định tính nhỏ, không phải bằng chứng thống kê về toàn bộ người dùng.

1. Tìm thông tin một thực phẩm.
2. Mở nhập khẩu phần và thêm thực phẩm/món.
3. Tìm kết quả và xuất báo cáo đúng bước.
4. Admin tìm một mẫu, xem đúng ngày và nhóm tuổi.
5. Admin tìm đúng phiên AI để cấp hoặc thu hồi quyền.

Ghi thời gian tới lần bấm đúng đầu tiên, số lần bấm nhầm/quay lại và có cần người
hướng dẫn không. Không kết luận nhanh hơn chỉ từ việc icon trông đẹp hơn.

Kiểm thêm:320/390/768/1440px, chữ/tên món dài, phóng to, focus bàn phím, trạng
thái rỗng/tải/lỗi, nhãn người đọc màn hình, null/0 và quyền từng vai trò. Các
bản xem trước chỉ chứa dữ liệu minh họa, không đưa dữ liệu người bệnh vào tranh.

## 8. Nguồn nghiên cứu

Đọc ngày21/10/2026; lựa chọn thiết kế ở trên là đề xuất cho sản phẩm.

- NN/g, Icon Usability — nhãn luôn nhìn thấy, tính nhất quán và thử khả năng nhận biết: https://www.nngroup.com/articles/icon-usability/
- NN/g, How to Test Digital Icons — phân biệt nhận biết hình và hiểu nghĩa trong ngữ cảnh: https://www.nngroup.com/articles/how-to-test-digital-icons/
- Lucide — thư viện và tùy chỉnh: https://lucide.dev/ ; giấy phép: https://lucide.dev/license
- Phosphor — lựa chọn thay thế: https://phosphoricons.com/ ; giấy phép: https://github.com/phosphor-icons/core/blob/main/LICENSE
- Storyset — minh họa: https://storyset.com/ ; điều khoản: https://storyset.com/terms
- unDraw — minh họa: https://undraw.co/ ; giấy phép: https://undraw.co/license
- W3C — contrast: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- W3C — non-text contrast: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- W3C — use of color: https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
