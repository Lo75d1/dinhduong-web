import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

// Gán foodType="SP" (Sản phẩm — sản phẩm thương mại đóng gói, có thương hiệu) cho các dòng
// hiện đang TS/CB nhưng rõ ràng là sản phẩm đóng gói/có thương hiệu. Xem README-data.md mục 14.
// Đây là 1 trong 4 loại gốc của app cũ (MA/CB/TS/SP — Admin/JS_Core.html) mà script seed hiện
// tại CHƯA BAO GIỜ gán (route.ts/thuc-pham page của Codex đã chờ sẵn giá trị này).
//
// 2 tín hiệu đáng tin cậy, đã soát bằng mắt TOÀN BỘ 521+124 ứng viên trước khi ghi (không tìm
// thấy sai nào — xem hội thoại 2026-07-13):
// 1) Có định lượng bao bì kiểu "84g/gói", "410g/ Hộp", "size 14"...
// 2) Có tên thương hiệu nhận diện được (danh sách BRANDS bên dưới, so khớp GIỮ NGUYÊN DẤU/hoa
//    thường gốc — không dùng normalizeVi, xem bài học sự cố alias).

const APPLY = process.argv.includes("--apply");

const PACKAGING_RE = /\d+[.,]?\d*\s*(g|ml|kg|l|gr)\s*\/\s*(gói|hộp|túi|lon|chai|hủ|ly|thanh|viên|cái|miếng)/i;

const BRANDS = [
  "Vinamilk", "NutiFood", "Nuti ", "NutiMilk", "Nuvi ", "Abbott", "Nestle", "Nestlé", "Physiolac",
  "Frisolac", "Enfamil", "Enfalac", "Similac", "Wakodo", "Acecook", "Vifon", "Masan", "Domino's",
  "Domino", "Pizza Hut", "KFC", "Lotteria", "Lipton", "Yakult", "Kirkland", "SokFarm", "Bibica",
  "Gullón", "Gullon", "Hammer", "RAW•BITE", "RAWBITE", "Vitadairy", "Nutren", "Ensure", "PediaSure",
  "Meiji", "Aptamil", "Morinaga", "Glico", "Ovaltine", "Milo", "TH true Milk", "TH True Milk",
  "Vfresh", "Dutch Lady", "Cô Gái Hà Lan", "Devondale", "Anlene", "Hảo Hảo", "Omachi", "Miliket",
  "Gấu Đỏ", "3 Miền", "Cung Đình", "Modilac", "Nutrilon", "Blackmores", "Glucerna", "Nepro",
  "Diecerna", "Calokid", "Colos", "Growplus", "GrowPlus", "Dielac", "CERELAC", "Cerelac",
  "Gold Standard", "Prostar", "Ultimate Nutrition", "7up", "Sprite", "Coca", "Pepsi",
  "McDonald", "Oishi", "Custas", "One One", "Solite", "Nature Zen",
];

function isSpCandidate(name: string): boolean {
  return PACKAGING_RE.test(name) || BRANDS.some((b) => name.includes(b));
}

async function main() {
  const items = await prisma.food.findMany({
    where: { foodType: { in: ["TS", "CB"] } },
    select: { id: true, name: true, source: true, foodType: true },
  });

  const toUpdate = items.filter((i) => isSpCandidate(i.name));
  const byPrevType = new Map<string, number>();
  for (const i of toUpdate) byPrevType.set(i.foodType ?? "?", (byPrevType.get(i.foodType ?? "?") ?? 0) + 1);

  console.log(`Tổng TS/CB hiện tại: ${items.length}`);
  console.log(`Số dòng sẽ chuyển sang foodType="SP": ${toUpdate.length}`);
  byPrevType.forEach((c, t) => console.log(`  từ ${t}: ${c}`));

  if (!APPLY) {
    console.log("\n(DRY RUN — chạy lại với --apply để thực sự ghi.)");
    return;
  }

  const result = await prisma.food.updateMany({
    where: { id: { in: toUpdate.map((i) => i.id) } },
    data: { foodType: "SP" },
  });
  console.log(`\n✅ Đã cập nhật ${result.count} dòng thành foodType="SP".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
