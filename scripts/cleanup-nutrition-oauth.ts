import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { cleanupNutritionOAuth } from "../src/lib/nutrition-chat/maintenance";

async function main() {
  if (!process.argv.includes("--apply")) {
    console.log("Khong truy cap DB. Tren VPS sau merge/migrate: NUTRITION_MAINTENANCE_ENABLED=1 npx tsx scripts/cleanup-nutrition-oauth.ts --apply --batches=10");
    return;
  }
  if (process.env.NUTRITION_MAINTENANCE_ENABLED !== "1") throw new Error("Chi chay maintenance khi VPS da bat NUTRITION_MAINTENANCE_ENABLED=1.");
  const argument = process.argv.find(value => value.startsWith("--batches="));
  const batches = argument ? Number(argument.slice(10)) : 1;
  if (!Number.isInteger(batches) || batches < 1 || batches > 20) throw new Error("--batches phai tu 1 den 20.");
  const totals = { codes: 0, tokens: 0, windows: 0, clients: 0 };
  try {
    for (let i = 0; i < batches; i++) {
      const counts = await cleanupNutritionOAuth(200);
      for (const key of Object.keys(totals) as (keyof typeof totals)[]) totals[key] += counts[key];
      if (Object.values(counts).every(value => value === 0)) break;
    }
    console.log(JSON.stringify({ expiredOAuthRecordsDeleted: totals }));
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Maintenance OAuth that bai. Kiem tra migration/cau hinh VPS; khong in loi DB hoac bi mat."); process.exitCode = 1; });
