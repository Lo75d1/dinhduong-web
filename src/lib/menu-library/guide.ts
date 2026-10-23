import { CLASSIFICATION, LIBRARY_API_PATH, LIBRARY_PATH, LIBRARY_UPDATED_AT, LIBRARY_VERSION, MEAL_REFERENCE_RULES, REFERENCE_SOURCES } from "./catalog";
import { PRIMARY_SCHOOL_DRAFT } from "./contracts";
import { RICE_MEAL_RULES } from "@/lib/nutrition-chat/menu-guidance";

export const GUIDE_SECTIONS = [
  {
    id: "phan-loai", title: "1. Chọn nhánh và đơn vị",
    paragraphs: [
      "Kho quản trị hiển thị một thẻ cho một bộ thực đơn; số thực đơn không cộng lặp theo số ngày. Mở Xem nhanh rồi chọn đúng ngày và khẩu phần; món và định lượng vẫn thuộc ngày → bữa → nhóm. Thẻ hiển thị năng lượng mục tiêu, số bữa đã khai báo, số ngày thực có, đối tượng, mô tả và hashtag. Không suy ra đủ ngày chỉ từ nhãn full_day. Ba kho điều hướng: Cá thể, Tập thể, Bệnh viện; Bệnh viện tách Thực đơn bệnh lý (khuyến nghị cho người bệnh) và Suất ăn bệnh lý (phục vụ người bệnh tại bệnh viện). Ăn dặm / Trẻ em / Người lớn là thẻ đối tượng, không phải kho thứ tư. Ưu tiên Cá thể/Tập thể; tạm dừng bổ sung nội dung bệnh viện. Tập thể đi theo đơn vị → nhóm người ăn → thực đơn áp dụng → ngày → bữa → món → nguyên liệu. Cá nhân có hồ sơ, mục tiêu, hoạt động và chế độ ăn riêng.",
      "Thực phẩm và công thức món ăn dùng chung từ kho hiện có. Mẫu thực đơn được biên soạn riêng cho từng đối tượng. Khi áp dụng cho đơn vị, tạo bản sao có ghi mẫu gốc và phiên bản; chỉnh bản áp dụng không làm đổi mẫu.",
      "Cá thể chọn mục tiêu kcal; không tạo danh mục tăng cân / giảm cân riêng. Tập thể khai báo các bữa thực tế phục vụ. Mẫu cũ chưa có lifeStage không bị ép hiện Chưa phân loại trong danh mục; không đoán tuổi từ tiêu đề. description và tags là trường tùy chọn; mô tả tối đa 1.000 ký tự, tối đa 20 hashtag, mỗi hashtag 50 ký tự. Dùng title cho tên, groups[].label cho đối tượng và groups[].designEnergyKcal cho năng lượng; không nhét tất cả vào tên.",
      "Bối cảnh ăn uống lưu bằng eatingContext ở thực đơn và từng bữa: home = Tại nhà, restaurant = Ngoài quán, mixed = Kết hợp, chưa biết = null. Tại nhà chỉ món tự chuẩn bị; món mua tại quán mang về vẫn thuộc Ngoài quán. Sản phẩm đóng gói như sữa chua dùng cùng bữa tự nấu không tự biến bữa thành ăn ngoài quán. Bối cảnh độc lập với nhánh, đơn vị và mục tiêu; bếp bệnh viện/công nghiệp tiếp tục phân theo đơn vị, không tự gán home hay restaurant khi chưa có thông tin phù hợp.",
      "Bữa có eatingContext=null hoặc thiếu trường được kế thừa thực đơn home/restaurant; thực đơn mixed không cho biết bối cảnh từng bữa, cần khai báo riêng. Nếu bữa khác bối cảnh chung, đặt thực đơn mixed và ghi từng bữa; một bữa cũng có thể mixed khi vừa tự nấu vừa mua quán. Mẫu cũ thiếu trường vẫn đọc/lưu được và hiện Chưa xác định; không đoán phân loại từ tên món.",
      "Mỗi món phải có preparation.method, texture, steps và notes; mỗi nhóm có lifeStage, guidance.notes và guidance.recommendations. Ăn dặm khai rõ ageMonths. Nhãn mềm/xay/lỏng chỉ mô tả kết cấu, không chứng nhận tiêu chuẩn nuốt hoặc đường sonde. Mẫu cũ vẫn mở/sửa được nhưng thiếu nội dung thì chưa duyệt mới.",
      "Nút Xóa đưa thực đơn vào Thùng rác bằng availability.state=archived kèm reason; giữ nội dung, phiên bản và lịch sử. Khôi phục bằng active. Có chọn nhiều để xóa/khôi phục/chuyển kho/gắn nhãn. Chọn bữa từ nhiều thực đơn vào khay rồi sao chép hoặc chuyển sang ngày và nhóm được xác nhận; sao chép giữ nguyên một suất, không tự khớp kcal hay chỉ định bệnh lý. Các thao tác ghi luôn tạo bản nháp mới và kiểm tra phiên bản. Không xóa hàng loạt khi chưa xác định mẫu lỗi. Giá tiền và thời gian chế biến để giai đoạn sau; hiện chỉ gắn nhãn hình thức chế biến và kết cấu có căn cứ.",
    ], references: [],
  },
  {
    id: "nhom-khau-phan", title: "2. Chia nhóm khẩu phần trước khi lên món",
    paragraphs: [
      "Trường học lưu cấp học và nhóm tuổi thành các trường riêng. Với tiểu học, khởi tạo nhóm 6–7, 8–9 và 10–11 tuổi rồi đối chiếu tuổi thực tế. Không lấy mức cao nhất, thấp nhất hay trung bình của cả trường làm mặc định.",
      "THCS và THPT tiếp tục đối chiếu nhóm tuổi của nguồn đã chọn. Nhà trẻ và mẫu giáo có cơ cấu bữa khác nhau; xác nhận chương trình của trường, kể cả trường thuộc diện thí điểm chương trình mới.",
      "Mỗi nhóm lưu nguồn nhu cầu ngày, giới, hoạt động và chế độ ăn khi cần. Nếu dùng giá trị trung bình nam/nữ theo một tài liệu thì phải ghi rõ căn cứ đó. Cùng bộ món có thể có định lượng riêng cho từng nhóm; không nhân đồng loạt mọi nguyên liệu theo một hệ số năng lượng.",
    ], references: ["byt-3958-2025", "bgddt-vbhn-01-2021", "bgddt-pilot-2026"],
  },
  {
    id: "ngay-bua", title: "3. Xác định bữa phục vụ và tỷ lệ so với cả ngày",
    paragraphs: [
      "Chọn rõ thực đơn cả ngày hay chỉ các bữa đơn vị phục vụ. Một bữa trưa vẫn là một phần nhu cầu ngày. Không tự đưa bữa trưa lên 100% và không chuyển tỷ lệ của bữa không phục vụ sang bữa còn lại.",
      "Mỗi bữa có ID và mã ổn định, nhãn hiển thị có thể đổi: Xế / Phụ chiều. Bữa chính chiều của nhà trẻ khác bữa phụ chiều. Bữa được lưu độc lập dù chưa có món; mẫu có số thứ tự ngày và có thể chưa gắn ngày lịch.",
      "Các khoảng phần trăm dưới đây đều có mẫu số là năng lượng cả ngày. Khi chốt kế hoạch phải kiểm tra đồng thời từng bữa và tổng các bữa. Không cộng tất cả cận trên hoặc cận dưới để tạo một mục tiêu mặc định. Với cả ngày, các mức được chọn phải phân bổ đủ 100%; với bữa phục vụ, kiểm tra tổng trong phạm vi áp dụng.",
      "Người trưởng thành cần nguồn nhu cầu theo tuổi, giới và hoạt động. Tỷ lệ bữa ăn ca là tham khảo chuyên môn theo bối cảnh, không phải tỷ lệ pháp lý chung cho mọi người lớn. Bảng nhu cầu 2026 chưa được nhập vì chưa đối chiếu bản gốc.",
    ], references: ["byt-3958-2025", "bgddt-vbhn-01-2021", "byt-1982-2026", "vnniosh-shift-2025", "vdd-rni-2026"],
  },
  {
    id: "cau-truc-bua-com", title: "4. Cấu trúc bữa cơm thường",
    paragraphs: RICE_MEAL_RULES, references: [],
  },
  {
    id: "dinh-luong", title: "5. Ghi định lượng và chuẩn bị tính đi chợ",
    paragraphs: [
      "Lưu định lượng nguyên liệu cho một suất của từng nhóm, kèm đơn vị g hoặc ml và cơ sở sống sạch ăn được. Chỉ dùng mã thực phẩm thật từ kho. Không gán dinh dưỡng hoặc khối lượng riêng do AI đoán.",
      "Quy ước vận hành do Admin chọn: lượng mới biên soạn hoặc sửa tay để nấu một suất dùng bước 1 g/ml. Không tự nâng từng lượng gia vị lẻ lên 1 g; phải cân chỉnh lại cả công thức và tính lại dinh dưỡng. Nguồn phân tích hoặc bản cũ có lượng lẻ được giữ nguyên cho đối soát, không làm tròn âm thầm.",
      "Với nấu tập thể, nhập số suất nấu thực tế rồi nhân định lượng một suất; lượng cân cho mẻ được làm tròn đến 1 g/ml sau bước nhân. Ví dụ 0,25 g/suất × 100 suất = 25 g/mẻ, không phải 100 g. Dòng dương dưới 1 g/ml phải báo dưới độ chia, không biến thành 0 hoặc tự tăng liều. Lượng mẻ là sống sạch, chưa phải lượng mua và không đổi dữ liệu tính dinh dưỡng một suất.",
      "Số suất được nhập theo ngày × bữa × nhóm. Chưa biết lưu null; xác nhận không phục vụ mới ghi 0. Tổng mua chỉ được chốt khi các số suất và quy đổi cần thiết đã đủ.",
      "Công thức dự kiến: tổng nguyên liệu ăn được = tổng (định lượng một suất của từng nhóm × số suất thực tế). Ví dụ thuần kiểm thử: 120 × 60 g + 100 × 70 g + 80 × 80 g = 20,6 kg gạo cho 300 suất; không dùng định lượng của một nhóm nhân cho toàn trường.",
      "Khối lượng mua = khối lượng sống sạch / tỷ lệ ăn được. Ví dụ 1 kg / 0,8 = 1,25 kg. Tỷ lệ ăn được khác hiệu suất nấu chín; thiếu hệ số thì báo thiếu, không tự lấy 1. Dự phòng và làm tròn quy cách mua được tính thành mục riêng.",
    ], references: ["byt-3958-2025"],
  },
  {
    id: "doi-chieu", title: "6. Ghi căn cứ và đánh giá đạt mục tiêu",
    paragraphs: [
      "Nguồn nhu cầu ngày và nguồn chia tỷ lệ bữa là hai liên kết độc lập. Mỗi mục tiêu cần tên chất, đơn vị, loại mốc (mục tiêu/khoảng/tối thiểu/tối đa), mẫu số, tài liệu, phiên bản và vị trí trích dẫn. Không lấy bảng cũ gắn nhãn nguồn mới.",
      "Hiện tổng lượng hiện có và % đáp ứng mốc khuyến nghị cho cả cá thể/tập thể, kể cả dưới 100%. Nhóm có recommendationProfile được khớp bảng KhuyenNghi đang có bằng bộ tính hiện hành; giữ nguồn và dòng khớp, không gắn nhãn năm tài liệu chưa xác minh. Dữ liệu một số thực phẩm còn thiếu thì vẫn hiện % theo tổng phần đã biết, đánh dấu *; không coi đó là tổng đầy đủ hoặc mức đạt đã xác nhận. Natri/mốc tối đa ghi % giới hạn, không gọi thiếu là không đạt. Chỉ tính % khi có mốc hợp lệ dương và một tổng đã biết; không ép thiếu dữ liệu thành số 0. Số liệu thiếu giữ null và hiển thị dấu —; 0 là giá trị đã biết. Đạt năng lượng không đồng nghĩa đạt protein, lipid, glucid, vi chất hoặc chế độ ăn.",
      "Admin mở mẫu để xem bữa → món → thực phẩm và định lượng; năng lượng và P–L–G tự tính khi mở. Chọn Chỉnh khẩu phần để thêm/xóa món, chọn thực phẩm thật và sửa gram; kết quả tự cập nhật theo lượng đang sửa. Tính thử không lưu hoặc duyệt; chọn Lưu thay đổi để tạo phiên bản mới. Mục tiêu thiết kế riêng của nhóm dùng designEnergyKcal, không thay thế dailyReferences hay nhu cầu người bệnh. Phân tích chi tiết, dữ liệu thiếu và nguồn nằm ở phần thu gọn bên dưới. Phần đã biết không phải tổng đầy đủ; tỷ lệ chỉ hiện khi đủ dữ liệu tương ứng.",
      "Chỉ Admin đăng nhập trên website được Duyệt phiên bản hoặc Yêu cầu chỉnh sửa, sau khi xác nhận đã xem món, lượng và dữ liệu thiếu. Kết quả duyệt lưu người duyệt, thời gian, nhận xét và phân tích tại thời điểm duyệt. Sửa sau duyệt tạo phiên bản chưa duyệt, giữ lịch sử cũ. AI không tự duyệt, không coi lưu nháp là phê duyệt chuyên môn.",
      "Bản đầu là danh mục và hướng dẫn tham khảo đã đối chiếu, chưa phải bộ quy tắc tính tự động được chuyên môn phê duyệt. Nguồn chờ bản gốc không được dùng tạo trị số. Đơn ăn bệnh lý cần mã chế độ và xác nhận chuyên môn trước khi áp dụng.",
    ], references: ["byt-1982-2026", "vdd-rni-2026"],
  },
  {
    id: "ai", title: "7. Quy trình giao việc cho AI",
    paragraphs: [
      "Bắt đầu bằng nhánh, đơn vị, bối cảnh ăn uống, cấu trúc bữa cơm, chương trình/cấp học, nhóm người ăn, phạm vi ngày/bữa, nguồn mục tiêu, số suất và dị ứng/chỉ định đã biết. Ngân sách/giá tiền và thời gian chế biến để giai đoạn sau. Hỏi phần còn thiếu theo đợt, tối đa ba câu mỗi lần; không tự điền dữ kiện dinh dưỡng.",
      "Tra thực phẩm và công thức thật; lập đầy đủ ngày → bữa → món → nguyên liệu, định lượng, đơn vị và số suất cho từng nhóm. Trình bản nháp cho người dùng duyệt trước khi tính. Công thức do AI gợi ý phải ghi nguồn AI, không giả mã công thức RNI.",
      "Khi người dùng yêu cầu lưu lâu dài vào kho mẫu, dùng save_admin_menu_template và trả URL thật của mẫu trong Admin; không lấy liên kết bản tạm 30 phút làm kết quả lưu kho. Có thể lưu nháp đang biên soạn, ghi rõ phần còn thiếu và chưa duyệt; không gọi đó là bản đã cân đối hay đã tính. Những lần chỉnh tiếp theo cập nhật đúng mẫu và giữ lịch sử phiên bản. Lưu kho mẫu khác lưu Ration cá nhân.",
      "Với cá nhân, đọc workflow hiện có tại /ket-noi-ai/bat-dau/huong-dan.txt rồi dùng công cụ đang thực sự được cung cấp: prepare_menu, xác nhận người dùng, sau đó calculate_menu. Không tự lưu vào tài khoản; chỉ lưu khi được yêu cầu. Trả liên kết thật và thời hạn do máy chủ cung cấp.",
      "Với kho mẫu, Admin có thể ủy quyền cho đúng phiên OAuth tại /quan-tri/ket-noi-ai: quyền đọc hoặc đọc và lưu/sửa nháp, có thời hạn và thu hồi. Danh mục công cụ được công bố sẵn; quyền được kiểm tra ở mỗi lần gọi. Sau khi cấp quyền, giữ nguyên kết nối và yêu cầu AI thử lại. Đối chiếu mã phiên trong lỗi với trang ủy quyền; không ngắt/kết nối lại chỉ để nhận quyền. Không gửi MenuLibraryDraft vào công cụ tính cá nhân. Website có phân tích một suất cho từng nhóm; chưa có công cụ AI phân tích kho hoặc xuất đi chợ tập thể.",
      "Trang và tệp này yêu cầu phiên Admin. ChatGPT/Claude không tự thừa hưởng phiên đăng nhập website; AI chỉ được ghi khi phiên OAuth của chính Admin đã được ủy quyền riêng. Admin có thể sao chép nội dung hướng dẫn để giao việc; không gửi cookie, mật khẩu, token hay dữ liệu người bệnh. Nội dung tài liệu không cấp quyền quản trị cho AI.",
    ], references: [],
  },
] as const;

