import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function MonAnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dish = await prisma.dish.findUnique({
    where: { id },
    include: {
      ingredients: {
        orderBy: { sortOrder: "asc" },
        include: {
          food: {
            select: {
              id: true,
              name: true,
              energyKcal: true,
              proteinG: true,
              lipidG: true,
              glucidG: true,
            },
          },
        },
      },
    },
  });
  if (!dish) notFound();

  const singleIngredient = dish.ingredients.length === 1 ? dish.ingredients[0] : null;

  let totalKcal = 0; // đầy đủ nhất có thể: dùng food đã liên kết, hoặc energyKcalRaw của chính nguyên liệu đó
  let totalProtein = 0;
  let totalLipid = 0;
  let totalGlucid = 0;
  let macroWeight = 0; // khối lượng có đủ đạm/béo/đường (chỉ nguyên liệu đã liên kết)
  let unlinkedNoEnergyCount = 0;

  for (const ing of dish.ingredients) {
    const qty = ing.quantityG ?? 0;
    const factor = qty / 100;
    if (ing.food) {
      totalKcal += (ing.food.energyKcal ?? 0) * factor;
      totalProtein += (ing.food.proteinG ?? 0) * factor;
      totalLipid += (ing.food.lipidG ?? 0) * factor;
      totalGlucid += (ing.food.glucidG ?? 0) * factor;
      macroWeight += qty;
    } else if (ing.energyKcalRaw !== null) {
      totalKcal += ing.energyKcalRaw * factor;
    } else {
      unlinkedNoEnergyCount++;
    }
  }
  const round = (n: number) => Math.round(n * 10) / 10;
  const hasFullMacro = macroWeight > 0 && macroWeight === dish.ingredients.reduce((s, i) => s + (i.quantityG ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/mon-an" className="text-sm text-emerald-700 hover:underline">
          ← Danh sách món ăn
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{dish.name}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-neutral-100 px-2 py-1 text-neutral-600">
            Nguồn: {dish.source}
          </span>
          {dish.totalWeightG && (
            <span className="rounded-full bg-neutral-100 px-2 py-1 text-neutral-600">
              Khối lượng: {dish.totalWeightG}g{dish.servingUnit ? ` / ${dish.servingUnit}` : ""}
            </span>
          )}
          {dish.diseaseDiet && (
            <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700">
              {dish.diseaseDiet}
            </span>
          )}
          {dish.ageGroup && (
            <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">{dish.ageGroup}</span>
          )}
        </div>
        {dish.categoryRaw && (
          <p className="mt-2 text-xs text-neutral-400">Nhãn gốc RNI: {dish.categoryRaw}</p>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-neutral-700">
          {singleIngredient ? "Thành phần dinh dưỡng" : "Tổng dinh dưỡng ước tính"}
        </h2>
        {!hasFullMacro && (
          <p className="mb-3 text-xs text-amber-600">
            {singleIngredient
              ? singleIngredient.food
                ? null
                : "Nguyên liệu này chưa liên kết được với CSDL Thực phẩm — chỉ có Năng lượng theo dữ liệu gốc RNI, chưa có đạm/béo/đường."
              : "Đạm/béo/đường chỉ tính được từ các nguyên liệu đã liên kết với CSDL Thực phẩm; Năng lượng dùng thêm dữ liệu gốc của từng nguyên liệu nên đầy đủ hơn."}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Năng lượng" value={`${round(totalKcal)} kcal`} />
          <Stat label="Đạm" value={`${round(totalProtein)} g`} />
          <Stat label="Béo" value={`${round(totalLipid)} g`} />
          <Stat label="Đường bột" value={`${round(totalGlucid)} g`} />
        </div>
        {unlinkedNoEnergyCount > 0 && (
          <p className="mt-3 text-xs text-neutral-400">
            {unlinkedNoEnergyCount} nguyên liệu hoàn toàn không có dữ liệu năng lượng trong file gốc.
          </p>
        )}
      </div>

      {!singleIngredient && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">
            Nguyên liệu ({dish.ingredients.length})
          </h2>
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr>
                <th className="py-1 font-medium">Nguyên liệu</th>
                <th className="py-1 text-right font-medium">Khối lượng</th>
              </tr>
            </thead>
            <tbody>
              {dish.ingredients.map((ing) => (
                <tr key={ing.id} className="border-t border-neutral-100">
                  <td className="py-1.5">
                    {ing.food ? (
                      <Link href={`/thuc-pham/${ing.food.id}`} className="text-emerald-700 hover:underline">
                        {ing.foodNameRaw}
                      </Link>
                    ) : (
                      <span>
                        {ing.foodNameRaw}{" "}
                        <span className="text-xs text-neutral-400">(chưa liên kết)</span>
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-right text-neutral-600">
                    {ing.quantityG !== null ? `${ing.quantityG} g` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dish.cookingSteps && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">Cách chế biến</h2>
          <p className="whitespace-pre-line text-sm text-neutral-700">{dish.cookingSteps}</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 p-3 text-center">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
