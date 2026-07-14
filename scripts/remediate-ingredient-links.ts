import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

// A stricter second-pass linker. Unlike the original linker, punctuation and
// spacing are ignored, but words, brands and quantities are never guessed.
// Run without --apply first; only unique exact canonical matches can be saved.
const APPLY = process.argv.includes("--apply");

function canonical(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function beforeParenthesis(value: string): string {
  return value.split("(")[0].trim();
}

function add(map: Map<string, string[]>, key: string, id: string) {
  if (!key) return;
  map.set(key, [...(map.get(key) ?? []), id]);
}

async function main() {
  const [foods, ingredients] = await Promise.all([
    prisma.food.findMany({ select: { id: true, name: true, energyKcal: true } }),
    prisma.dishIngredient.findMany({ where: { foodId: null }, select: { id: true, foodNameRaw: true, energyKcalRaw: true } }),
  ]);

  const byFull = new Map<string, string[]>();
  const byViPart = new Map<string, string[]>();
  for (const food of foods) {
    add(byFull, canonical(food.name), food.id);
    add(byViPart, canonical(beforeParenthesis(food.name)), food.id);
  }

  const updates: { id: string; foodId: string }[] = [];
  let ambiguous = 0;
  for (const ingredient of ingredients) {
    const full = byFull.get(canonical(ingredient.foodNameRaw)) ?? [];
    const vi = byViPart.get(canonical(beforeParenthesis(ingredient.foodNameRaw))) ?? [];
    const candidateIds = [...new Set([...full, ...vi])];
    if (candidateIds.length === 1) updates.push({ id: ingredient.id, foodId: candidateIds[0] });
    else if (candidateIds.length > 1) ambiguous++;
  }

  console.log(`Unlinked ingredients: ${ingredients.length}`);
  console.log(`Unique exact canonical matches: ${updates.length}`);
  console.log(`Ambiguous exact canonical matches (not changed): ${ambiguous}`);
  if (!APPLY) {
    console.log("Dry run only. Use --apply to save only the unique exact matches.");
    return;
  }

  for (const update of updates) {
    await prisma.dishIngredient.update({ where: { id: update.id }, data: { foodId: update.foodId } });
  }
  console.log(`Saved ${updates.length} safe links.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
