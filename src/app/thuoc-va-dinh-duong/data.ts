// DEMO — dữ liệu tay, chọn lọc thủ công từ trang chi tiết thuốc công khai của
// Nhà thuốc Long Châu (nhathuoclongchau.com.vn), KHÔNG crawl tự động hàng loạt.
// Chỉ tham khảo hỗ trợ bác sĩ/dinh dưỡng viên khi lập thực đơn cho bệnh nhân
// đang dùng thuốc — không thay thế Dược thư Quốc gia hay chỉ định của bác sĩ.
export type MedicationRef = {
  id: string;
  name: string;
  activeIngredient: string;
  diseaseGroups: string[]; // khớp tên với diseaseDiet đã dùng trong Dish (RNI) khi có thể
  category: string; // phân loại/nhóm thuốc theo breadcrumb danh mục thật trên trang nguồn
  imageUrl: string; // ảnh hộp thuốc thật, lấy từ thư viện ảnh sản phẩm trên trang nguồn
  dosingNote: string;
  nutritionCaution: string;
  otherCaution: string;
  sourceUrl: string;
  sourceLabel: string;
};

export const MEDICATION_REFS: MedicationRef[] = [
  {
    id: "metformin-850",
    name: "Metformin 850mg (Tipharco)",
    activeIngredient: "Metformin hydroclorid 850mg",
    diseaseGroups: ["Đái tháo đường"],
    category: "Thuốc trị tiểu đường",
    imageUrl:
      "https://cdn.nhathuoclongchau.com.vn/unsafe/480x0/filters:quality(90):format(webp)/metformin_850mg_4x15_tipharco_00015970_58fd9e7bca.png",
    dosingNote: "Uống 1 viên/ngày vào bữa ăn sáng; nếu duy trì 2 lần/ngày thì uống vào bữa sáng và bữa tối. Không nhai/nghiền, uống nguyên viên với nước.",
    nutritionCaution: "Dùng lâu dài có thể làm giảm nồng độ Vitamin B12 — cân nhắc bổ sung B12 hoặc theo dõi định kỳ. Tác dụng phụ tiêu hoá thường gặp (chán ăn, buồn nôn, tiêu chảy) có thể ảnh hưởng khả năng ăn uống, nên chia nhỏ bữa nếu bệnh nhân khó dung nạp.",
    otherCaution: "Chống chỉ định: suy thận, suy tim sung huyết, bệnh gan nặng. Vẫn phải duy trì chế độ ăn kiêng song song khi dùng thuốc.",
    sourceUrl: "https://nhathuoclongchau.com.vn/thuoc/metformin-850mg-tipharco-4x15-14723.html",
    sourceLabel: "Nhà thuốc Long Châu — Metformin 850mg Tipharco",
  },
  {
    id: "cardioton-30",
    name: "Cardioton 30mg (Lipa Pharmaceuticals)",
    activeIngredient: "Ubidecarenone (Coenzyme Q10) 30mg + Vitamin E 6.71mg",
    diseaseGroups: ["Tăng huyết áp", "Tim mạch"],
    category: "Thuốc tim mạch huyết áp",
    imageUrl:
      "https://cdn.nhathuoclongchau.com.vn/unsafe/480x0/filters:quality(90):format(webp)/cardioton_30mg_3x10_00001598_efd03b68ec.png",
    dosingNote: "Uống nguyên viên với nước, 1–3 viên/lần, 2 lần/ngày (theo chỉ định bác sĩ, tuỳ mức độ bệnh).",
    nutritionCaution: "Là dạng bổ sung CoQ10 + Vitamin E — không thay thế nguồn vitamin E từ thực phẩm (dầu thực vật, hạt) nếu bệnh nhân đã đủ qua khẩu phần; cân nhắc khi bệnh nhân đang bổ sung vitamin E từ nguồn khác để tránh dư thừa.",
    otherCaution: "Không khuyến cáo cho phụ nữ có thai/cho con bú và trẻ em do chưa đủ dữ liệu lâm sàng.",
    sourceUrl: "https://nhathuoclongchau.com.vn/thuoc/cardilopin-30mg-4382.html",
    sourceLabel: "Nhà thuốc Long Châu — Cardioton 30mg",
  },
];