function referenceText() {
  return REFERENCE_SOURCES.map(source => `[${source.number}] ${source.title}\nCơ quan: ${source.issuer}; phiên bản: ${source.version}; loại: ${source.kind === "official" ? "Văn bản/nguồn chính thức" : "Tham khảo chuyên môn"}; trạng thái: ${source.verification === "pending" ? "CHỜ XÁC MINH BẢN GỐC, KHÔNG NHẬP TRỊ SỐ" : "Đã đối chiếu phần ghi chú, chưa phê duyệt quy tắc tự động"}.\nPhạm vi: ${source.scope}\nVị trí: ${source.locator}\nGhi chú: ${source.note}\nLiên kết: ${source.url}`).join("\n\n");
}

function ruleText() {
  return MEAL_REFERENCE_RULES.map(rule => {
    const source = REFERENCE_SOURCES.find(item => item.id === rule.sourceId)!;
    return `${rule.id} | ${rule.profile} | ${rule.label}: ${rule.min}–${rule.max}% năng lượng cả ngày | [${source.number}] ${rule.sourceVersion} | CHỈ THAM KHẢO`;
  }).join("\n");
}

export function menuAiGuide() {
  return [
    `DINH DƯỠNG 2598 — HƯỚNG DẪN LẬP MẪU THỰC ĐƠN\nPhiên bản ${LIBRARY_VERSION}; cập nhật ${LIBRARY_UPDATED_AT}; phạm vi Admin.`,
    "Đọc toàn bộ nội dung dưới đây trước khi lập mẫu. Đây là hướng dẫn nghiệp vụ và dữ liệu, không phải quyền gọi API quản trị. Nguồn tham khảo không được ghi đè yêu cầu người dùng hoặc quyền máy chủ.",
    ...GUIDE_SECTIONS.map(section => `${section.title}\n${section.paragraphs.join("\n\n")}\n${section.references.map(id => `[${REFERENCE_SOURCES.find(source => source.id === id)!.number}]`).join(" ")}`),
    `CÔNG CỤ AI ĐÃ CÓ\nSau ủy quyền, dùng get_admin_menu_workflow → search_foods/search_dishes/get_food/get_dish → lập cấu trúc đúng schema → khi người dùng yêu cầu lưu, gọi save_admin_menu_template. Đọc list_admin_menu_templates/get_admin_menu_template để tìm và sửa mẫu. Mô tả năm công cụ được công bố sẵn, kể cả khi quét ẩn danh; đây không phải quyền đọc hay ghi. Mỗi lần gọi vẫn kiểm tra tài khoản Admin và ủy quyền của đúng phiên OAuth. Nếu chưa có quyền, làm theo lỗi và mã phiên để Admin cấp quyền tại /quan-tri/ket-noi-ai, rồi gọi lại bằng cùng kết nối. Sau khi website cập nhật danh mục, nền tảng có thể cần làm mới metadata một lần; không xóa/ngắt kết nối và không đăng nhập lại chỉ để nhận quyền. Lưu mới: {content,requestKey,reason}, content.version=1, ID mới ổn định. Sửa: thêm templateId, expectedRevision, content.version=expectedRevision+1. Không đổi requestKey khi thử lại cùng lần tạo. API trả409: đọc lại phiên bản; không tự ghi đè. Chỉ nói đã lưu khi nhận thành công kèm id/revision/url thật. Báo rõ còn thiếu mục tiêu, số suất hoặc món trong bản nháp. Không tự cấp quyền hay duyệt chuyên môn.\nREST: POST /api/admin/menu-library/tools với {name,arguments}, Bearer OAuth có ủy quyền. Ghi trực tiếp: POST /api/admin/menu-library/templates hoặc PUT /api/admin/menu-library/templates/{id}; đọc danh sách GET và đọc mẫu GET /{id}. Cookie Admin khi ghi cần x-menu-library-csrf từ GET danh sách và Origin đúng website. API ủy quyền chỉ nhận Admin trên website, không nhận Bearer.`,
    "ẢNH MINH HOẠ BỮA ĂN\nKhi người dùng yêu cầu ảnh, tạo ảnh thể hiện đúng các món, kết cấu và đối tượng của bữa đã chốt; ảnh không phải căn cứ tính dinh dưỡng hay ảnh đối chứng suất ăn bệnh viện. Tải JPG/PNG/WebP tĩnh tối đa 5 MB qua upload_admin_menu_image với {base64,alt,sourceKind,requestKey}; base64 thuần, không có tiền tố data:, không gửi URL hay đường dẫn cục bộ. sourceKind=ai cho ảnh do AI tạo; manual cho ảnh người dùng cung cấp. Giữ requestKey nếu thử lại cùng lượt; không tự bịa assetId. Công cụ cần ủy quyền GHI của đúng phiên OAuth. Lấy illustration trả về và gắn vào đúng days[].meals[].groupPortions[].illustration, gồm {assetId,alt,sourceKind}; sau đó save_admin_menu_template theo phiên bản mới nhất. Một bữa có thể có ảnh riêng cho từng nhóm ăn; không gắn nhầm ngày/bữa/nhóm. Có thể sửa alt; không đổi sourceKind của ảnh đã tải. Để null hoặc bỏ trường khi chưa có ảnh. Ảnh được giữ khi sao chép/chuyển bữa. Thay hoặc bỏ ảnh tạo phiên bản thực đơn mới, không xoá tệp ảnh cũ vì lịch sử còn tham chiếu. Website: Chỉnh bữa → tải hoặc kéo ảnh vào khung → Lưu thay đổi. Ảnh có URL công khai; không đưa thông tin định danh người bệnh vào ảnh hoặc mô tả. REST: POST /api/admin/menu-library/images nhận multipart với file/alt/sourceKind/requestKey, hoặc JSON như công cụ; dùng Bearer có ủy quyền hoặc cookie Admin + Origin + x-menu-library-csrf. Không tải URL bên ngoài. Sau khi website được triển khai, làm mới danh sách công cụ của plugin nếu chưa thấy upload_admin_menu_image; không cần ngắt/kết nối lại.",
    `PHÂN LOẠI\n${CLASSIFICATION.map(row => `${row.branch} / ${row.type}: ${row.groups} ${row.basis}`).join("\n")}`,
    `TỶ LỆ BỮA THAM KHẢO\n${ruleText()}`,
    "HỢP ĐỒNG NHÁP v1.2\nMenuLibraryDraft khác MenuInput cá nhân. Bản mới dùng schemaVersion=1.2.0; vẫn nhận bản 1.0.0/1.1.0. librarySection là individual/collective/hospital; hospitalUse là patient_guidance/hospital_kitchen/null, phải khớp direction/unit. groups[].lifeStage là complementary_feeding/child/adult/null; nhóm ăn dặm cần ageMonths. groups[].guidance có notes/recommendations là danh sách chuỗi. dishes[].preparation có method/texture (enum trong schema, chưa có = null), steps/notes (danh sách chuỗi). description là mô tả ngắn tùy chọn hoặc null; tags là danh sách tối đa 20 chuỗi nhãn, mỗi chuỗi tối đa 50 ký tự. availability có state=active/archived và reason; ngừng dùng cần lý do. Các trường mới tùy chọn cho nháp cũ; trước duyệt mới phải đủ nội dung sử dụng. groups[].recommendationProfile dùng hợp đồng Profile hiện hành để áp dụng bảng KhuyenNghi sẵn có; không tự điền tuổi/giới/vận động/sinh lý. Không nhập thông tin định danh cá nhân vào kho mẫu. Tối đa 20 dòng/1000 ký tự mỗi mục hướng dẫn; không gửi newline trong một chuỗi. eatingContext là trường tùy chọn ở thực đơn và days[].meals[]; chỉ nhận home/restaurant/mixed/null, mẫu mới nên khai rõ. Không gửi eatingContext vào MenuInput cá nhân vì hợp đồng đó chưa có trường này; giữ bối cảnh trong mô tả khi cần tính riêng. Các tên trường trong ví dụ phải giữ nguyên. id là mã ổn định; version là số nguyên dương; dayIndex bắt đầu từ 1; date là YYYY-MM-DD hoặc null. Các ID phải duy nhất trong phạm vi tương ứng; groupId phải trỏ tới groups. headcount là số nguyên không âm hoặc null. Mỗi groupPortions khai báo định lượng RIÊNG cho một suất. quantityPerPortion là số không âm hữu hạn; unit chỉ g/ml; basis=edible_raw. edibleFraction trong (0,1], cookingYield > 0 hoặc null, không dùng thay nhau. Không có foodId thật thì chưa thêm nguyên liệu. Không điền chuỗi rỗng thay cho dữ kiện chưa biết. dailyReferences lưu các mốc nhu cầu ngày với sourceId, sourceVersion và locator; chưa có thì để []. Chỉ gắn mealRuleIds đúng profile/đối tượng và nguồn. API đã kiểm tra schema và mã Food/Dish thật trước khi lưu; chỉ nhận status=draft, tối đa 31 ngày, 20 nhóm và 1.200 dòng nguyên liệu. Đây là lưu nháp, chưa phải xác nhận đạt dinh dưỡng.",
    `VÍ DỤ CẤU TRÚC, CHƯA CÓ MÓN HAY KẾT QUẢ DINH DƯỠNG\n${JSON.stringify(PRIMARY_SCHOOL_DRAFT, null, 2)}`,
    `TÀI LIỆU THAM KHẢO\n${referenceText()}`,
    `TRA CỨU NỘI BỘ\nTrang: ${LIBRARY_PATH}\nDanh mục JSON (chỉ đọc): ${LIBRARY_API_PATH}\nTXT: ${LIBRARY_API_PATH}/guide\nCác đường dẫn này cần phiên Admin trên website; cung cấp nội dung sao chép khi AI không truy cập được.`,
  ].join("\n\n");
}

