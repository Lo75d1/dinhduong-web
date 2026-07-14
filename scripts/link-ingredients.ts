// Best-effort link DishIngredient.foodId -> Food.id.
// Un-matched ingredients keep foodId=null (shown as "chưa liên kết" in UI) — not guessed.
//
// 2 tầng so khớp (xem README-data.md mục 16 — sự cố 4,5% liên kết ban đầu):
// 1) Tên ĐẦY ĐỦ khớp chính xác (giữ nguyên hành vi cũ, ưu tiên vì chính xác nhất).
// 2) Nếu không khớp: so phần tên TRƯỚC dấu "(" đầu tiên (bỏ chú thích tiếng Anh/định lượng
//    bao bì — vd Food "Gạo tẻ máy (Ordinary polished rice, raw)" vs nguyên liệu "Gạo tẻ máy").
//    Cả 2 phía (Food.name và DishIngredient.foodNameRaw) đều được cắt theo cách này trước khi
//    so khớp, vì nguyên liệu cũng có ghi chú kiểu "(muỗng lường 41g)".

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const APPLY = process.argv.includes("--apply");

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d") // đ -> d
    .replace(/\s+/g, " ")
    .trim();
}

function viPart(s: string): string {
  return s.split("(")[0].trim();
}

async function main() {
  console.log("Loading foods...");
  const foods = await prisma.food.findMany({ select: { id: true, name: true } });
  const byFullName = new Map<string, string>();
  const byViPart = new Map<string, string>();
  for (const f of foods) {
    const fullKey = normalize(f.name);
    if (!byFullName.has(fullKey)) byFullName.set(fullKey, f.id); // first occurrence wins
    const viKey = normalize(viPart(f.name));
    if (viKey && !byViPart.has(viKey)) byViPart.set(viKey, f.id);
  }
  console.log(`  ${foods.length} foods, ${byFullName.size} tên đầy đủ khác nhau, ${byViPart.size} tên (trước ngoặc) khác nhau`);

  console.log("Loading unlinked ingredients...");
  const ingredients = await prisma.dishIngredient.findMany({
    where: { foodId: null },
    select: { id: true, foodNameRaw: true },
  });
  console.log(`  ${ingredients.length} ingredients to try`);

  let matchedFull = 0;
  let matchedVi = 0;
  const updates: { id: string; foodId: string }[] = [];
  for (const ing of ingredients) {
    const fullKey = normalize(ing.foodNameRaw);
    let foodId = byFullName.get(fullKey);
    if (foodId) {
      matchedFull++;
    } else {
      const viKey = normalize(viPart(ing.foodNameRaw));
      foodId = viKey ? byViPart.get(viKey) : undefined;
      if (foodId) matchedVi++;
    }
    if (foodId) updates.push({ id: ing.id, foodId });
  }
  const matched = matchedFull + matchedVi;
  console.log(
    `Matched ${matched} / ${ingredients.length} (${((matched / ingredients.length) * 100).toFixed(1)}%) — ${matchedFull} tên đầy đủ, ${matchedVi} theo tên trước ngoặc`
  );

  if (!APPLY) {
    console.log("\n(DRY RUN — chạy lại với --apply để thực sự ghi.)");
    return;
  }

  console.log("Writing updates...");
  const BATCH = 50;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await Promise.all(
      batch.map((u) => prisma.dishIngredient.update({ where: { id: u.id }, data: { foodId: u.foodId } }))
    );
    if ((i / BATCH) % 20 === 0) console.log(`  ${Math.min(i + BATCH, updates.length)}/${updates.length}`);
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
