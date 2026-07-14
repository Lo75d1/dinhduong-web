import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

// So khớp thực phẩm theo nameNormalized giữa 2 nguồn (VDD/RNI) + so macro để phân biệt
// "trùng thật" (RNI copy từ VDD) vs "trùng tên tình cờ, số liệu khác".
async function main() {
  const foods = await prisma.food.findMany({
    select: {
      id: true,
      name: true,
      nameNormalized: true,
      source: true,
      foodType: true,
      energyKcal: true,
      proteinG: true,
      lipidG: true,
      glucidG: true,
    },
  });

  const bySource = new Map<string, typeof foods>();
  for (const f of foods) {
    if (!bySource.has(f.nameNormalized)) bySource.set(f.nameNormalized, []);
    bySource.get(f.nameNormalized)!.push(f);
  }

  let groupsWithBothSources = 0;
  let exactMacroMatches = 0;
  let closeMacroMatches = 0;
  let differentMacro = 0;
  const exactSamples: string[] = [];
  const differentSamples: string[] = [];

  for (const [, group] of bySource) {
    if (group.length < 2) continue;
    const sources = new Set(group.map((g) => g.source));
    if (!(sources.has("VDD") && sources.has("RNI"))) continue;
    groupsWithBothSources++;

    const vdd = group.find((g) => g.source === "VDD")!;
    const rni = group.find((g) => g.source === "RNI")!;
    const close = (a: number | null, b: number | null) =>
      a === null || b === null ? a === b : Math.abs(a - b) < 0.5;

    if (
      close(vdd.energyKcal, rni.energyKcal) &&
      close(vdd.proteinG, rni.proteinG) &&
      close(vdd.lipidG, rni.lipidG) &&
      close(vdd.glucidG, rni.glucidG)
    ) {
      exactMacroMatches++;
      if (exactSamples.length < 15) {
        exactSamples.push(
          `${vdd.name} | VDD(${vdd.foodType}): ${vdd.energyKcal}/${vdd.proteinG}/${vdd.lipidG}/${vdd.glucidG} | RNI(${rni.foodType}): ${rni.energyKcal}/${rni.proteinG}/${rni.lipidG}/${rni.glucidG}`
        );
      }
    } else {
      differentMacro++;
      if (differentSamples.length < 10) {
        differentSamples.push(
          `${vdd.name} | VDD: ${vdd.energyKcal}/${vdd.proteinG}/${vdd.lipidG}/${vdd.glucidG} | RNI: ${rni.energyKcal}/${rni.proteinG}/${rni.lipidG}/${rni.glucidG}`
        );
      }
    }
  }

  console.log("Tổng số Food:", foods.length);
  console.log("Nhóm tên trùng CÓ CẢ VDD lẫn RNI:", groupsWithBothSources);
  console.log("  → macro khớp gần như tuyệt đối (nghi là copy/trùng thật):", exactMacroMatches);
  console.log("  → macro khác nhau (trùng tên nhưng số liệu khác — có thể không phải trùng thật):", differentMacro);
  console.log("\n--- Mẫu TRÙNG THẬT (macro khớp) ---");
  exactSamples.forEach((s) => console.log(s));
  console.log("\n--- Mẫu TÊN TRÙNG NHƯNG MACRO KHÁC ---");
  differentSamples.forEach((s) => console.log(s));

  // Trùng lặp bên trong CÙNG 1 nguồn (vd RNI tự lặp lại chính nó)
  let sameSourceDup = 0;
  const sameSourceSamples: string[] = [];
  for (const [, group] of bySource) {
    const bySrc = new Map<string, typeof foods>();
    for (const g of group) {
      if (!bySrc.has(g.source)) bySrc.set(g.source, []);
      bySrc.get(g.source)!.push(g);
    }
    for (const [src, items] of bySrc) {
      if (items.length > 1) {
        sameSourceDup++;
        if (sameSourceSamples.length < 10) {
          sameSourceSamples.push(`${src}: ${items.map((i) => i.name).join(" || ")}`);
        }
      }
    }
  }
  console.log("\nNhóm trùng tên NGAY TRONG CÙNG 1 nguồn:", sameSourceDup);
  sameSourceSamples.forEach((s) => console.log(s));

  // Tác động nếu xoá bản RNI trùng VDD: có bao nhiêu DishIngredient đang trỏ vào các Food(RNI) này?
  const rniDupIds: string[] = [];
  for (const [, group] of bySource) {
    const sources = new Set(group.map((g) => g.source));
    if (sources.has("VDD") && sources.has("RNI")) {
      const rni = group.filter((g) => g.source === "RNI");
      rniDupIds.push(...rni.map((r) => r.id));
    }
  }
  const linkedCount = await prisma.dishIngredient.count({ where: { foodId: { in: rniDupIds } } });
  console.log(`\nSố Food(RNI) trùng tên với VDD: ${rniDupIds.length}`);
  console.log(`Số DishIngredient đang trỏ vào các Food(RNI) trùng này: ${linkedCount}`);

  // Trùng lặp NGAY TRONG CÙNG 1 nguồn: bao nhiêu dòng "thừa", macro có khớp không, có bị
  // DishIngredient trỏ vào không (để biết xoá dòng nào an toàn).
  let sameSourceExcessRows = 0;
  let sameSourceMacroMatch = 0;
  let sameSourceMacroDiffer = 0;
  const excessIdsAllButFirst: string[] = [];
  for (const [, group] of bySource) {
    const bySrc = new Map<string, typeof foods>();
    for (const g of group) {
      if (!bySrc.has(g.source)) bySrc.set(g.source, []);
      bySrc.get(g.source)!.push(g);
    }
    for (const [, items] of bySrc) {
      if (items.length <= 1) continue;
      sameSourceExcessRows += items.length - 1;
      excessIdsAllButFirst.push(...items.slice(1).map((i) => i.id));
      const close = (a: number | null, b: number | null) =>
        a === null || b === null ? a === b : Math.abs(a - b) < 0.5;
      const first = items[0];
      const allMatch = items.every(
        (i) =>
          close(i.energyKcal, first.energyKcal) &&
          close(i.proteinG, first.proteinG) &&
          close(i.lipidG, first.lipidG) &&
          close(i.glucidG, first.glucidG)
      );
      if (allMatch) sameSourceMacroMatch++;
      else sameSourceMacroDiffer++;
    }
  }
  const linkedToExcess = await prisma.dishIngredient.count({
    where: { foodId: { in: excessIdsAllButFirst } },
  });
  console.log(`\nSố dòng "thừa" nếu gộp trùng cùng nguồn (giữ 1, xoá phần còn lại): ${sameSourceExcessRows}`);
  console.log(`  → nhóm macro khớp hoàn toàn: ${sameSourceMacroMatch}`);
  console.log(`  → nhóm macro khác nhau (không chắc là trùng thật): ${sameSourceMacroDiffer}`);
  console.log(`  → DishIngredient trỏ vào các dòng "thừa" này: ${linkedToExcess}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
