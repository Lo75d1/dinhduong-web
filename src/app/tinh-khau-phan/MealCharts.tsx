"use client";

// Biểu đồ phân tích theo TỪNG BỮA — dùng chung palette/mark-spec với RationCharts.
// Không dùng biểu đồ 2 trục (dual-axis) — 2 đại lượng khác thang đo tách thành small
// multiples riêng (xem skill dataviz, anti-pattern #1).
import type { Row } from "./types";
import { LEVEL_LABELS } from "@/lib/nutrient-fields";
import {
  LEVEL_COLORS,
  UNCLASSIFIED_GROUP,
  bucketColor,
  bucketTopK,
  weightedLevelStat,
} from "@/lib/food-classify";

const SERIES = {
  protein: "#2a78d6", // blue
  lipid: "#1baf7a", // aqua
  glucid: "#eda100", // yellow
  energy: "#2a78d6", // 1 chuỗi duy nhất -> dùng cùng hue chính, không cần legend
  fiber: "#008300", // green
};

function round(n: number, d = 1) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}

type MealTotal = {
  meal: string;
  kcal: number;
  protein: number;
  lipid: number;
  glucid: number;
  fiber: number;
  sodium: number;
  giCoverage: { avg: number | null; coveragePct: number };
  purinCoverage: { avg: number | null; coveragePct: number };
  cholCoverage: { avg: number | null; coveragePct: number };
  sodiumByGroup: Map<string, number>;
};