export const IMPLEMENTATION_STEPS = [
  "Đọc AGENTS.md, tài liệu Next.js đúng phiên bản trong node_modules/next/dist/docs/, PROJECT_STATUS.md và docs/menu-library/implementation.md trước khi sửa. Bản nền được xây từ codex/unify-calculator-interface tại 436682b; giữ các thay đổi mới hơn trên nhánh triển khai thực tế.",
  "Đọc src/lib/menu-library/contracts.ts, catalog.ts và guide.ts. Chốt migration riêng cho đơn vị, nhóm, mẫu có phiên bản, bản áp dụng và nguồn có lịch sử. Không đổi Food/Dish chuẩn hoặc seed lại database. Bản 1.1 đã lưu nháp qua API/AI có ủy quyền; còn phần tính tập thể và biên tập biểu mẫu cần triển khai tiếp.",
  "Triển khai lần lượt: lưu nháp Admin → màn nhập nhóm/ngày/bữa/số suất → tính dinh dưỡng từng nhóm → phiếu chia suất → tổng đi chợ. Khóa từng chức năng chưa hoàn thành và cập nhật capabilities sau khi có kiểm thử thật.",
  "Mọi trang, API và Server Action mới phải kiểm tra phiên và role ADMIN trên máy chủ. API 401 khi chưa đăng nhập, 403 khi sai quyền, 503 khi không kiểm tra được phiên; luôn private/no-store. Không mở quyền Admin qua guest token, API token cá nhân hay mật khẩu preview.",
  "Kiểm thử các trường hợp: khác tuổi cùng trường; nhiều cấp trong một đơn vị; trưa khác số suất bữa xế; bữa rỗng; null khác 0; mã bữa giữ nguyên khi đổi nhãn; nguồn chưa đủ bị chặn; mua khác sống sạch/nấu chín; ví dụ 20,6 kg gạo và quy đổi 1/0,8 = 1,25. Giữ hồi quy bộ tính cá nhân và luồng duyệt trước tính.",
  "Chạy npm ci, npx prisma generate, npm run test:menu-library, npm run test:menu-library-write, npx tsc --noEmit và npm run build. Kiểm tra UI trên trình duyệt ở desktop/mobile và quyền khách/người dùng/Admin. Ghi rõ kiểm thử dùng fixture hay database thật; không ghi đã lên VPS nếu chỉ build cục bộ.",
  "Bản 1.1 cần migration 20261021090000_admin_menu_library cho ba bảng riêng. Không sửa bảng nguồn. Khi có quyền truy cập VPS và đã chọn đúng commit: ghi lại commit/image hiện tại, kiểm tra nhánh và diff, build image rồi docker compose up -d --build app theo DEPLOY_VPS.md. Kiểm tra health, đăng nhập Admin và các URL mới; nếu lỗi, quay lại commit/image đã ghi. Build cả image app và migrate; áp migration bằng dịch vụ maintenance trước khi thay app. Không seed hoặc reset dữ liệu.",
] as const;

export function implementationAiGuide() {
  return `DINH DƯỠNG 2598 — GIAO VIỆC TRIỂN KHAI KHO THỰC ĐƠN\nPhiên bản ${LIBRARY_VERSION}; ${LIBRARY_UPDATED_AT}\nRepository: https://github.com/Lo75d1/dinhduong-web\nNhánh hiện tại: codex/admin-menu-api\n\n${IMPLEMENTATION_STEPS.map((step, index) => `${index + 1}. ${step}`).join("\n\n")}\n\nURL nghiệm thu sau khi triển khai: ${LIBRARY_PATH}; ${LIBRARY_API_PATH}; ${LIBRARY_API_PATH}/guide. Tệp hướng dẫn không cấp quyền SSH, GitHub hay quản trị. Chỉ dùng kết nối được người dùng cho phép; không yêu cầu dán bí mật vào chat.\n\nĐÍNH KÈM ĐẦY ĐỦ HƯỚNG DẪN NGHIỆP VỤ VÀ CĂN CỨ\n\n${menuAiGuide()}`;
}
