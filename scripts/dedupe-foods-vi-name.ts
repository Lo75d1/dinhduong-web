import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { normalizeVi } from "../src/lib/normalize.js";

// Đợt dọn trùng lặp thứ 2 (sau dedupe-foods.ts): bắt các cặp cùng tên tiếng Việt nhưng khác
// nhau ở phần gloss tiếng Anh do lỗi chính tả/định dạng gốc (vd "Cari powder " thừa dấu cách,
// "weeding"->"wedding") — dedupe-foods.ts so nameNormalized ĐẦY ĐỦ nên bỏ sót các cặp này.
// Chỉ xoá khi TOÀN BỘ macro (kcal/đạm/béo/đường) khớp gần tuyệt đối trong cả nhóm — các nhóm
// tên giống nhưng macro khác (vd "Bánh giò" có 7 biến thể macro khác hẳn nhau) là MÓN KHÁC
// NHAU THẬT, không đụng vào. Bù dữ liệu thiếu vào bản giữ lại trước khi xoá, như đợt 1.

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
  source: string;
} & Record<(typeof ALL_NUMERIC_FIELDS)[number], number | null>;

const viOnly = (name: string) => normalizeVi(name.split("(")[0].trim());

async function main() {
  const foods = (await prisma.food.findMany({
    select: { id: true, name: true, source: true, ...Object.fromEntries(ALL_NUMERIC_FIELDS.map((f) => [f, true])) },
  })) as FoodRow[];

  const byViName = new Map<string, FoodRow[]>();
  for (const f of foods) {
    const key = viOnly(f.name);
    if (!byViName.has(key)) byViName.set(key, []);
    byViName.get(key)!.push(f);
  }

  const toDelete = new Set<string>();
  const reasons = new Map<string, string>();
  const mergeInto = new Map<string, string[]>();

  function markDelete(keepId: string, dupId: string, reason: string) {
    toDelete.add(dupId);
    reasons.set(dupId, reason);
    if (!mergeInto.has(keepId)) mergeInto.set(keepId, []);
    mergeInto.get(keepId)!.push(dupId);
  }

  const completeness = (f: FoodRow) => ALL_NUMERIC_FIELDS.filter((k) => f[k] !== null).length;

  for (const [, group] of byViName) {
    if (group.length < 2) continue;
    const first = group[0];
    const allMatch = group.every(
      (g) =>
        close(g.energyKcal, first.energyKcal) &&
        close(g.proteinG, first.proteinG) &&
        close(g.lipidG, first.lipidG) &&
        close(g.glucidG, first.glucidG)
    );
    if (!allMatch) continue; // tên giống nhưng macro khác -> món khác nhau thật, bỏ qua

    // ưu tiên giữ VDD (nguồn gốc), trong cùng nguồn thì giữ bản đầy đủ nhất
    const sorted = [...group].sort((a, b) => {
      if (a.source !== b.source) return a.source === "VDD" ? -1 : 1;
      return completeness(b) - completeness(a);
    });
    const keep = sorted[0];
    for (const dup of sorted.slice(1)) {
      markDelete(keep.id, dup.id, `Trùng tên VN "${dup.name}" (nguồn ${dup.source}) — giữ "${keep.name}" (${keep.source}, id=${keep.id})`);
    }
  }

  const ids = Array.from(toDelete);
  const linked = await prisma.dishIngredient.count({ where: { foodId: { in: ids } } });

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
      if (mergeSamples.length < 10) mergeSamples.push(`${keep.name}: bù ${Object.keys(patch).join(", ")}`);
    }
  }

  console.log(`Tổng số dòng dự kiến xoá: ${ids.length}`);
  console.log(`DishIngredient còn trỏ vào các dòng này (phải = 0 mới an toàn xoá): ${linked}`);
  console.log(`Số dòng giữ lại cần BÙ dữ liệu: ${mergeUpdateCount}`);
  console.log("\nMẫu bù dữ liệu:");
  mergeSamples.forEach((s) => console.log(" -", s));
  console.log("\nMẫu lý do xoá:");
  ids.slice(0, 20).forEach((id) => console.log(" -", reasons.get(id)));

  if (linked > 0) {
    console.log("\n⚠️  Có DishIngredient đang tham chiếu — DỪNG, không xoá gì.");
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
