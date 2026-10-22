import { EATING_CONTEXT_OPTIONS, PRIMARY_SCHOOL_DRAFT } from "./contracts";
import type { MealCode } from "./contracts";

export const LIBRARY_VERSION = "1.3.0";
export const LIBRARY_UPDATED_AT = "2026-10-22";
export const LIBRARY_PATH = "/quan-tri/kho-thuc-don";
export const LIBRARY_API_PATH = "/api/admin/menu-library";

export type ReferenceSource = {
  id: string;
  number: number;
  title: string;
  issuer: string;
  version: string;
  url: string;
  kind: "official" | "professional";
  verification: "extracted" | "pending";
  scope: string;
  locator: string;
  note: string;
};

export const REFERENCE_SOURCES: readonly ReferenceSource[] = [
  {
    id: "byt-3958-2025", number: 1,
    title: "Hướng dẫn dinh dưỡng cho bữa ăn học đường — 3958/QĐ-BYT",
    issuer: "Bộ Y tế", version: "2025-12-25",
    url: "https://viendinhduong.vn/storage/app/uploads/public/2026/05/26/q_3958qbyt_huong_dan_dinh_duong_bua_an_hoc_uong.pdf",
    kind: "official", verification: "extracted",
    scope: "Bữa ăn học đường ở cơ sở giáo dục phổ thông; chọn đúng tuổi và phạm vi phục vụ.",
    locator: "Mục III.1 (nhu cầu và phân bố năng lượng); mục V (xây dựng thực đơn)",
    note: "Đã đối chiếu phần hướng dẫn. Bảng nhu cầu trong tài liệu dẫn nguồn 2016; không tự đổi thành bảng 2026. Chưa phê duyệt thành bộ quy tắc tính tự động.",
  },
  {
    id: "bgddt-vbhn-01-2021", number: 2,
    title: "Chương trình giáo dục mầm non — 01/VBHN-BGDĐT",
    issuer: "Bộ Giáo dục và Đào tạo", version: "2021-04-13",
    url: "https://congbao.chinhphu.vn/van-ban/van-ban-hop-nhat-so-01-vbhn-bgddt-33656/35646.htm",
    kind: "official", verification: "extracted",
    scope: "Nhà trẻ và mẫu giáo áp dụng chương trình tương ứng; xác nhận chương trình thực tế của trường trước khi chọn.",
    locator: "Phần Chương trình giáo dục nhà trẻ và mẫu giáo → Nuôi dưỡng và chăm sóc sức khỏe → Tổ chức ăn",
    note: "Nhà trẻ và mẫu giáo có cơ cấu bữa khác nhau. Có thông tin thí điểm chương trình mới 2026–2027 ở nguồn [6]; cần kiểm tra trường có thuộc diện thí điểm.",
  },
  {
    id: "byt-1982-2026", number: 3,
    title: "Hướng dẫn chuyên môn các biện pháp thực hiện dinh dưỡng trong phòng bệnh — 1982/QĐ-BYT",
    issuer: "Bộ Y tế", version: "2026-07-01",
    url: "https://viendinhduong.vn/storage/app/uploads/public/2026/07/02/y2026_0701_q_1982_byt_ban_hanh_hd_chuyen_mon_cac_bien_phap_thuc_hien_dd_trong_phong_benh.pdf",
    kind: "official", verification: "extracted",
    scope: "Dinh dưỡng phòng bệnh; chương V về người lao động.",
    locator: "Chương V: Dinh dưỡng cho người lao động; tài liệu tham khảo",
    note: "Có dẫn Nhu cầu dinh dưỡng khuyến nghị 2026, Quyết định 116/QĐ-VDD ngày 12/02/2026. Chưa có bảng gốc để nhập số; không tự thay nguồn hiện có.",
  },
  {
    id: "vnniosh-shift-2025", number: 4,
    title: "Bảo đảm chất lượng bữa ăn ca vì sức khỏe người lao động",
    issuer: "Viện Khoa học An toàn và Vệ sinh lao động", version: "2025-02-14",
    url: "https://vnniosh.vn/bao-dam-chat-luong-bua-an-ca-vi-suc-khoe-nguoi-lao-dong/",
    kind: "professional", verification: "extracted",
    scope: "Tham khảo chuyên môn về bữa ăn ca cho người lao động.",
    locator: "Phần nhu cầu năng lượng và phân bố năng lượng giữa các bữa",
    note: "Khuyến nghị chuyên môn; không diễn giải thành một tỷ lệ bắt buộc chung cho mọi cơ quan, ca làm hay người trưởng thành.",
  },
  {
    id: "vdd-rni-2026", number: 5,
    title: "Nhu cầu dinh dưỡng khuyến nghị cho người Việt Nam 2026 — 116/QĐ-VDD",
    issuer: "Viện Dinh dưỡng", version: "2026-02-12",
    url: "https://viendinhduong.vn/storage/app/uploads/public/2026/07/02/y2026_0701_q_1982_byt_ban_hanh_hd_chuyen_mon_cac_bien_phap_thuc_hien_dd_trong_phong_benh.pdf",
    kind: "official", verification: "pending",
    scope: "Nguồn nhu cầu theo nhóm đối tượng, chờ bản gốc.",
    locator: "Hiện chỉ xác nhận trích dẫn trong tài liệu 1982/QĐ-BYT [3]",
    note: "Liên kết là tài liệu dẫn chiếu, không phải bảng RNI gốc. Chưa nhập bất kỳ trị số nào từ nguồn này.",
  },
  {
    id: "bgddt-pilot-2026", number: 6,
    title: "Thông tin chương trình mầm non mới thí điểm từ năm học 2026–2027",
    issuer: "Bộ Giáo dục và Đào tạo", version: "Thí điểm 2026–2027; dẫn Quyết định 388/QĐ-BGDĐT",
    url: "https://moet.gov.vn/chuyen-de-giao-duc-va-dao-tao/giao-duc-mam-non/hoan-thien-huong-dan-thuc-hien-chuong-trinh-mam-non-moi4.html",
    kind: "official", verification: "pending",
    scope: "Các cơ sở tham gia thí điểm chương trình mầm non mới.",
    locator: "Thông tin thí điểm; chưa đối chiếu toàn văn tiêu chí dinh dưỡng",
    note: "Chờ xác minh tiêu chí cụ thể và đơn vị áp dụng. Không suy ra tỷ lệ bữa từ tin giới thiệu.",
  },
];

