"use client";

// Biểu đồ phân bố cả ngày theo nguồn gốc/nhóm thực phẩm (nhóm C: 5, 6, 7) — dùng chung
// mark-spec thanh 100% xếp chồng + bảng của RationCharts. Độ phủ dữ liệu thấp (xem
// README-data.md mục 10) nên luôn hiển thị % "chưa phân loại/chưa phân nhóm".
import type { Row } from "./types";
import {
  UNCLASSIFIED_GROUP,
  UNCLASSIFIED_ORIGIN,
  bucketColor,
  bucketTopK,
  guessLipidOrigin,
} from "@/lib/food-classify";

function round(n: number, d = 1) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}

function DistributionChart({
  title,
  note,
  unit,
  buckets,
  kind,
}: {
  title: string;
  note: string;
  unit: string;
  buckets: { key: string; value: number }[];
  kind: "foodGroup" | "proteinOrigin" | "lipidOrigin";
}) {
  const total = buckets.reduce((s, b) => s + b.value, 0);
  if (total <= 0) return null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-700">{title}</h2>
      <p className="mt-0.5 text-xs text-neutral-400">{note}</p>

      <div className="mt-3 flex h-6 w-full gap-[2px] overflow-hidden rounded-md">
        {buckets.map((b) => {
          const pct = (b.value / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={b.key}
              style={{ width: `${pct}%`, backgroundColor: bucketColor(b.key, kind) }}
              title={`${b.key}: ${round(pct)}%`}
              className="h-full first:rounded-l-md last:rounded-r-md"
            />
          );
        })}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-neutral-400">
            <tr>
              <th className="py-1 font-medium">Nguồn / nhóm</th>
              <th className="py-1 text-right font-medium">{unit}</th>
              <th className="py-1 text-right font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {buckets
              .filter((b) => b.value > 0)
              .map((b) => (
                <tr key={b.key} className="border-t border-neutral-100">
                  <td className="py-1.5">
                    <span
                      className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle"
                      style={{ backgroundColor: bucketColor(b.key, kind) }}
                    />
                    {b.key}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-neutral-600">{round(b.value)}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums">{round((b.value / total) * 100)}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function OriginCharts({ rows }: { rows: Row[] }) {
  const foodRows = rows.filter((r) => r.foodId);
  if (foodRows.length === 0) return null;

  // 5. Nguồn gốc Protein (~14% phủ — chỉ VDD)
  const proteinByOrigin = new Map<string, number>();
  for (const r of foodRows) {
    const factor = r.grams / 100;
    const p = (r.nutrients.proteinG ?? 0) * factor;
    if (p <= 0) continue;
    const key = r.classify.proteinOrigin ?? UNCLASSIFIED_ORIGIN;
    proteinByOrigin.set(key, (proteinByOrigin.get(key) ?? 0) + p);
  }
  const proteinBuckets = bucketTopK(
    Array.from(proteinByOrigin.entries()).map(([key, value]) => ({ key, value })),
    8,
    UNCLASSIFIED_ORIGIN
  );
  const proteinKnownPct =
    (1 - (proteinByOrigin.get(UNCLASSIFIED_ORIGIN) ?? 0) / Array.from(proteinByOrigin.values()).reduce((s, v) => s + v, 0.0001)) * 100;

  // 6. Nguồn gốc Lipid — KHÔNG có trường gốc trong CSDL (0%), suy luận theo TÊN món (ước lượng)
  const lipidByOrigin = new Map<string, number>();
  for (const r of foodRows) {
    const factor = r.grams / 100;
    const l = (r.nutrients.lipidG ?? 0) * factor;
    if (l <= 0) continue;
    const key = guessLipidOrigin(r.foodName, r.classify.foodGroup);
    lipidByOrigin.set(key, (lipidByOrigin.get(key) ?? 0) + l);
  }
  const lipidBuckets = bucketTopK(
    Array.from(lipidByOrigin.entries()).map(([key, value]) => ({ key, value })),
    8,
    UNCLASSIFIED_ORIGIN
  );
  const lipidKnownPct =
    (1 - (lipidByOrigin.get(UNCLASSIFIED_ORIGIN) ?? 0) / Array.from(lipidByOrigin.values()).reduce((s, v) => s + v, 0.0001)) * 100;

  // 7. Nhóm thực phẩm theo khối lượng (~22% phủ — chỉ VDD)
  const gramsByGroup = new Map<string, number>();
  for (const r of foodRows) {
    const key = r.classify.foodGroup ?? UNCLASSIFIED_GROUP;
    gramsByGroup.set(key, (gramsByGroup.get(key) ?? 0) + r.grams);
  }
  const groupBuckets = bucketTopK(
    Array.from(gramsByGroup.entries()).map(([key, value]) => ({ key, value })),
    8
  );
  const groupKnownPct =
    (1 - (gramsByGroup.get(UNCLASSIFIED_GROUP) ?? 0) / Array.from(gramsByGroup.values()).reduce((s, v) => s + v, 0.0001)) * 100;

  return (
    <div className="flex flex-col gap-6">
      <DistributionChart
        title="Nguồn gốc Protein"
        note={`Chỉ ~14% thực phẩm (nguồn VDD) có phân loại nguồn gốc đạm — ${round(proteinKnownPct)}% lượng đạm trong khẩu phần này đã phân loại được, phần còn lại gộp vào “${UNCLASSIFIED_ORIGIN}”.`}
        unit="g đạm"
        buckets={proteinBuckets}
        kind="proteinOrigin"
      />
      <DistributionChart
        title="Nguồn gốc Lipid"
        note={`CSDL chưa có trường nguồn gốc béo — ước lượng theo TÊN món (không phải số đo gốc). ${round(lipidKnownPct)}% lượng béo trong khẩu phần này ước lượng được, phần còn lại gộp vào “${UNCLASSIFIED_ORIGIN}”.`}
        unit="g béo"
        buckets={lipidBuckets}
        kind="lipidOrigin"
      />
      <DistributionChart
        title="Nhóm thực phẩm theo khối lượng"
        note={`Chỉ ~22% thực phẩm (nguồn VDD) có nhóm chuẩn — ${round(groupKnownPct)}% khối lượng khẩu phần này đã phân nhóm được, phần còn lại gộp vào “${UNCLASSIFIED_GROUP}”.`}
        unit="g"
        buckets={groupBuckets}
        kind="foodGroup"
      />
    </div>
  );
}
