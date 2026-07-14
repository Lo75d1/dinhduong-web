import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

// Mở rộng proteinOrigin cho "Món ăn" (foodType=MA) + "Đồ hộp"/"Thức ăn truyền thống" (CB, đã
// bỏ ngỏ từ trước) — trước giờ 0% vì chỉ file thực phẩm thô mới có logic gán. Cùng nguyên tắc
// đã dùng cho foodGroup (README-data.md mục 13): chỉ gán nhóm CHẮC CHẮN, món hỗn hợp nhiều
// nguồn đạm (đa số) -> nhãn riêng "Hỗn hợp" (khác null — đã biết là món hỗn hợp, không phải
// thiếu dữ liệu). Xem README-data.md mục 15.

const APPLY = process.argv.includes("--apply");

const CLEAN_MAP: Record<string, string> = {
  "Các loại trái cây": "Thực vật",
  "Các món trứng, sữa và chế phẩm": "Trứng sữa",
  "Chè, caramen, kem": "Trứng sữa",
  "Ngao, ốc": "Thịt trắng",
  "Các món chế biến sẵn": "Chế biến",
};

const MIXED_ORIGIN = "Hỗn hợp";
const MIXED_RAW_GROUPS = [
  "Các món khác",
  "Các loại bánh",
  "Bánh đa, bún, phở",
  "Bánh canh, bánh đa, bún, cháo, súp, hoành thánh, hủ tiếu, miến, mỳ, phở, lẩu",
  "Cơm, cháo, xôi",
  "Thức ăn truyền thống",
  "Các món bánh, kẹo",
  "Bún, cơm, xôi, cháo",
  "Các món xôi, chè",
  "Giải khát",
  "Đồ hộp",
  "Cơm các loại",
  "Món canh",
  "Burger, pizza",
];

// "Món xào" (15 dòng, đã soát toàn bộ tên — xem hội thoại 2026-07-13) — gán thủ công theo tên,
// không dùng từ khóa chung vì "sườn"/nội tạng không khớp RED_MEAT_KW/WHITE_MEAT_KW sẵn có.
const MON_XAO_MAP: Record<string, string> = {
  "Sườn xào chua ngọt (Sweet and sour ribs)": "Thịt đỏ",
  "Su hào xào (Stir-fried kohlrabi)": "Thực vật",
  "Rau muống xào (Stir-fried water spinach)": "Thực vật",
  "Thịt bò xào măng (Stir-fried beef with bamboo shoots)": "Thịt đỏ",
  "Thịt trâu xào rau muống (Stir-fried buffalo meat with water spinach)": "Thịt đỏ",
  "Thịt bò xào dứa (Stir-fried beef with pineapple)": "Thịt đỏ",
  "Thịt bò xào đậu cove (Stir-fried beef with green beans)": "Thịt đỏ",
  "Thịt bò xào hành tây, cà chua (Stir-fried beef with onions and tomatoes)": "Thịt đỏ",
  "Thịt bò xào cần tỏi (Stir-fried beef with celery and garlic)": "Thịt đỏ",
  "Thịt gà xào sả (Stir-fried chicken with lemongrass)": "Thịt trắng",
  "Tim bầu dục xào cần tỏi (Stir-fried kidneys with celery and garlic)": "Thịt đỏ",
  "Thịt bò xào hoa thiên lý (Stir-fried beef with Tonkin jasmine flowers)": "Thịt đỏ",
  "Thịt chim câu xào răm (Stir-fried pigeon with Vietnamese coriander)": "Thịt trắng",
  "Thịt bò xào su su (Stir-fried beef with chayote)": "Thịt đỏ",
  "Thịt bò xào nấm (Stir-fried beef with mushrooms)": "Thịt đỏ",
};

async function main() {
  const updates: { where: object; data: { proteinOrigin: string }; label: string }[] = [];

  for (const [raw, origin] of Object.entries(CLEAN_MAP)) {
    updates.push({
      where: { vddGroupRaw: raw, proteinOrigin: null },
      data: { proteinOrigin: origin },
      label: `vddGroupRaw="${raw}" -> "${origin}"`,
    });
  }
  for (const raw of MIXED_RAW_GROUPS) {
    updates.push({
      where: { vddGroupRaw: raw, proteinOrigin: null },
      data: { proteinOrigin: MIXED_ORIGIN },
      label: `vddGroupRaw="${raw}" -> "${MIXED_ORIGIN}"`,
    });
  }
  for (const [name, origin] of Object.entries(MON_XAO_MAP)) {
    updates.push({
      where: { name, proteinOrigin: null },
      data: { proteinOrigin: origin },
      label: `"${name}" -> "${origin}"`,
    });
  }

  let total = 0;
  for (const u of updates) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const count = await prisma.food.count({ where: u.where as any });
    total += count;
    console.log(`${count}x  ${u.label}`);
  }
  console.log(`\nTổng dự kiến cập nhật: ${total} dòng.`);

  if (!APPLY) {
    console.log("\n(DRY RUN — chạy lại với --apply để thực sự ghi.)");
    return;
  }

  let updated = 0;
  for (const u of updates) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.food.updateMany({ where: u.where as any, data: u.data });
    updated += result.count;
  }
  console.log(`\n✅ Đã cập nhật ${updated} dòng.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
