import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/prisma.js";
import { encodeRows, getDelegate, readRows, REFERENCE_DIR, referenceModels, sha256 } from "./reference-data.js";

type Manifest = { files: Record<string, { count: number; sha256: string }> };

async function main() {
  const manifest = JSON.parse(await readFile(path.join(REFERENCE_DIR, "manifest.json"), "utf8")) as Manifest;
  for (const spec of referenceModels) {
    const expected = manifest.files[spec.file];
    const datasetRows = await readRows(spec.file);
    const databaseRows = await getDelegate(prisma, spec.client).findMany({ orderBy: spec.orderBy });
    const databaseHash = sha256(encodeRows(databaseRows));
    if (datasetRows.length !== expected.count || databaseRows.length !== expected.count || databaseHash !== expected.sha256) {
      throw new Error(
        `${spec.table}: dataset=${datasetRows.length}, database=${databaseRows.length}, expected=${expected.count}; ` +
        `hash database=${databaseHash}, expected=${expected.sha256}`,
      );
    }
    console.log(`PASS ${spec.table}: ${expected.count} records, sha256=${expected.sha256.slice(0, 12)}…`);
  }

  const samples = await prisma.food.findMany({
    orderBy: { id: "asc" },
    select: { id: true, name: true, source: true, unit: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true, calciumMg: true, vitCMg: true },
    take: 3,
  });
  const rni = await prisma.nutritionRecommendation.findMany({ orderBy: { id: "asc" }, take: 3 });
  console.log("Mẫu thực phẩm:", JSON.stringify(samples));
  console.log("Mẫu RNI:", JSON.stringify(rni));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