export type MealReferenceRule = {
  id: string;
  profile: "general_school" | "nursery_2021" | "kindergarten_2021" | "worker_reference";
  mealCode: MealCode | "served_total";
  label: string;
  nutrient: "energy";
  unit: "percent";
  denominator: "daily_energy";
  min: number;
  max: number;
  sourceId: string;
  sourceVersion: string;
  locator: string;
  status: "reference_only";
};
const rule = (id: string, profile: MealReferenceRule["profile"], mealCode: MealReferenceRule["mealCode"], label: string, min: number, max: number, sourceId: string): MealReferenceRule => {
  const source = REFERENCE_SOURCES.find(item => item.id === sourceId)!;
  return { id, profile, mealCode, label, nutrient: "energy", unit: "percent", denominator: "daily_energy", min, max, sourceId, sourceVersion: source.version, locator: source.locator, status: "reference_only" };
};

export const MEAL_REFERENCE_RULES: readonly MealReferenceRule[] = [
  rule("school-breakfast", "general_school", "breakfast", "Sáng", 25, 30, "byt-3958-2025"),
  rule("school-lunch", "general_school", "lunch", "Trưa", 30, 40, "byt-3958-2025"),
  rule("school-snack", "general_school", "afternoon_snack", "Phụ chiều", 5, 10, "byt-3958-2025"),
  rule("school-dinner", "general_school", "dinner", "Tối", 25, 30, "byt-3958-2025"),
  rule("nursery-lunch", "nursery_2021", "lunch", "Trưa", 30, 35, "bgddt-vbhn-01-2021"),
  rule("nursery-main", "nursery_2021", "afternoon_main", "Chính buổi chiều", 25, 30, "bgddt-vbhn-01-2021"),
  rule("nursery-snack", "nursery_2021", "afternoon_snack", "Phụ", 5, 10, "bgddt-vbhn-01-2021"),
  rule("nursery-total", "nursery_2021", "served_total", "Tổng tại trường", 60, 70, "bgddt-vbhn-01-2021"),
  rule("kindergarten-lunch", "kindergarten_2021", "lunch", "Trưa", 30, 35, "bgddt-vbhn-01-2021"),
  rule("kindergarten-snack", "kindergarten_2021", "afternoon_snack", "Phụ", 15, 25, "bgddt-vbhn-01-2021"),
  rule("kindergarten-total", "kindergarten_2021", "served_total", "Tổng tại trường", 50, 55, "bgddt-vbhn-01-2021"),
  rule("worker-main", "worker_reference", "shift_main", "Bữa chính trong ca (nhãn giờ có thể đổi)", 35, 40, "vnniosh-shift-2025"),
];

