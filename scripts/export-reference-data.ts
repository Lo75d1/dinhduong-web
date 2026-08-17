import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/prisma.js";
import { getDelegate, REFERENCE_DIR, referenceModels, writeRows } from "./reference-data.js";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Thiếu DATABASE_URL.");
  await mkdir(REFERENCE_DIR, { recursive: true });

  const files: Record<string, { count: number; sha256: string }> = {};
  for (const spec of referenceModels) {
    const rows = await getDelegate(prisma, spec.client).findMany({ orderBy: spec.orderBy });
    files[spec.file] = await writeRows(spec.file, rows);
    console.log(`${spec.table}: ${rows.length}`);
  }

  const manifest = {
    schema_version: 1,
    encoding: "UTF-8",
    format: "JSON Lines; một record mỗi dòng; sắp xếp theo id",
    notes: [
      "ID được giữ nguyên để bảo toàn liên kết.",
      "createdAt/updatedAt không xuất vì không phải giá trị dinh dưỡng và gây diff không ổn định.",
      "Giá trị null, đơn vị và dữ liệu nguồn được giữ nguyên; không suy diễn hoặc làm sạch.",
    ],
    sources: {
      foods: { source: "VDD và RNI", version: "unknown" },
      dishes: { source: "RNI", version: "unknown" },
      nutrition_recommendations: { source: "VDD/RNI khuyến nghị dinh dưỡng", version: "2026" },
      diet_codes: { source: "Bộ Y tế - MCDA", version: "unknown" },
      child_growth_standards: { source: "WHO (bản dữ liệu nguồn của dự án)", version: "unknown" },
      food_aliases: { source: "Mapping nội bộ, chỉ phục vụ tìm kiếm", version: "unknown" },
    },
    files,
  };
  await writeFile(path.join(REFERENCE_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Đã xuất dataset vào ${REFERENCE_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
