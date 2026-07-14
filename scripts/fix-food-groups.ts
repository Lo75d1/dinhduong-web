import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

// Sửa foodGroup trên DB SỐNG trực tiếp (không seed lại — seed lại sẽ xoá hết dữ liệu đã dọn
// trùng, xem README-data.md mục 11). Nguyên nhân + phân tích đầy đủ: mục 13.
//
// 1) Tách nhãn "Nước ngọt" (đang gộp lẫn "Đồ ngọt" + "Nước giải khát") thành 2 nhóm rõ nghĩa.
// 2) Gán foodGroup cho các dòng "Món ăn" (foodType=MA) theo vddGroupRaw hiện có trong DB —
//    trước giờ luôn null vì script seed gốc chưa từng map nhóm riêng của file Món ăn VDD.
//    Chỉ map nhóm CHẮC CHẮN 1 loại nguyên liệu chủ đạo; phần còn lại (đa số — món hỗn hợp
//    nhiều nhóm) -> "Món ăn hỗn hợp" (quyết định của người dùng 2026-07-12, để phân biệt với
//    "chưa có dữ liệu" thay vì lẫn vào null).

const APPLY = process.argv.includes("--apply");

const MONAN_GROUP_MAP: Record<string, string> = {
  "Các loại trái cây": "Nhóm rau củ quả khác",
  "Ngao, ốc": "Nhóm thịt các loại, cá và hải sản",
  "Các món trứng, sữa và chế phẩm": "Nhóm sữa và các chế phẩm từ sữa",
  "Chè, caramen, kem": "Nhóm bánh kẹo, đồ ngọt",
  "Các món xôi, chè": "Nhóm bánh kẹo, đồ ngọt",
  "Các món bánh, kẹo": "Nhóm bánh kẹo, đồ ngọt",
  "Giải khát": "Nhóm nước giải khát",
  "Món xào": "Nhóm thịt các loại, cá và hải sản",
  "Các món chế biến sẵn": "Nhóm thịt các loại, cá và hải sản",
};
const MONAN_MIXED_GROUP = "Món ăn hỗn hợp";
// các vddGroupRaw còn lại của Món ăn (không trong MONAN_GROUP_MAP) đều là món hỗn hợp nhiều
// nhóm (đã soát mẫu tên món cho từng nhóm — xem hội thoại/README mục 13), trừ "Đồ hộp" —
// CỐ Ý bỏ qua, không gán gì, vì mẫu quá hỗn tạp (trái cây ngâm đường lẫn đậu rang dầu).
const MONAN_MIXED_RAW_GROUPS = [
  "Các món khác",
  "Các loại bánh",
  "Bánh đa, bún, phở",
  "Bánh canh, bánh đa, bún, cháo, súp, hoành thánh, hủ tiếu, miến, mỳ, phở, lẩu",
  "Cơm, cháo, xôi",
  "Thức ăn truyền thống",
  "Bún, cơm, xôi, cháo",
  "Cơm các loại",
  "Món canh",
  "Burger, pizza",
];

async function main() {
  const updates: { where: object; data: { foodGroup: string }; label: string }[] = [];

  // 1) Tách "Nước ngọt" theo vddGroupRaw gốc
  updates.push({
    where: { source: "VDD", vddGroupRaw: "Nước giải khát", foodGroup: "Nước ngọt" },
    data: { foodGroup: "Nhóm nước giải khát" },
    label: 'vddGroupRaw="Nước giải khát" (đang "Nước ngọt") -> "Nhóm nước giải khát"',
  });
  updates.push({
    where: { source: "VDD", vddGroupRaw: "Đồ ngọt (đường, bánh, mứt, kẹo)", foodGroup: "Nước ngọt" },
    data: { foodGroup: "Nhóm bánh kẹo, đồ ngọt" },
    label: 'vddGroupRaw="Đồ ngọt..." (đang "Nước ngọt") -> "Nhóm bánh kẹo, đồ ngọt"',
  });

  // 2) Món ăn (MA) — nhóm chắc chắn
  for (const [raw, group] of Object.entries(MONAN_GROUP_MAP)) {
    updates.push({
      where: { source: "VDD", foodType: "MA", vddGroupRaw: raw, foodGroup: null },
      data: { foodGroup: group },
      label: `MA vddGroupRaw="${raw}" -> "${group}"`,
    });
  }

  // 3) Món ăn (MA) — hỗn hợp
  for (const raw of MONAN_MIXED_RAW_GROUPS) {
    updates.push({
      where: { source: "VDD", vddGroupRaw: raw, foodGroup: null },
      data: { foodGroup: MONAN_MIXED_GROUP },
      label: `vddGroupRaw="${raw}" -> "${MONAN_MIXED_GROUP}"`,
    });
  }

  let totalWouldUpdate = 0;
  for (const u of updates) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const count = await prisma.food.count({ where: u.where as any });
    totalWouldUpdate += count;
    console.log(`${count}x  ${u.label}`);
  }
  console.log(`\nTổng dự kiến cập nhật: ${totalWouldUpdate} dòng.`);

  if (!APPLY) {
    console.log("\n(DRY RUN — chạy lại với --apply để thực sự ghi.)");
    return;
  }

  let totalUpdated = 0;
  for (const u of updates) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.food.updateMany({ where: u.where as any, data: u.data });
    totalUpdated += result.count;
  }
  console.log(`\n✅ Đã cập nhật ${totalUpdated} dòng.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
