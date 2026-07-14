import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

// Dọn trùng lặp trong bảng Food, xem README-data.md mục 11 (bổ sung sau khi phát hiện):
// 1) RNI copy nguyên thực phẩm từ VDD (cùng tên chuẩn hoá, macro khớp/hoặc null~0) -> xoá bản RNI, giữ VDD.
// 2) Trùng lặp NGAY TRONG CÙNG 1 nguồn với macro khớp hệt nhau -> giữ bản đầy đủ nhất, xoá phần còn lại.
// Không đụng vào các nhóm tên trùng nhưng macro khác nhau (không chắc là trùng thật).
// FK duy nhất trỏ vào Food là DishIngredient.foodId (ON DELETE SET NULL, đã xác nhận = 0 dòng
// tham chiếu tới các bản ghi bị xoá tại thời điểm viết script này) — script tự kiểm tra lại trước khi xoá.
//
// QUAN TRỌNG: trước khi xoá 1 dòng, BÙ mọi field mà dòng giữ lại đang null nhưng dòng sắp xoá có
// giá trị (vd purinMg/cholesterolMg chỉ có ở RNI — xem check-dedupe-dataloss.ts) — không được mất
// dữ liệu chỉ vì nó nằm ở bản bị coi là "trùng".

const APPLY = process.argv.includes("--apply");

const ALL_NUMERIC_FIELDS = [
  "energyKcal","energyKj","waterG","proteinG","animalProteinG","lipidG","glucidG","fiberG","ashG",
  "calciumMg","ironMg","magnesiumMg","manganeseMg","phosphorusMg","potassiumMg","sodiumMg","zincMg",
  "copperMgVdd","copperMcgRni","seleniumMcg","fluorideMcg","phytosterolsMg","purinMg",
  "retinolMcg","vitARaeMcg","vitAMgVdd","vitAMcgRni","vitAReMcg","betaCarotenMcg","alphaCarotenMcg",
  "cryptoxanthinBetaMcg","lycopeneMcg","luteinZeaxanthinMcg","vitCMg","vitB1Mg","vitB2Mg","vitB3Mg",
  "niacinEquivMg","vitB5Mg","vitB6Mg","folateTotalMcg","folateFoodMcg","folateDfeMcg","folicAcidMcg",
  "vitB12Mcg","vitB12AddedMcg","biotinMcg","vitDMcg","vitD2Mcg","vitD3Mcg","vitEMg","vitEAddedMg",
  "tocopherolAlphaMg","tocopherolBetaMg","tocopherolGammaMg","tocopherolDeltaMg","cholesterolMg",
] as const;

function close(a: number | null, b: number | null) {
  return a === null || b === null ? a === b : Math.abs(a - b) < 0.5;
}

type FoodRow = {
  id: string;
  name: string;
  nameNormalized: string;
  source: string;
} & Record<(typeof ALL_NUMERIC_FIELDS)[number], number | null>;

