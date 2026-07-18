"use client";

import { lmsZScore, nearestStandard, type WhoGrowthEntry, type WhoIndicator } from "@/lib/who-growth";

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

type Assessment = { label: string; value: number; unit: string; indicator: WhoIndicator; score: number; source: string; status: string };

type CurveSpec = { indicator: Extract<WhoIndicator, "wfa" | "lhfa" | "bfa">; title: string; unit: string; value: number };

const curveLabels = ["−3 SD", "−2 SD", "Trung vị", "+2 SD", "+3 SD"] as const;
const curveZ = [-3, -2, 0, 2, 3] as const;
const curveColors = ["#b42318", "#d97706", "#0f4c45", "#d97706", "#b42318"] as const;

function valueAtZ(entry: Pick<WhoGrowthEntry, "l" | "m" | "s">, z: number) {
  if (!(entry.m > 0) || !(entry.s > 0)) return null;
  const value = entry.l === 0 ? entry.m * Math.exp(entry.s * z) : entry.m * Math.pow(1 + entry.l * entry.s * z, 1 / entry.l);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function formatAxis(value: number) {
  return value >= 10 ? Math.round(value).toString() : value.toFixed(1);
}

function GrowthCurveChart({ entries, spec, ageMonths }: { entries: WhoGrowthEntry[]; spec: CurveSpec; ageMonths: number }) {
  const standards = entries
    .filter((entry) => entry.indicator === spec.indicator && entry.coordinate === "ageMonths")
    .sort((a, b) => a.x - b.x);
  if (standards.length < 2) return null;

  const xMin = standards[0].x;
  const xMax = standards[standards.length - 1].x;
  const allValues = standards.flatMap((entry) => curveZ.map((z) => valueAtZ(entry, z)).filter((value): value is number => value !== null));
  const yMinRaw = Math.min(...allValues);
  const yMaxRaw = Math.max(...allValues);
  const yPadding = Math.max((yMaxRaw - yMinRaw) * 0.07, 0.4);
  const yMin = Math.max(0, yMinRaw - yPadding);
  const yMax = yMaxRaw + yPadding;
  const width = 620;
  const height = 330;
  const margin = { top: 24, right: 18, bottom: 46, left: 50 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const x = (value: number) => margin.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
  const y = (value: number) => margin.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight;
  const xTicks = Array.from(new Set([xMin, Math.round((xMin + xMax) / 2), xMax]));
  const yTicks = Array.from({ length: 5 }, (_, index) => yMin + ((yMax - yMin) * index) / 4);
  const observedStandard = nearestStandard(standards, ageMonths);
  const showObserved = ageMonths >= xMin && ageMonths <= xMax && observedStandard !== null;

  return <article className="rounded-md border border-[#9fb9b1] bg-[#fcfffd] p-3">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="font-semibold text-neutral-950">{spec.title}</h3>
      <p className="text-xs text-neutral-800">Điểm hiện tại: <b>{round(spec.value)} {spec.unit}</b> · {round(ageMonths)} tháng</p>
    </div>
    <div className="mt-2 overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[570px] w-full" role="img" aria-label={`Biểu đồ ${spec.title} theo chuẩn WHO LMS`}>
        <rect x={margin.left} y={margin.top} width={plotWidth} height={plotHeight} fill="#ffffff" stroke="#9fb9b1" />
        {yTicks.map((tick) => <g key={tick}>
          <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} stroke="#d7e2de" strokeDasharray="3 3" />
          <text x={margin.left - 7} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#243a35">{formatAxis(tick)}</text>
        </g>)}
        {xTicks.map((tick) => <g key={tick}>
          <line x1={x(tick)} x2={x(tick)} y1={margin.top} y2={height - margin.bottom} stroke="#e5ece9" />
          <text x={x(tick)} y={height - margin.bottom + 18} textAnchor="middle" fontSize="11" fill="#243a35">{tick}</text>
        </g>)}
        {curveZ.map((z, index) => {
          const points = standards.map((entry) => {
            const value = valueAtZ(entry, z);
            return value === null ? null : `${x(entry.x)},${y(value)}`;
          }).filter((point): point is string => point !== null).join(" ");
          return <polyline key={z} points={points} fill="none" stroke={curveColors[index]} strokeWidth={z === 0 ? 2.4 : 1.45} />;
        })}
        {showObserved && <g>
          <line x1={x(ageMonths)} x2={x(ageMonths)} y1={margin.top} y2={height - margin.bottom} stroke="#166534" strokeWidth="1.4" strokeDasharray="4 3" />
          <circle cx={x(ageMonths)} cy={y(spec.value)} r="5" fill="#14532d" stroke="#ffffff" strokeWidth="2" />
        </g>}
        <text x={margin.left} y="13" fontSize="11" fill="#243a35">{spec.unit}</text>
        <text x={margin.left + plotWidth / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="#243a35">Tuổi (tháng)</text>
      </svg>
    </div>
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-800">
      {curveLabels.map((label, index) => <span key={label} className="inline-flex items-center gap-1"><i className="h-2 w-4" style={{ backgroundColor: curveColors[index] }} />{label}</span>)}
      <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#14532d]" />Điểm đo hiện tại</span>
    </div>
  </article>;
}

function classify(indicator: WhoIndicator, score: number, ageMonths: number) {
  if (indicator === "lhfa") return score < -3 ? "Thấp còi nặng" : score < -2 ? "Thấp còi" : "Trong dải tham khảo";
  if (indicator === "wfa") return score < -3 ? "Nhẹ cân nặng" : score < -2 ? "Nhẹ cân" : "Trong dải tham khảo";
  const overweightCutoff = ageMonths <= 60 ? 2 : 1;
  const obesityCutoff = ageMonths <= 60 ? 3 : 2;
  return score < -3 ? "Gầy còm nặng" : score < -2 ? "Gầy còm" : score > obesityCutoff ? "Béo phì" : score > overweightCutoff ? "Thừa cân" : ageMonths <= 60 && score > 1 ? "Nguy cơ thừa cân" : "Trong dải tham khảo";
}

function tone(status: string) {
  return status === "Trong dải tham khảo" ? "border-emerald-700 bg-emerald-50" : status.includes("nguy cơ") ? "border-amber-600 bg-amber-50" : "border-rose-700 bg-rose-50";
}

export default function WhoGrowthAssessment({ entries, ageMonths, weightKg, heightCm }: { entries: WhoGrowthEntry[]; ageMonths: number; weightKg: number; heightCm: number }) {
  function assess(indicator: WhoIndicator, coordinate: number, value: number, label: string, unit: string): Assessment | null {
    const standards = entries.filter((entry) => entry.indicator === indicator);
    const standard = nearestStandard(standards, coordinate);
    if (!standard) return null;
    const score = lmsZScore(value, standard);
    if (score === null) return null;
    return { label, value, unit, indicator, score, source: standard.source, status: classify(indicator, score, ageMonths) };
  }

  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  const items = [
    ageMonths <= 120 ? assess("wfa", ageMonths, weightKg, "Cân nặng theo tuổi", "kg") : null,
    ageMonths <= 228 ? assess("lhfa", ageMonths, heightCm, "Chiều cao theo tuổi", "cm") : null,
    assess("bfa", ageMonths, bmi, "BMI theo tuổi", "kg/m²"),
    ageMonths <= 60 ? assess(ageMonths < 24 ? "wfl" : "wfh", heightCm, weightKg, ageMonths < 24 ? "Cân nặng theo chiều dài" : "Cân nặng theo chiều cao", "kg") : null,
  ].filter((item): item is Assessment => item !== null);

  const charts: CurveSpec[] = [
    ageMonths <= 120 ? { indicator: "wfa", title: "Cân nặng theo tuổi", unit: "kg", value: weightKg } : null,
    ageMonths <= 228 ? { indicator: "lhfa", title: "Chiều cao theo tuổi", unit: "cm", value: heightCm } : null,
    ageMonths <= 228 ? { indicator: "bfa", title: "BMI theo tuổi", unit: "kg/m²", value: bmi } : null,
  ].filter((item): item is CurveSpec => item !== null);

  if (!items.length) return <p className="rounded-md border border-amber-600 bg-amber-50 p-3 text-sm text-neutral-950">Chưa có chuẩn WHO phù hợp với tuổi hoặc chỉ số đã nhập.</p>;

  return <section className="rounded-lg border-2 border-[#123c36] bg-white p-4" aria-label="Đánh giá tăng trưởng WHO bằng Z-score">
    <div className="border-b-2 border-[#123c36] pb-3"><p className="text-xs font-semibold tracking-[0.14em] text-[#123c36]">TĂNG TRƯỞNG TRẺ EM · WHO LMS</p><h2 className="mt-1 text-xl font-semibold text-neutral-950">Đối chiếu Z-score</h2><p className="mt-1 text-sm text-neutral-900">Tính từ L/M/S của chuẩn WHO theo giới và tuổi đã nhập. Kết quả hỗ trợ sàng lọc, không thay thế khám và đánh giá lâm sàng.</p></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{items.map((item) => <article key={item.label} className={`border-l-4 p-3 ${tone(item.status)}`}><p className="text-sm font-semibold text-neutral-950">{item.label}</p><p className="mt-1 text-sm text-neutral-900">{round(item.value)} {item.unit}</p><p className="mt-2 text-2xl font-semibold text-neutral-950">Z {round(item.score)}</p><p className="mt-1 text-sm font-semibold text-neutral-950">{item.status}</p></article>)}</div>
    {charts.length > 0 && <div className="mt-5 border-t border-[#9fb9b1] pt-4">
      <h3 className="text-base font-semibold text-neutral-950">Biểu đồ tăng trưởng WHO</h3>
      <p className="mt-1 text-sm text-neutral-900">Các đường cong −3 đến +3 SD và điểm đo hiện tại được dựng từ bộ thông số LMS theo giới và tuổi đang chọn.</p>
      <div className="mt-3 grid gap-4 xl:grid-cols-2">{charts.map((chart) => <GrowthCurveChart key={chart.indicator} entries={entries} spec={chart} ageMonths={ageMonths} />)}</div>
    </div>}
    <div className="mt-4 overflow-x-auto"><table className="min-w-[680px] w-full text-sm"><thead className="border-y border-neutral-300 bg-[#e7efeb] text-left"><tr><th className="px-3 py-2">Chỉ số</th><th className="px-3 py-2 text-right">Thực tế</th><th className="px-3 py-2 text-right">Z-score</th><th className="px-3 py-2">Diễn giải sàng lọc</th><th className="px-3 py-2">Nguồn</th></tr></thead><tbody>{items.map((item) => <tr key={item.label} className="border-b border-neutral-200"><td className="px-3 py-2 font-medium">{item.label}</td><td className="px-3 py-2 text-right">{round(item.value)} {item.unit}</td><td className="px-3 py-2 text-right font-semibold">{round(item.score)}</td><td className="px-3 py-2">{item.status}</td><td className="px-3 py-2 text-xs">{item.source}</td></tr>)}</tbody></table></div>
    <p className="mt-3 text-xs text-neutral-800">0–5 tuổi dùng WHO Child Growth Standards 2006. Từ 5–19 tuổi dùng WHO Growth Reference 2007 cho BMI và chiều cao; cân nặng-theo-tuổi chỉ dùng đến 10 tuổi theo phạm vi WHO. Tuổi đang nhập theo tháng nên Z-score là ước tính theo mốc tháng gần nhất; trẻ sinh non hoặc có bệnh lý cần dùng quy trình chuyên môn riêng.</p>
  </section>;
}
