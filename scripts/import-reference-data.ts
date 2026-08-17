import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { getDelegate, readRows, referenceModels } from "./reference-data.js";

const BATCH_SIZE = 250;

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Thiếu DATABASE_URL.");

  const existing = await Promise.all(
    referenceModels.map(async (spec) => ({ spec, count: await getDelegate(prisma, spec.client).count() })),
  );
  const nonEmpty = existing.filter(({ count }) => count > 0);
  if (nonEmpty.length) {
    throw new Error(
      `Import bị chặn: database không rỗng (${nonEmpty.map(({ spec, count }) => `${spec.table}=${count}`).join(", ")}). ` +
      "Lệnh này chỉ dùng để seed database mới và không xóa/ghi đè dữ liệu hiện có.",
    );
  }

  for (const spec of referenceModels) {
    const rows = await readRows(spec.file);
    let inserted = 0;
    for (let start = 0; start < rows.length; start += BATCH_SIZE) {
      const result = await getDelegate(prisma, spec.client).createMany({ data: rows.slice(start, start + BATCH_SIZE) });
      inserted += result.count;
    }
    if (inserted !== rows.length) throw new Error(`${spec.table}: cần ${rows.length}, đã nhập ${inserted}.`);
    console.log(`${spec.table}: ${inserted}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