export default function MealCharts({ rows }: { rows: Row[] }) {
  const foodRows = rows.filter((r) => r.foodId);
  if (foodRows.length === 0) return null;

  // gom theo bữa, giữ thứ tự xuất hiện
  const order: string[] = [];
  const byMeal = new Map<string, Row[]>();
  for (const r of foodRows) {
    if (!byMeal.has(r.meal)) {
      byMeal.set(r.meal, []);
      order.push(r.meal);
    }
    byMeal.get(r.meal)!.push(r);
  }

  const totals: MealTotal[] = order.map((meal) => {
    const rs = byMeal.get(meal)!;
    let kcal = 0,
      protein = 0,
      lipid = 0,
      glucid = 0,
      fiber = 0,
      sodium = 0;
    const sodiumByGroup = new Map<string, number>();
    for (const r of rs) {
      const factor = r.grams / 100;
      kcal += (r.nutrients.energyKcal ?? 0) * factor;
      protein += (r.nutrients.proteinG ?? 0) * factor;
      lipid += (r.nutrients.lipidG ?? 0) * factor;
      glucid += (r.nutrients.glucidG ?? 0) * factor;
      fiber += (r.nutrients.fiberG ?? 0) * factor;
      const na = (r.nutrients.sodiumMg ?? 0) * factor;
      sodium += na;
      const grp = r.classify.foodGroup ?? UNCLASSIFIED_GROUP;
      sodiumByGroup.set(grp, (sodiumByGroup.get(grp) ?? 0) + na);
    }
    const giCoverage = weightedLevelStat(rs.map((r) => ({ grams: r.grams, level: r.classify.giLevel })));
    const purinCoverage = weightedLevelStat(
      rs.map((r) => ({ grams: r.grams, level: r.classify.purinLevel }))
    );
    const cholCoverage = weightedLevelStat(
      rs.map((r) => ({ grams: r.grams, level: r.classify.cholesterolLevel }))
    );
    return { meal, kcal, protein, lipid, glucid, fiber, sodium, giCoverage, purinCoverage, cholCoverage, sodiumByGroup };
  });

  // chỉ đáng so sánh khi có từ 2 bữa trở lên
  if (totals.length < 2) return null;

  const maxKcal = Math.max(...totals.map((t) => t.kcal), 1);
  const maxFiber = Math.max(...totals.map((t) => t.fiber), 1);
  const maxProtein = Math.max(...totals.map((t) => t.protein), 1);
  const maxLipid = Math.max(...totals.map((t) => t.lipid), 1);

  // toàn bộ GI luôn null (0% nguồn — xem README-data.md mục 10)
  const giOverallCoverage = weightedLevelStat(
    foodRows.map((r) => ({ grams: r.grams, level: r.classify.giLevel }))
  ).coveragePct;
  const purinOverallCoverage = weightedLevelStat(
    foodRows.map((r) => ({ grams: r.grams, level: r.classify.purinLevel }))
  ).coveragePct;
  const cholOverallCoverage = weightedLevelStat(
    foodRows.map((r) => ({ grams: r.grams, level: r.classify.cholesterolLevel }))
  ).coveragePct;

  // nhóm thực phẩm dùng cho biểu đồ Natri — top-8 theo tổng cả ngày, cố định cho mọi bữa
  const dayGroupTotals = new Map<string, number>();
  for (const t of totals) {
    for (const [g, v] of t.sodiumByGroup) dayGroupTotals.set(g, (dayGroupTotals.get(g) ?? 0) + v);
  }
  const groupBuckets = bucketTopK(
    Array.from(dayGroupTotals.entries())
      .map(([key, value]) => ({ key, value }))
      .filter((e) => e.value > 0),
    8
  );
  const maxSodium = Math.max(...totals.map((t) => t.sodium), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* ===== Năng lượng theo bữa ===== */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-700">Năng lượng theo bữa</h2>
        <p className="mt-0.5 text-xs text-neutral-400">So sánh tổng kcal giữa các bữa trong ngày.</p>

        <div className="mt-3 flex flex-col gap-2">
          {totals.map((t) => (
            <div key={t.meal} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3">
              <div className="truncate text-xs text-neutral-600" title={t.meal}>
                {t.meal}
              </div>
              <div className="h-3 w-full rounded-sm bg-neutral-100">
                <div
                  className="h-full rounded-sm"
                  style={{ width: `${(t.kcal / maxKcal) * 100}%`, backgroundColor: SERIES.energy }}
                />
              </div>
              <div className="shrink-0 text-right text-xs tabular-nums text-neutral-500">
                {round(t.kcal)} kcal
              </div>
            </div>
          ))}
        </div>
        <MealValueTable totals={totals} pick={(t) => t.kcal} label="Năng lượng" unit="kcal" />
      </div>

      {/* ===== Cân đối Đạm : Béo : Bột đường theo bữa ===== */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-700">Cân đối chất theo bữa</h2>
        <p className="mt-0.5 text-xs text-neutral-400">
          Mỗi thanh = 100% khối lượng chất sinh năng lượng của bữa đó (không phải % năng lượng).
        </p>

        {/* legend dùng chung 1 lần */}
        <div className="mt-2 flex gap-4 text-xs text-neutral-500">
          <LegendDot color={SERIES.protein} label="Đạm" />
          <LegendDot color={SERIES.lipid} label="Béo" />
          <LegendDot color={SERIES.glucid} label="Bột đường" />
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {totals.map((t) => {
            const sumG = t.protein + t.lipid + t.glucid;
            const pP = sumG > 0 ? (t.protein / sumG) * 100 : 0;
            const pL = sumG > 0 ? (t.lipid / sumG) * 100 : 0;
            const pG = sumG > 0 ? (t.glucid / sumG) * 100 : 0;
            return (
              <div key={t.meal} className="grid grid-cols-[minmax(0,7rem)_1fr] items-center gap-3">
                <div className="truncate text-xs text-neutral-600" title={t.meal}>
                  {t.meal}
                </div>
                <div>
                  <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-sm">
                    {sumG > 0 ? (
                      <>
                        <div style={{ width: `${pP}%`, backgroundColor: SERIES.protein }} title={`Đạm ${round(pP)}%`} />
                        <div style={{ width: `${pL}%`, backgroundColor: SERIES.lipid }} title={`Béo ${round(pL)}%`} />
                        <div style={{ width: `${pG}%`, backgroundColor: SERIES.glucid }} title={`Bột đường ${round(pG)}%`} />
                      </>
                    ) : (
                      <div className="h-full w-full bg-neutral-100" />
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] tabular-nums text-neutral-400">
                    Đạm {round(t.protein)}g · Béo {round(t.lipid)}g · Bột đường {round(t.glucid)}g
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== Chất xơ theo bữa + GI (nhóm C, 1) ===== */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-700">Chất xơ &amp; chỉ số đường huyết (GI) theo bữa</h2>
        <p className="mt-0.5 text-xs text-neutral-400">Chất xơ tính theo số liệu thật; GI hiển thị riêng bên dưới.</p>
        <div className="mt-3 flex flex-col gap-2">
          {totals.map((t) => (
            <div key={t.meal} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3">
              <div className="truncate text-xs text-neutral-600" title={t.meal}>
                {t.meal}
              </div>
              <div className="h-3 w-full rounded-sm bg-neutral-100">
                <div
                  className="h-full rounded-sm"
                  style={{ width: `${(t.fiber / maxFiber) * 100}%`, backgroundColor: SERIES.fiber }}
                />
              </div>
              <div className="shrink-0 text-right text-xs tabular-nums text-neutral-500">{round(t.fiber)} g</div>
            </div>
          ))}
        </div>
        <MealValueTable totals={totals} pick={(t) => t.fiber} label="Chất xơ" unit="g" />
        <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          GI (chỉ số đường huyết): {round(giOverallCoverage)}% thực phẩm trong khẩu phần có nguồn dữ liệu —
          {giOverallCoverage === 0
            ? " CSDL hiện chưa có nguồn GI cho bất kỳ thực phẩm nào, nên không thể hiển thị."
            : " xem mức GI trung bình từng bữa ở bảng dưới."}
        </div>
        {giOverallCoverage > 0 && (
          <LevelByMealTable totals={totals} pick={(t) => t.giCoverage} label="GI" />
        )}
      </div>

      {/* ===== Purin theo đạm từng bữa (nhóm C, 2) ===== */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-700">Purin theo đạm từng bữa</h2>
        <p className="mt-0.5 text-xs text-neutral-400">
          Đạm tính theo số liệu thật; mức Purin chỉ có ở nguồn RNI (~3,5% thực phẩm).
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {totals.map((t) => (
            <div key={t.meal} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3">
              <div className="truncate text-xs text-neutral-600" title={t.meal}>
                {t.meal}
              </div>
              <div className="h-3 w-full rounded-sm bg-neutral-100">
                <div
                  className="h-full rounded-sm"
                  style={{ width: `${(t.protein / maxProtein) * 100}%`, backgroundColor: SERIES.protein }}
                />
              </div>
              <div className="shrink-0 text-right text-xs tabular-nums text-neutral-500">{round(t.protein)} g</div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Purin: {round(purinOverallCoverage)}% thực phẩm trong khẩu phần có số liệu — mức còn lại hiển thị “–”.
        </div>
        <LevelByMealTable totals={totals} pick={(t) => t.purinCoverage} label="Purin" />
      </div>

      {/* ===== Cholesterol theo béo từng bữa (nhóm C, 3) ===== */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-700">Cholesterol theo chất béo từng bữa</h2>
        <p className="mt-0.5 text-xs text-neutral-400">
          Chất béo tính theo số liệu thật; mức Cholesterol có ở ~30% thực phẩm.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {totals.map((t) => (
            <div key={t.meal} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3">
              <div className="truncate text-xs text-neutral-600" title={t.meal}>
                {t.meal}
              </div>
              <div className="h-3 w-full rounded-sm bg-neutral-100">
                <div
                  className="h-full rounded-sm"
                  style={{ width: `${(t.lipid / maxLipid) * 100}%`, backgroundColor: SERIES.lipid }}
                />
              </div>
              <div className="shrink-0 text-right text-xs tabular-nums text-neutral-500">{round(t.lipid)} g</div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Cholesterol: {round(cholOverallCoverage)}% thực phẩm trong khẩu phần có số liệu — mức còn lại hiển thị “–”.
        </div>
        <LevelByMealTable totals={totals} pick={(t) => t.cholCoverage} label="Cholesterol" />
      </div>

      {/* ===== Natri theo bữa + nhóm thực phẩm (nhóm C, 4) ===== */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-700">Natri theo bữa &amp; nhóm thực phẩm</h2>
        <p className="mt-0.5 text-xs text-neutral-400">
          Khuyến nghị WHO: dưới 2.000 mg natri/ngày (≈ 5g muối). Chỉ ~22% thực phẩm có nhóm phân loại
          — phần còn lại gộp vào “{UNCLASSIFIED_GROUP}”.
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
          {groupBuckets.map((b) => (
            <LegendDot key={b.key} color={bucketColor(b.key, "foodGroup")} label={b.key} />
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {totals.map((t) => (
            <div key={t.meal} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3">
              <div className="truncate text-xs text-neutral-600" title={t.meal}>
                {t.meal}
              </div>
              <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-sm bg-neutral-100">
                {t.sodium > 0 &&
                  groupBuckets.map((b) => {
                    // Khác/Chưa phân nhóm không có giá trị trực tiếp trong t.sodiumByGroup nếu đã bị gộp —
                    // quy lại từ danh sách nhóm gốc của đúng bữa này.
                    const value =
                      b.key === "Khác"
                        ? Array.from(t.sodiumByGroup.entries())
                            .filter(([g]) => !groupBuckets.some((gb) => gb.key === g))
                            .reduce((s, [, v]) => s + v, 0)
                        : t.sodiumByGroup.get(b.key) ?? 0;
                    if (value <= 0) return null;
                    const pct = (value / t.sodium) * 100;
                    return (
                      <div
                        key={b.key}
                        style={{ width: `${pct}%`, backgroundColor: bucketColor(b.key, "foodGroup") }}
                        title={`${b.key}: ${round(value)} mg`}
                      />
                    );
                  })}
              </div>
              <div className="shrink-0 text-right text-xs tabular-nums text-neutral-500">
                {round(t.sodium)} mg
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 text-[11px] text-neutral-400">Thanh dài nhất tương ứng {round(maxSodium)} mg.</div>

        {/* bảng chi tiết: mg natri mỗi nhóm theo từng bữa — khớp số với thanh xếp chồng ở trên */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-neutral-400">
              <tr>
                <th className="py-1 font-medium">Bữa</th>
                {groupBuckets.map((b) => (
                  <th key={b.key} className="py-1 text-right font-medium">
                    {b.key}
                  </th>
                ))}
                <th className="py-1 text-right font-medium">Tổng</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((t) => (
                <tr key={t.meal} className="border-t border-neutral-100">
                  <td className="py-1.5">{t.meal}</td>
                  {groupBuckets.map((b) => {
                    const value =
                      b.key === "Khác"
                        ? Array.from(t.sodiumByGroup.entries())
                            .filter(([g]) => !groupBuckets.some((gb) => gb.key === g))
                            .reduce((s, [, v]) => s + v, 0)
                        : t.sodiumByGroup.get(b.key) ?? 0;
                    return (
                      <td key={b.key} className="py-1.5 text-right tabular-nums text-neutral-500">
                        {value > 0 ? round(value) : "–"}
                      </td>
                    );
                  })}
                  <td className="py-1.5 text-right font-medium tabular-nums">{round(t.sodium)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MealValueTable({
  totals,
  pick,
  label,
  unit,
}: {
  totals: MealTotal[];
  pick: (t: MealTotal) => number;
  label: string;
  unit: string;
}) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-neutral-400">
          <tr>
            <th className="py-1 font-medium">Bữa</th>
            <th className="py-1 text-right font-medium">
              {label} ({unit})
            </th>
          </tr>
        </thead>
        <tbody>
          {totals.map((t) => (
            <tr key={t.meal} className="border-t border-neutral-100">
              <td className="py-1.5">{t.meal}</td>
              <td className="py-1.5 text-right tabular-nums text-neutral-600">{round(pick(t))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LevelByMealTable({
  totals,
  pick,
  label,
}: {
  totals: MealTotal[];
  pick: (t: MealTotal) => { avg: number | null; coveragePct: number };
  label: string;
}) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-neutral-400">
          <tr>
            <th className="py-1 font-medium">Bữa</th>
            <th className="py-1 text-right font-medium">Mức {label} TB</th>
            <th className="py-1 text-right font-medium">% có số liệu</th>
          </tr>
        </thead>
        <tbody>
          {totals.map((t) => {
            const { avg, coveragePct } = pick(t);
            const level = avg === null ? null : (Math.round(avg) as 0 | 1 | 2 | 3);
            return (
              <tr key={t.meal} className="border-t border-neutral-100">
                <td className="py-1.5">{t.meal}</td>
                <td className="py-1.5 text-right">
                  {level === null ? (
                    <span className="text-neutral-400">–</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: LEVEL_COLORS[level] }}
                      />
                      {LEVEL_LABELS[level]} ({round(avg!, 1)})
                    </span>
                  )}
                </td>
                <td className="py-1.5 text-right tabular-nums text-neutral-500">{round(coveragePct)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
