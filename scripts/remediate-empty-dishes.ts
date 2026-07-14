import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

// These four RNI dishes contain no ingredient row in the source sheet, but
// have one uniquely identifiable matching Food record in the same source.
// No nutrient is inferred: energy is copied from that existing Food record.
const SAFE_MATCHES = [
  { dishCode: "19025", foodName: "Sữa bột AgedCare Formula (Gotop)" },
  { dishCode: "19026", foodName: "Sữa bột Ensure Original (Abbott)" },
  { dishCode: "19023", foodName: "Sữa bột Ney Gold (Lotte Milk)" },
  { dishCode: "19024", foodName: "Sữa non Alpha Lifeline (New Image)" },
] as const;

async function main() {
  let created = 0;
  for (const match of SAFE_MATCHES) {
    const [dish, foods] = await Promise.all([
      prisma.dish.findFirst({ where: { sourceCode: match.dishCode }, include: { ingredients: true } }),
      prisma.food.findMany({ where: { name: match.foodName, source: "RNI" }, select: { id: true, name: true, energyKcal: true } }),
    ]);
    if (!dish) throw new Error(`Không tìm thấy món mã ${match.dishCode}`);
    if (dish.ingredients.length > 0) continue;
    if (foods.length !== 1 || foods[0].energyKcal === null) throw new Error(`Không có thực phẩm khớp duy nhất cho ${match.dishCode}`);

    await prisma.dishIngredient.create({
      data: {
        dishId: dish.id,
        foodId: foods[0].id,
        foodNameRaw: foods[0].name,
        quantityG: dish.totalWeightG,
        energyKcalRaw: foods[0].energyKcal,
        sortOrder: 1,
      },
    });
    created++;
    console.log(`+ ${dish.name} ← ${foods[0].name}`);
  }
  console.log(`Đã khôi phục ${created} món rỗng bằng liên kết nguồn chắc chắn.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
