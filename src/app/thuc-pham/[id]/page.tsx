import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NUTRIENT_GROUPS, LEVEL_LABELS } from "@/lib/nutrient-fields";

export default async function ThucPhamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const food = await prisma.food.findUnique({ where: { id } });
  if (!food) notFound();

  const record = food as unknown as Record<string, unknown>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/thuc-pham" className="text-sm text-emerald-700 hover:underline">
          ← Danh sách thực phẩm
        </Link>
        <div className="mt-2 flex items-start gap-4">
          {food.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={food.imageUrl} alt={food.name} className="h-24 w-24 shrink-0 rounded-lg border border-neutral-200 object-cover" />
          )}
          <h1 className="text-2xl font-semibold">{food.name}</h1>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-neutral-100 px-2 py-1 text-neutral-600">
            Nguồn: {food.source}
          </span>
          {food.foodGroup && (
            <span className="rounded-full bg-neutral-100 px-2 py-1 text-neutral-600">
              {food.foodGroup}
            </span>
          )}
          {food.proteinOrigin && (
            <span className="rounded-full bg-neutral-100 px-2 py-1 text-neutral-600">
              Đạm: {food.proteinOrigin}
            </span>
          )}
          {food.wastePercent !== null && (
            <span className="rounded-full bg-neutral-100 px-2 py-1 text-neutral-600">
              Thải bỏ: {food.wastePercent}%
            </span>
          )}
        </div>
        {food.sourceNote && (
          <p className="mt-2 text-xs text-neutral-400">Nguồn tham khảo: {food.sourceNote}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {[
          { label: "Mức GI", value: food.giLevel },
          { label: "Mức Purin", value: food.purinLevel },
          { label: "Mức Cholesterol", value: food.cholesterolLevel },
        ].map((x) => (
          <div key={x.label} className="rounded-lg border border-neutral-200 bg-white p-3 text-center">
            <div className="text-xs text-neutral-500">{x.label}</div>
            <div className="mt-1 text-sm font-medium">
              {x.value === null || x.value === undefined ? "Chưa có" : LEVEL_LABELS[x.value]}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-neutral-400">
        Giá trị dinh dưỡng tính trên 100{food.unit}. Xem README-data.md để biết các giả định/quy tắc
        suy luận.
      </p>

      {NUTRIENT_GROUPS.map((group) => {
        const rows = group.fields.filter((f) => record[f.key] !== null && record[f.key] !== undefined);
        if (rows.length === 0) return null;
        return (
          <div key={group.title} className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-700">{group.title}</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {rows.map((f) => (
                <div key={f.key} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-neutral-500">{f.label}</span>
                  <span className="font-medium">
                    {String(record[f.key])} {f.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
