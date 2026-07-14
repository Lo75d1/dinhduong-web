import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

function tokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .split(/[^\p{L}\p{N}]+/u)
      .filter((part) => part.length > 1 && !["mon", "thuc", "pham", "sua", "bot", "cai", "ly"].includes(part))
  );
}

function similarity(a: Set<string>, b: Set<string>): number {
  const common = [...a].filter((word) => b.has(word)).length;
  return common / Math.max(1, new Set([...a, ...b]).size);
}

async function main() {
  const [foods, dishes] = await Promise.all([
    prisma.food.findMany({ select: { id: true, name: true, energyKcal: true, source: true } }),
    prisma.dish.findMany({ where: { ingredients: { none: {} } }, select: { id: true, name: true, totalWeightG: true, sourceCode: true } }),
  ]);

  for (const dish of dishes) {
    const dishTokens = tokens(dish.name);
    const candidates = foods
      .map((food) => ({ ...food, score: similarity(dishTokens, tokens(food.name)) }))
      .filter((food) => food.score >= 0.35)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    console.log(`\n${dish.sourceCode} | ${dish.name} | ${dish.totalWeightG ?? "?"}g`);
    console.table(candidates.map(({ id, name, energyKcal, source, score }) => ({ id, name, energyKcal, source, score: score.toFixed(2) })));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
