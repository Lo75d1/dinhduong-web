"use client";

// Biểu đồ tăng trưởng WHO (cân nặng/chiều cao theo tuổi) — SVG thuần, không phụ thuộc thư viện.
// Palette đã validate CVD-safe: xanh dương=trẻ đang đánh giá, xanh lá=trung bình,
// vàng=±2SD, đỏ=±3SD. Vàng dưới 3:1 contrast -> luôn có nhãn/bảng đi kèm (relief-rule).

export type GrowthRow = {
  ageMonths: number;
  weightM3sd: number | null;
  weightM2sd: number | null;
  weightAvg: number | null;
  weightP2sd: number | null;
  weightP3sd: number | null;
  heightM3sd: number | null;
  heightM2sd: number | null;
  heightAvg: number | null;
  heightP2sd: number | null;
  heightP3sd: number | null;
};

const COLOR = {
  avg: "#008300",
  sd2: "#eda100",
  sd3: "#e34948",
  child: "#2a78d6",
};

const W = 640;
const H = 300;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 32;

function round(n: number, d = 1) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}

export default function GrowthChart({
  rows,
  ageMonths,
  value,
  type,
  title,
  unit,
}: {
  rows: GrowthRow[];
  ageMonths: number;
  value: number;
  type: "weight" | "height";
  title: string;
  unit: string;
}) {
  const sorted = [...rows].sort((a, b) => a.ageMonths - b.ageMonths);
  if (sorted.length < 2) return null;

  const key = (suffix: string) => `${type}${suffix}` as keyof GrowthRow;
  const series = {
    m3: sorted.map((r) => r[key("M3sd")] as number | null),
    m2: sorted.map((r) => r[key("M2sd")] as number | null),
    avg: sorted.map((r) => r[key("Avg")] as number | null),
    p2: sorted.map((r) => r[key("P2sd")] as number | null),
    p3: sorted.map((r) => r[key("P3sd")] as number | null),
  };
  const xs = sorted.map((r) => r.ageMonths);

  const allY = [...series.m3, ...series.p3].filter((v): v is number => v !== null);
  const yMin = Math.min(...allY, value) * 0.95;
  const yMax = Math.max(...allY, value) * 1.05;
  const xMin = Math.min(...xs, ageMonths);
  const xMax = Math.max(...xs, ageMonths);

  const xScale = (x: number) => PAD_L + ((x - xMin) / (xMax - xMin || 1)) * (W - PAD_L - PAD_R);
  const yScale = (y: number) => H - PAD_B - ((y - yMin) / (yMax - yMin || 1)) * (H - PAD_T - PAD_B);

  function pathFor(vals: (number | null)[]): string {
    const pts = vals
      .map((v, i) => (v === null ? null : `${xScale(xs[i])},${yScale(v)}`))
      .filter((p): p is string => p !== null);
    return pts.length ? "M" + pts.join(" L") : "";
  }

  // dòng gần nhất với tuổi hiện tại (để tra bảng đối chiếu)
  const nearest = sorted.reduce((best, r) =>
    Math.abs(r.ageMonths - ageMonths) < Math.abs(best.ageMonths - ageMonths) ? r : best
  );
  const m3 = nearest[key("M3sd")] as number;
  const m2 = nearest[key("M2sd")] as number;
  const avg = nearest[key("Avg")] as number;
  const p2 = nearest[key("P2sd")] as number;
  const p3 = nearest[key("P3sd")] as number;

  const yTicks = 5;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / yTicks);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-700">{title} · mốc tham khảo</h2>
      <p className="mt-0.5 text-xs text-neutral-400">
        Chấm xanh dương là chỉ số hiện tại của trẻ ({round(ageMonths)} tháng tuổi, {round(value)} {unit}).
      </p>

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-500">
        <LegendLine color={COLOR.sd3} label="±3SD" dashed />
        <LegendLine color={COLOR.sd2} label="±2SD" />
        <LegendLine color={COLOR.avg} label="Trung bình" thick />
        <LegendDot color={COLOR.child} label="Trẻ đang đánh giá" />
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={title}>
        {/* gridlines + y labels */}
        {yTickVals.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={yScale(v)}
              y2={yScale(v)}
              stroke="#e1e0d9"
              strokeWidth={1}
            />
            <text x={PAD_L - 6} y={yScale(v) + 3} textAnchor="end" fontSize={10} fill="#898781">
              {round(v)}
            </text>
          </g>
        ))}
        {/* x labels (năm tuổi) */}
        {sorted
          .filter((_, i) => i % 2 === 0)
          .map((r) => (
            <text
              key={r.ageMonths}
              x={xScale(r.ageMonths)}
              y={H - PAD_B + 16}
              textAnchor="middle"
              fontSize={10}
              fill="#898781"
            >
              {Math.round(r.ageMonths / 12)}t
            </text>
          ))}

        <path d={pathFor(series.p3)} fill="none" stroke={COLOR.sd3} strokeWidth={2} strokeDasharray="5,4" strokeLinecap="round" />
        <path d={pathFor(series.p2)} fill="none" stroke={COLOR.sd2} strokeWidth={2} strokeLinecap="round" />
        <path d={pathFor(series.avg)} fill="none" stroke={COLOR.avg} strokeWidth={3} strokeLinecap="round" />
        <path d={pathFor(series.m2)} fill="none" stroke={COLOR.sd2} strokeWidth={2} strokeLinecap="round" />
        <path d={pathFor(series.m3)} fill="none" stroke={COLOR.sd3} strokeWidth={2} strokeDasharray="5,4" strokeLinecap="round" />

        <circle cx={xScale(ageMonths)} cy={yScale(value)} r={6} fill={COLOR.child} stroke="#fff" strokeWidth={2} />
      </svg>

      <div className="mt-3 rounded-md border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-neutral-900">
        Dữ liệu hiện chỉ có mốc thưa theo năm/nửa năm. Biểu đồ cho biết vị trí tương đối với mốc gần nhất, không tính Z-score và không đưa ra kết luận tình trạng dinh dưỡng.
      </div>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-neutral-400">
            <tr>
              <th className="py-1 pr-3 font-medium">Mốc gần nhất</th>
              <th className="py-1 pr-3 text-right font-medium">-3SD</th>
              <th className="py-1 pr-3 text-right font-medium">-2SD</th>
              <th className="py-1 pr-3 text-right font-medium">TB</th>
              <th className="py-1 pr-3 text-right font-medium">+2SD</th>
              <th className="py-1 text-right font-medium">+3SD</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-neutral-100">
              <td className="py-1 pr-3 text-neutral-500">{Math.round(nearest.ageMonths / 12)} tuổi</td>
              <td className="py-1 pr-3 text-right tabular-nums">{round(m3)}</td>
              <td className="py-1 pr-3 text-right tabular-nums">{round(m2)}</td>
              <td className="py-1 pr-3 text-right tabular-nums font-medium">{round(avg)}</td>
              <td className="py-1 pr-3 text-right tabular-nums">{round(p2)}</td>
              <td className="py-1 text-right tabular-nums">{round(p3)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-neutral-400">
        Mốc theo năm/nửa năm (không phải bộ WHO LMS đầy đủ theo tháng/ngày tuổi) — chỉ mang tính tham
        khảo, không thay thế đánh giá lâm sàng. Cần bổ sung bộ WHO đầy đủ trước khi dùng để phân loại trẻ.
      </p>
    </div>
  );
}

function LegendLine({ color, label, dashed, thick }: { color: string; label: string; dashed?: boolean; thick?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="16" height="8">
        <line
          x1="0"
          y1="4"
          x2="16"
          y2="4"
          stroke={color}
          strokeWidth={thick ? 3 : 2}
          strokeDasharray={dashed ? "4,3" : undefined}
        />
      </svg>
      {label}
    </span>
  );
}
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