export const CLASSIFICATION = [
  { branch: "Tập thể", type: "Trường học", groups: "Nhà trẻ; mẫu giáo; tiểu học; THCS; THPT. Một đơn vị có thể có nhiều cấp và nhiều nhóm tuổi.", basis: "Tuổi thực tế, chương trình áp dụng, số suất theo từng bữa; không lấy một mức thấp/cao cho toàn trường." },
  { branch: "Tập thể", type: "Doanh nghiệp / khu công nghiệp / cơ quan", groups: "Nhóm tuổi, giới, mức hoạt động, ca làm và chế độ ăn nếu có.", basis: "Chọn nhu cầu ngày có nguồn rồi chọn mục tiêu cho bữa phục vụ; tỷ lệ bữa ăn ca là tham khảo theo bối cảnh." },
  { branch: "Tập thể", type: "Bếp bệnh viện", groups: "Nhóm chế độ ăn đã được chuyên môn xác nhận; số suất theo ngày và bữa.", basis: "Lưu mã chế độ, phiên bản nguồn, người duyệt; không tự suy đơn ăn từ tên bệnh." },
  { branch: "Cá nhân", type: "Người ăn thông thường / người bệnh", groups: "Hồ sơ tuổi, giới, hoạt động; mục tiêu duy trì, tăng hoặc giảm cân; chế độ ăn là trường riêng.", basis: "Tập gym là thông tin hoạt động. Bệnh viện là bối cảnh, không phải một mục tiêu dinh dưỡng." },
] as const;

export function menuLibraryCatalog() {
  return {
    schemaVersion: LIBRARY_VERSION, updatedAt: LIBRARY_UPDATED_AT, access: "ADMIN_SESSION_ONLY",
    capabilities: { readGuidance: true, readSources: true, copyAiInstructions: true, persistTemplates: true, delegateAiDrafts: true, collectiveCalculation: false, collectiveShoppingExport: false, automaticClinicalPrescription: false },
    classification: CLASSIFICATION, eatingContexts: EATING_CONTEXT_OPTIONS, sources: REFERENCE_SOURCES, mealRules: MEAL_REFERENCE_RULES,
    contract: { name: "MenuLibraryDraft", schemaVersion: "1.1.0", supportedSchemaVersions: ["1.0.0", "1.1.0"], file: "src/lib/menu-library/contracts.ts", compatibleWithNutritionChatMenuInput: false, purpose: "Lưu nháp bằng /api/admin/menu-library/templates hoặc công cụ save_admin_menu_template. Chỉ nhận status=draft; không thay cho tính dinh dưỡng." },
    example: PRIMARY_SCHOOL_DRAFT,
    history: [{ version: LIBRARY_VERSION, date: LIBRARY_UPDATED_AT, change: "Thêm sửa tay, phân tích một suất từng nhóm và duyệt bởi Admin theo phiên bản; giữ lịch sử và phân tích khi duyệt." }, { version: "1.2.0", date: "2026-10-22", change: "Thêm bối cảnh ăn uống và hướng dẫn cấu trúc bữa cơm." }, { version: "1.1.0", date: "2026-10-21", change: "Lưu nháp có phiên bản và ủy quyền AI theo phiên OAuth." }, { version: "1.0.0", date: "2026-10-21", change: "Khởi tạo danh mục căn cứ và hướng dẫn nội bộ." }],
  };
}