async function main() {
  const foods = (await prisma.food.findMany({
    select: { id: true, name: true, nameNormalized: true, source: true, ...Object.fromEntries(ALL_NUMERIC_FIELDS.map((f) => [f, true])) },
  })) as FoodRow[];

  const byName = new Map<string, FoodRow[]>();
  for (const f of foods) {
    if (!byName.has(f.nameNormalized)) byName.set(f.nameNormalized, []);
    byName.get(f.nameNormalized)!.push(f);
  }

  const toDelete = new Set<string>();
  const reasons = new Map<string, string>();
  // keepId -> id của các dòng sẽ bị xoá mà dữ liệu cần được bù ngược vào keepId trước khi xoá
  const mergeInto = new Map<string, string[]>();

  function markDelete(keepId: string, dupId: string, reason: string) {
    toDelete.add(dupId);
    reasons.set(dupId, reason);
    if (!mergeInto.has(keepId)) mergeInto.set(keepId, []);
    mergeInto.get(keepId)!.push(dupId);
  }

  for (const [, group] of byName) {
    // 1) RNI copy từ VDD
    const vdd = group.filter((g) => g.source === "VDD");
    const rni = group.filter((g) => g.source === "RNI");
    if (vdd.length > 0 && rni.length > 0) {
      const v = vdd[0];
      for (const r of rni) {
        if (close(v.energyKcal, r.energyKcal) && close(v.proteinG, r.proteinG) && close(v.lipidG, r.lipidG) && close(v.glucidG, r.glucidG)) {
          markDelete(v.id, r.id, `RNI trùng VDD: "${r.name}" (giữ VDD id=${v.id})`);
        }
      }
    }

    // 2) Trùng nội bộ cùng nguồn, macro khớp hệt -> giữ bản đầy đủ nhất
    const bySrc = new Map<string, FoodRow[]>();
    for (const g of group) {
      if (!bySrc.has(g.source)) bySrc.set(g.source, []);
      bySrc.get(g.source)!.push(g);
    }
    for (const [, items] of bySrc) {
      const remaining = items.filter((i) => !toDelete.has(i.id));
      if (remaining.length <= 1) continue;
      const first = remaining[0];
      const allMatch = remaining.every(
        (i) => close(i.energyKcal, first.energyKcal) && close(i.proteinG, first.proteinG) && close(i.lipidG, first.lipidG) && close(i.glucidG, first.glucidG)
      );
      if (!allMatch) continue;
      const completeness = (f: FoodRow) => ALL_NUMERIC_FIELDS.filter((k) => f[k] !== null).length;
      const sorted = [...remaining].sort((a, b) => completeness(b) - completeness(a));
      const keep = sorted[0];
      for (const dup of sorted.slice(1)) {
        markDelete(keep.id, dup.id, `Trùng nội bộ nguồn ${dup.source}: "${dup.name}" (giữ id đầy đủ hơn=${keep.id})`);
      }
    }
  }

  const ids = Array.from(toDelete);
  const linked = await prisma.dishIngredient.count({ where: { foodId: { in: ids } } });

  // tính trước phần bù dữ liệu (backfill) để báo cáo + áp dụng
  const byId = new Map(foods.map((f) => [f.id, f]));
  let mergeUpdateCount = 0;
  const mergeSamples: string[] = [];
  const updates: { id: string; data: Record<string, number> }[] = [];
  for (const [keepId, dupIds] of mergeInto) {
    const keep = byId.get(keepId)!;
    const patch: Record<string, number> = {};
    for (const dupId of dupIds) {
      const dup = byId.get(dupId)!;
      for (const field of ALL_NUMERIC_FIELDS) {
        const keepVal = patch[field] !== undefined ? patch[field] : keep[field];
        if ((keepVal === null || keepVal === undefined) && dup[field] !== null && dup[field] !== undefined) {
          patch[field] = dup[field] as number;
        }
      }
    }
    if (Object.keys(patch).length > 0) {
      mergeUpdateCount++;
      updates.push({ id: keepId, data: patch });
      if (mergeSamples.length < 10) {
        mergeSamples.push(`${keep.name}: bù ${Object.keys(patch).join(", ")}`);
      }
    }
  }

  console.log(`Tổng số dòng dự kiến xoá: ${ids.length}`);
  console.log(`DishIngredient còn trỏ vào các dòng này (phải = 0 mới an toàn xoá): ${linked}`);
  console.log(`Số dòng giữ lại cần BÙ dữ liệu từ bản sắp xoá trước khi xoá: ${mergeUpdateCount}`);
  console.log("\nMẫu bù dữ liệu:");
  mergeSamples.forEach((s) => console.log(" -", s));
  console.log("\nMẫu 15 lý do xoá đầu tiên:");
  ids.slice(0, 15).forEach((id) => console.log(" -", reasons.get(id)));

  if (linked > 0) {
    console.log("\n⚠️  Có DishIngredient đang tham chiếu — DỪNG, không xoá gì (cần remap trước).");
    return;
  }

  if (!APPLY) {
    console.log("\n(DRY RUN — chạy lại với --apply để thực sự xoá.)");
    return;
  }

  for (const u of updates) {
    await prisma.food.update({ where: { id: u.id }, data: u.data });
  }
  const result = await prisma.food.deleteMany({ where: { id: { in: ids } } });
  console.log(`\n✅ Đã bù dữ liệu cho ${updates.length} dòng và xoá ${result.count} dòng trùng.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
