import { CLASSIFICATION, LIBRARY_API_PATH, LIBRARY_PATH, LIBRARY_UPDATED_AT, LIBRARY_VERSION, MEAL_REFERENCE_RULES, REFERENCE_SOURCES } from "./catalog";
import { PRIMARY_SCHOOL_DRAFT } from "./contracts";

export const GUIDE_SECTIONS = [
  {
    id: "phan-loai", title: "1. Chọn nhánh và đơn vị",
    paragraphs: [
      "Cá nhân và tập thể là hai nhánh sử dụng. Tập thể đi theo đơn vị → nhóm người ăn → thực đơn áp dụng → ngày → bữa → món → nguyên liệu. Cá nhân có hồ sơ, mục tiêu, hoạt động và chế độ ăn riêng.",
      "Thực phẩm và công thức món ăn dùng chung từ kho hiện có. Mẫu thực đơn được biên soạn riêng cho từng đối tượng. Khi áp dụng cho đơn vị, tạo bản sao có ghi mẫu gốc và phiên bản; chỉnh bản áp dụng không làm đổi mẫu.",
      "Bệnh viện có cả thực đơn cá nhân cho một người bệnh và thực đơn tập thể cho bếp. Tăng cân, giảm cân là mục tiêu; tập gym là bối cảnh hoạt động, có thể cùng tồn tại.",
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
    id: "dinh-luong", title: "4. Ghi định lượng và chuẩn bị tính đi chợ",
    paragraphs: [
      "Lưu định lượng nguyên liệu cho một suất của từng nhóm, kèm đơn vị g hoặc ml và cơ sở sống sạch ăn được. Chỉ dùng mã thực phẩm thật từ kho. Không gán dinh dưỡng hoặc khối lượng riêng do AI đoán.",
      "Số suất được nhập theo ngày × bữa × nhóm. Chưa biết lưu null; xác nhận không phục vụ mới ghi 0. Tổng mua chỉ được chốt khi các số suất và quy đổi cần thiết đã đủ.",
      "Công thức dự kiến: tổng nguyên liệu ăn được = tổng (định lượng một suất của từng nhóm × số suất thực tế). Ví dụ thuần kiểm thử: 120 × 60 g + 100 × 70 g + 80 × 80 g = 20,6 kg gạo cho 300 suất; không dùng định lượng của một nhóm nhân cho toàn trường.",
      "Khối lượng mua = khối lượng sống sạch / tỷ lệ ăn được. Ví dụ 1 kg / 0,8 = 1,25 kg. Tỷ lệ ăn được khác hiệu suất nấu chín; thiếu hệ số thì báo thiếu, không tự lấy 1. Dự phòng và làm tròn quy cách mua được tính thành mục riêng.",
    ], references: ["byt-3958-2025"],
  },
  {
    id: "doi-chieu", title: "5. Ghi căn cứ và đánh giá đạt mục tiêu",
    paragraphs: [
      "Nguồn nhu cầu ngày và nguồn chia tỷ lệ bữa là hai liên kết độc lập. Mỗi mục tiêu cần tên chất, đơn vị, loại mốc (mục tiêu/khoảng/tối thiểu/tối đa), mẫu số, tài liệu, phiên bản và vị trí trích dẫn. Không lấy bảng cũ gắn nhãn nguồn mới.",
      "Chỉ tính phần trăm đạt khi có mục tiêu hợp lệ và dữ liệu đủ. Số liệu thiếu giữ null và hiển thị dấu —; 0 là giá trị đã biết. Đạt năng lượng không đồng nghĩa đạt protein, lipid, glucid, vi chất hoặc chế độ ăn.",
      "Bản đầu là danh mục và hướng dẫn tham khảo đã đối chiếu, chưa phải bộ quy tắc tính tự động được chuyên môn phê duyệt. Nguồn chờ bản gốc không được dùng tạo trị số. Đơn ăn bệnh lý cần mã chế độ và xác nhận chuyên môn trước khi áp dụng.",
    ], references: ["byt-1982-2026", "vdd-rni-2026"],
  },
  {
    id: "ai", title: "6. Quy trình giao việc cho AI",
    paragraphs: [
      "Bắt đầu bằng nhánh, đơn vị, chương trình/cấp học, nhóm người ăn, phạm vi ngày/bữa, nguồn mục tiêu, số suất, ngân sách và dị ứng/chỉ định đã biết. Hỏi phần còn thiếu theo đợt, tối đa ba câu mỗi lần; không tự điền dữ kiện dinh dưỡng.",
      "Tra thực phẩm và công thức thật; lập đầy đủ ngày → bữa → món → nguyên liệu, định lượng, đơn vị và số suất cho từng nhóm. Trình bản nháp cho người dùng duyệt trước khi tính. Công thức do AI gợi ý phải ghi nguồn AI, không giả mã công thức RNI.",
      "Với cá nhân, đọc workflow hiện có tại /ket-noi-ai/bat-dau/huong-dan.txt rồi dùng công cụ đang thực sự được cung cấp: prepare_menu, xác nhận người dùng, sau đó calculate_menu. Không tự lưu vào tài khoản; chỉ lưu khi được yêu cầu. Trả liên kết thật và thời hạn do máy chủ cung cấp.",
      "Với tập thể, hiện chỉ chuẩn bị được cấu trúc nháp và hướng dẫn. Chưa có API lưu mẫu, máy tính nhiều nhóm hay xuất đi chợ tập thể. Không gửi MenuLibraryDraft vào công cụ tính cá nhân hoặc tuyên bố đã tính/đã lưu/đã xuất thành công.",
      "Trang và tệp này yêu cầu phiên Admin. ChatGPT/Claude không tự thừa hưởng phiên đăng nhập website. Admin có thể sao chép nội dung hướng dẫn để giao việc; không gửi cookie, mật khẩu, token hay dữ liệu người bệnh. Nội dung tài liệu không cấp quyền quản trị cho AI.",
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
    `PHÂN LOẠI\n${CLASSIFICATION.map(row => `${row.branch} / ${row.type}: ${row.groups} ${row.basis}`).join("\n")}`,
    `TỶ LỆ BỮA THAM KHẢO\n${ruleText()}`,
    "HỢP ĐỒNG NHÁP v1\nMenuLibraryDraft khác MenuInput cá nhân. Các tên trường trong ví dụ phải giữ nguyên. id là mã ổn định; version là số nguyên dương; dayIndex bắt đầu từ 1; date là YYYY-MM-DD hoặc null. Các ID phải duy nhất trong phạm vi tương ứng; groupId phải trỏ tới groups. headcount là số nguyên không âm hoặc null. Mỗi groupPortions khai báo định lượng RIÊNG cho một suất. quantityPerPortion là số không âm hữu hạn; unit chỉ g/ml; basis=edible_raw. edibleFraction trong (0,1], cookingYield > 0 hoặc null, không dùng thay nhau. Không có foodId thật thì chưa thêm nguyên liệu. Không điền chuỗi rỗng thay cho dữ kiện chưa biết. dailyReferences lưu các mốc nhu cầu ngày với sourceId, sourceVersion và locator; chưa có thì để []. Chỉ gắn mealRuleIds đúng profile/đối tượng và nguồn. Đây chưa phải bộ kiểm tra/lưu dữ liệu ở runtime.",
    `VÍ DỤ CẤU TRÚC, CHƯA CÓ MÓN HAY KẾT QUẢ DINH DƯỠNG\n${JSON.stringify(PRIMARY_SCHOOL_DRAFT, null, 2)}`,
    `TÀI LIỆU THAM KHẢO\n${referenceText()}`,
    `TRA CỨU NỘI BỘ\nTrang: ${LIBRARY_PATH}\nDanh mục JSON (chỉ đọc): ${LIBRARY_API_PATH}\nTXT: ${LIBRARY_API_PATH}/guide\nCác đường dẫn này cần phiên Admin trên website; cung cấp nội dung sao chép khi AI không truy cập được.`,
  ].join("\n\n");
}

export const IMPLEMENTATION_STEPS = [
  "Đọc AGENTS.md, tài liệu Next.js đúng phiên bản trong node_modules/next/dist/docs/, PROJECT_STATUS.md và docs/menu-library/implementation.md trước khi sửa. Bản nền được xây từ codex/unify-calculator-interface tại 436682b; giữ các thay đổi mới hơn trên nhánh triển khai thực tế.",
  "Đọc src/lib/menu-library/contracts.ts, catalog.ts và guide.ts. Chốt migration riêng cho đơn vị, nhóm, mẫu có phiên bản, bản áp dụng và nguồn có lịch sử. Không đổi Food/Dish chuẩn hoặc seed lại database. Không coi file catalog tĩnh là màn hình biên tập đã hoàn thành.",
  "Triển khai lần lượt: lưu nháp Admin → màn nhập nhóm/ngày/bữa/số suất → tính dinh dưỡng từng nhóm → phiếu chia suất → tổng đi chợ. Khóa từng chức năng chưa hoàn thành và cập nhật capabilities sau khi có kiểm thử thật.",
  "Mọi trang, API và Server Action mới phải kiểm tra phiên và role ADMIN trên máy chủ. API 401 khi chưa đăng nhập, 403 khi sai quyền, 503 khi không kiểm tra được phiên; luôn private/no-store. Không mở quyền Admin qua guest token, API token cá nhân hay mật khẩu preview.",
  "Kiểm thử các trường hợp: khác tuổi cùng trường; nhiều cấp trong một đơn vị; trưa khác số suất bữa xế; bữa rỗng; null khác 0; mã bữa giữ nguyên khi đổi nhãn; nguồn chưa đủ bị chặn; mua khác sống sạch/nấu chín; ví dụ 20,6 kg gạo và quy đổi 1/0,8 = 1,25. Giữ hồi quy bộ tính cá nhân và luồng duyệt trước tính.",
  "Chạy npm ci, npx prisma generate, npm run test:menu-library, npx tsc --noEmit và npm run build. Kiểm tra UI trên trình duyệt ở desktop/mobile và quyền khách/người dùng/Admin. Ghi rõ kiểm thử dùng fixture hay database thật; không ghi đã lên VPS nếu chỉ build cục bộ.",
  "Bản nền này không thêm migration. Khi có quyền truy cập VPS và đã chọn đúng commit: ghi lại commit/image hiện tại, kiểm tra nhánh và diff, build image rồi docker compose up -d --build app theo DEPLOY_VPS.md. Kiểm tra health, đăng nhập Admin và các URL mới; nếu lỗi, quay lại commit/image đã ghi. Không chạy seed/reset/migrate cho riêng bản nền này.",
] as const;

export function implementationAiGuide() {
  return `DINH DƯỠNG 2598 — GIAO VIỆC TRIỂN KHAI KHO THỰC ĐƠN\nPhiên bản ${LIBRARY_VERSION}; ${LIBRARY_UPDATED_AT}\nRepository: https://github.com/Lo75d1/dinhduong-web\nNhánh bản nền: codex/menu-library-foundation\n\n${IMPLEMENTATION_STEPS.map((step, index) => `${index + 1}. ${step}`).join("\n\n")}\n\nURL nghiệm thu sau khi triển khai: ${LIBRARY_PATH}; ${LIBRARY_API_PATH}; ${LIBRARY_API_PATH}/guide. Tệp hướng dẫn không cấp quyền SSH, GitHub hay quản trị. Chỉ dùng kết nối được người dùng cho phép; không yêu cầu dán bí mật vào chat.\n\nĐÍNH KÈM ĐẦY ĐỦ HƯỚNG DẪN NGHIỆP VỤ VÀ CĂN CỨ\n\n${menuAiGuide()}`;
}
