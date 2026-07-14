import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

// Xoá (null hoá) riêng lẻ các trường TỰ NÓ đã phi lý về mặt sinh học/vật lý, bất kể ngữ cảnh
// dòng đó — KHÔNG đoán số thay thế (README-data.md mục 17). Đã tra ngược file Excel gốc: sai
// số nằm SẴN trong nguồn VDD, không phải do đọc nhầm cột lúc seed.
//
// Ngưỡng: proteinG > 100 (100g đạm/100g thực phẩm là giới hạn TOÁN HỌC tuyệt đối — khối lượng
// đạm không thể vượt quá khối lượng thực phẩm). cholesterolMg > 10000 (KHÔNG dùng mốc thấp hơn
// vì óc bò thật đã ~3000-3300mg/100g, tim/bầu dục ~5600mg — mốc 10000 chỉ bắt các dòng "Lẩu"
// sai rõ rệt 25000-35000mg, tránh null nhầm thực phẩm cực đoan nhưng có thật).
//
// CHỈ null field bị flag, KHÔNG đụng các field khác của cùng dòng đó — vd "Lẩu ếch" vừa sai
// proteinG vừa sai cholesterolMg thì null cả 2, nhưng lipidG/glucidG/energyKcal của nó vẫn giữ
// nguyên vì không có bằng chứng chúng cũng sai.

const APPLY = process.argv.includes("--apply");

async function main() {
  const badProtein = await prisma.food.findMany({
    where: { proteinG: { gt: 100 } },
    select: { id: true, name: true, proteinG: true },
  });
  const badChol = await prisma.food.findMany({
    where: { cholesterolMg: { gt: 10000 } },
    select: { id: true, name: true, cholesterolMg: true },
  });

  console.log(`proteinG > 100g/100g: ${badProtein.length} dòng`);
  badProtein.forEach((f) => console.log(`  - ${f.name}: ${f.proteinG}g`));
  console.log(`\ncholesterolMg > 10000mg/100g: ${badChol.length} dòng`);
  badChol.forEach((f) => console.log(`  - ${f.name}: ${f.cholesterolMg}mg`));

  if (!APPLY) {
    console.log("\n(DRY RUN — chạy lại với --apply để thực sự ghi.)");
    return;
  }

  const r1 = await prisma.food.updateMany({ where: { proteinG: { gt: 100 } }, data: { proteinG: null } });
  const r2 = await prisma.food.updateMany({ where: { cholesterolMg: { gt: 10000 } }, data: { cholesterolMg: null } });
  console.log(`\n✅ Đã null hoá proteinG cho ${r1.count} dòng, cholesterolMg cho ${r2.count} dòng.`);
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
