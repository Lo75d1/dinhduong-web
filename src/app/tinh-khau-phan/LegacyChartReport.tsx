"use client";

import { useMemo } from "react";
import { bucketColor, bucketTopK, guessLipidOrigin, UNCLASSIFIED_GROUP, UNCLASSIFIED_ORIGIN } from "@/lib/food-classify";
import type { Row } from "./types";

type Point = { label: string; value: number; color?: string };
type StackedPoint = { label: string; parts: Point[] };
const COLORS = ["#1f5f55", "#2a78d6", "#d58b16", "#8b3a62", "#6b7280", "#4b7b3c"];
const round = (value: number) => Math.round(value * 10) / 10;
const short = (value: string, length = 14) => value.length > length ? `${value.slice(0, length - 1)}…` : value;

function niceMax(value: number) {
  if (value <= 0) return 1;
  const exponent = Math.pow(10, Math.floor(Math.log10(value)));
  const fraction = value / exponent;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * exponent;
}

function AxisColumnChart({ data, unit, maxValue }: { data: Point[]; unit: string; maxValue?: number }) {
  if (!data.length || !data.some((item) => item.value > 0)) return <p className="py-8 text-center text-sm text-neutral-700">Chưa có số liệu để vẽ biểu đồ.</p>;
  const max = maxValue ?? niceMax(Math.max(...data.map((item) => item.value)));
  const width = 860, height = 330, left = 68, right = 20, top = 20, bottom = 82;
  const plotW = width - left - right, plotH = height - top - bottom, step = plotW / data.length, barW = Math.min(62, step * 0.58);
  const ticks = Array.from({ length: 6 }, (_, index) => max * index / 5);
  return <div className="overflow-x-auto"><svg viewBox={`0 0 ${width} ${height}`} className="min-w-[680px] w-full" role="img" aria-label={`Biểu đồ cột, đơn vị ${unit}`}>
    {ticks.map((tick) => { const y = top + plotH - tick / max * plotH; return <g key={tick}><line x1={left} x2={width - right} y1={y} y2={y} stroke="#cbd5d1" strokeWidth="1" /><text x={left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#1f2937">{round(tick)}</text></g>; })}
    <line x1={left} x2={left} y1={top} y2={top + plotH} stroke="#334155" strokeWidth="1.5" /><line x1={left} x2={width - right} y1={top + plotH} y2={top + plotH} stroke="#334155" strokeWidth="1.5" />
    <text x={left} y={12} fontSize="13" fontWeight="600" fill="#1f2937">{unit}</text>
    {data.map((item, index) => { const x = left + index * step + (step - barW) / 2, barH = item.value / max * plotH, y = top + plotH - barH; return <g key={item.label}>{item.value > 0 && <rect x={x} y={y} width={barW} height={barH} fill={item.color ?? COLORS[index % COLORS.length]} />}<text x={x + barW / 2} y={item.value > 0 ? Math.max(top + 12, y - 7) : top + plotH - 7} textAnchor="middle" fontSize="12" fontWeight="600" fill="#111827">{round(item.value)}</text><text x={x + barW / 2} y={top + plotH + 20} textAnchor="end" transform={`rotate(-32 ${x + barW / 2} ${top + plotH + 20})`} fontSize="12" fill="#1f2937">{short(item.label)}</text></g>; })}
  </svg></div>;
}

function StackedColumnChart({ data }: { data: StackedPoint[] }) {
  if (!data.length || !data.some((item) => item.parts.some((part) => part.value > 0))) return <p className="py-8 text-center text-sm text-neutral-700">Chưa có số liệu để vẽ biểu đồ.</p>;
  const totals = data.map((item) => item.parts.reduce((sum, part) => sum + Math.max(0, part.value), 0));
  const max = niceMax(Math.max(...totals)), width = 860, height = 350, left = 68, right = 20, top = 28, bottom = 88;
  const plotW = width - left - right, plotH = height - top - bottom, step = plotW / data.length, barW = Math.min(70, step * 0.62), ticks = Array.from({ length: 6 }, (_, index) => max * index / 5);
  return <div className="overflow-x-auto"><div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-900">{["Đạm", "Béo", "Bột đường"].map((label, index) => <span key={label}><i className="mr-1 inline-block h-3 w-3 align-[-1px]" style={{ backgroundColor: COLORS[index + 1] }} />{label}</span>)}</div><svg viewBox={`0 0 ${width} ${height}`} className="min-w-[680px] w-full" role="img" aria-label="Biểu đồ cột chồng năng lượng và P L G theo bữa">
    {ticks.map((tick) => { const y = top + plotH - tick / max * plotH; return <g key={tick}><line x1={left} x2={width - right} y1={y} y2={y} stroke="#cbd5d1" /><text x={left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#1f2937">{round(tick)}</text></g>; })}
    <line x1={left} x2={left} y1={top} y2={top + plotH} stroke="#334155" strokeWidth="1.5" /><line x1={left} x2={width - right} y1={top + plotH} y2={top + plotH} stroke="#334155" strokeWidth="1.5" /><text x={left} y={14} fontSize="13" fontWeight="600" fill="#1f2937">kcal (Atwater)</text>
    {data.map((item, index) => { const x = left + index * step + (step - barW) / 2; let accumulated = 0; return <g key={item.label}>{item.parts.map((part, partIndex) => { const h = Math.max(0, part.value) / max * plotH, y = top + plotH - accumulated / max * plotH - h; accumulated += Math.max(0, part.value); return h > 0 ? <rect key={part.label} x={x} y={y} width={barW} height={h} fill={part.color ?? COLORS[partIndex + 1]} /> : null; })}<text x={x + barW / 2} y={accumulated > 0 ? Math.max(top + 12, top + plotH - accumulated / max * plotH - 7) : top + plotH - 7} textAnchor="middle" fontSize="12" fontWeight="600">{round(accumulated)}</text><text x={x + barW / 2} y={top + plotH + 22} textAnchor="middle" fontSize="12" fill="#1f2937">{short(item.label)}</text></g>; })}
  </svg></div>;
}

function PieReport({ data, unit, note }: { data: Point[]; unit: string; note: string }) {
  const visible = data.filter((item) => item.value > 0), total = visible.reduce((sum, item) => sum + item.value, 0);
  if (!total) return <p className="py-8 text-center text-sm text-neutral-700">Chưa có số liệu để vẽ biểu đồ.</p>;
  const slices = visible.map((item, index) => { const start = visible.slice(0, index).reduce((sum, previous) => sum + previous.value / total * 100, 0), end = start + item.value / total * 100; return `${item.color ?? COLORS[index % COLORS.length]} ${start}% ${end}%`; });
  return <div className="grid items-center gap-5 lg:grid-cols-[minmax(260px,0.8fr)_minmax(380px,1.2fr)]"><div className="border-r-0 border-[#aeb8b4] pr-0 lg:border-r-2 lg:pr-5"><div className="flex justify-center"><div className="h-56 w-56 rounded-full" style={{ background: `conic-gradient(${slices.join(",")})` }} role="img" aria-label={`Biểu đồ tròn ${unit}`} /></div><p className="mt-3 text-center text-sm text-neutral-800">{note}</p><div className="mt-3 grid gap-1 text-xs text-neutral-900">{visible.map((item, index) => <div key={item.label} className="flex items-center justify-between gap-3"><span><i className="mr-2 inline-block h-3 w-3 align-[-1px]" style={{ backgroundColor: item.color ?? COLORS[index % COLORS.length] }} />{item.label}</span><span className="font-semibold">{round(item.value / total * 100)}%</span></div>)}</div></div><DataTable data={visible} unit={unit} /></div>;
}

function DataTable({ data, unit }: { data: Point[]; unit: string }) {
  return <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[#e8efeb] text-left"><tr><th className="px-3 py-2">Thành phần</th><th className="px-3 py-2 text-right">{unit}</th></tr></thead><tbody>{data.map((item, index) => <tr key={item.label}><td className="px-3 py-2"><i className="mr-2 inline-block h-3 w-3 align-[-1px]" style={{ backgroundColor: item.color ?? COLORS[index % COLORS.length] }} />{item.label}</td><td className="px-3 py-2 text-right tabular-nums">{round(item.value)}</td></tr>)}</tbody></table></div>;
}

function Card({ number, title, note, children }: { number: number; title: string; note: string; children: React.ReactNode }) {
  return <section className="rounded-lg border-2 border-[#aeb8b4] bg-white p-5"><h2 className="text-lg font-semibold text-neutral-950">{number}. {title}</h2><p className="mt-1 text-neutral-800">{note}</p><div className="mt-4">{children}</div></section>;
}

export default function LegacyChartReport({ rows }: { rows: Row[] }) {
  const report = useMemo(() => {
    const meals = new Map<string, { energy: number; protein: number; lipid: number; glucid: number; fiber: number; sodium: number; purinLevel: number; purinWeight: number; cholLevel: number; cholWeight: number }>();
    const proteinOrigin = new Map<string, number>(), lipidOrigin = new Map<string, number>(), foodGroup = new Map<string, number>();
    for (const row of rows) {
      if (!row.foodId) continue;
      const factor = row.grams / 100, meal = row.meal || "Chưa phân bữa", current = meals.get(meal) ?? { energy: 0, protein: 0, lipid: 0, glucid: 0, fiber: 0, sodium: 0, purinLevel: 0, purinWeight: 0, cholLevel: 0, cholWeight: 0 };
      const energy = (row.nutrients.energyKcal ?? 0) * factor, protein = (row.nutrients.proteinG ?? 0) * factor, lipid = (row.nutrients.lipidG ?? 0) * factor;
      current.energy += energy; current.protein += protein; current.lipid += lipid; current.glucid += (row.nutrients.glucidG ?? 0) * factor; current.fiber += (row.nutrients.fiberG ?? 0) * factor; current.sodium += (row.nutrients.sodiumMg ?? 0) * factor;
      if (row.classify.purinLevel !== null) { current.purinLevel += row.classify.purinLevel * protein; current.purinWeight += protein; }
      if (row.classify.cholesterolLevel !== null) { current.cholLevel += row.classify.cholesterolLevel * lipid; current.cholWeight += lipid; }
      meals.set(meal, current);
      const group = row.classify.foodGroup ?? UNCLASSIFIED_GROUP, proteinSource = row.classify.proteinOrigin ?? UNCLASSIFIED_ORIGIN, lipidSource = guessLipidOrigin(row.foodName, row.classify.foodGroup);
      foodGroup.set(group, (foodGroup.get(group) ?? 0) + row.grams); proteinOrigin.set(proteinSource, (proteinOrigin.get(proteinSource) ?? 0) + protein); lipidOrigin.set(lipidSource, (lipidOrigin.get(lipidSource) ?? 0) + lipid);
    }
    return { meals: [...meals.entries()].map(([label, value]) => ({ label, ...value })), proteinOrigin, lipidOrigin, foodGroup };
  }, [rows]);
  if (!report.meals.length) return null;
  const macroEnergy = report.meals.reduce((sum, meal) => ({ protein: sum.protein + meal.protein * 4, lipid: sum.lipid + meal.lipid * 9, glucid: sum.glucid + meal.glucid * 4 }), { protein: 0, lipid: 0, glucid: 0 });
  const mapPoints = (map: Map<string, number>, kind: "foodGroup" | "proteinOrigin" | "lipidOrigin") => bucketTopK([...map.entries()].map(([key, value]) => ({ key, value })), 7).map((item) => ({ label: item.key, value: item.value, color: bucketColor(item.key, kind) }));
  const mealEnergy = report.meals.map((meal, index) => ({ label: meal.label, value: meal.energy, color: COLORS[index % COLORS.length] }));
  const fiber = report.meals.map((meal) => ({ label: meal.label, value: meal.fiber, color: COLORS[4] }));
  const purin = report.meals.map((meal) => ({ label: meal.label, value: meal.purinWeight ? meal.purinLevel / meal.purinWeight : 0, color: "#d58b16" }));
  const cholesterol = report.meals.map((meal) => ({ label: meal.label, value: meal.cholWeight ? meal.cholLevel / meal.cholWeight : 0, color: "#8b3a62" }));
  const sodium = report.meals.map((meal) => ({ label: meal.label, value: meal.sodium, color: COLORS[3] }));
  const macroPoints = [{ label: "Đạm", value: macroEnergy.protein, color: COLORS[1] }, { label: "Béo", value: macroEnergy.lipid, color: COLORS[2] }, { label: "Bột đường", value: macroEnergy.glucid, color: COLORS[3] }];
  const proteinPoints = mapPoints(report.proteinOrigin, "proteinOrigin"), lipidPoints = mapPoints(report.lipidOrigin, "lipidOrigin"), groupPoints = mapPoints(report.foodGroup, "foodGroup");
  return <section className="flex flex-col gap-5" aria-label="Biểu đồ phân tích khẩu phần"><div className="border-b-2 border-[#123c36] pb-3"><p className="text-xs font-semibold tracking-[0.14em] text-[#123c36]">BÁO CÁO ĐỒ THỊ</p><h2 className="mt-1 text-2xl font-semibold text-neutral-950">Biểu đồ phân tích khẩu phần</h2><p className="mt-1 text-neutral-800">Biểu đồ cột có trục tung, vạch chia và đơn vị; bảng số liệu được đặt bên dưới để dễ đọc trong báo cáo lâm sàng.</p></div>
    <Card number={1} title="Năng lượng & P/L/G theo bữa" note="Cột chồng thể hiện năng lượng từ đạm, béo và bột đường theo hệ số Atwater."><StackedColumnChart data={report.meals.map((meal) => ({ label: meal.label, parts: [{ label: "Đạm", value: meal.protein * 4, color: COLORS[1] }, { label: "Béo", value: meal.lipid * 9, color: COLORS[2] }, { label: "Bột đường", value: meal.glucid * 4, color: COLORS[3] }] }))} /><DataTable unit="kcal" data={mealEnergy} /></Card>
    <Card number={2} title="Chỉ số đường huyết & chất xơ theo bữa" note="CSDL hiện chưa có nguồn GI đủ dùng; biểu đồ chỉ thể hiện chất xơ thực đo."><AxisColumnChart data={fiber} unit="g chất xơ" /><DataTable data={fiber} unit="g" /></Card>
    <Card number={3} title="Mức Purin theo bữa" note="Mức Purin trung bình có trọng số theo lượng đạm; thang phân loại từ 0 đến 3. Cột bằng 0 có thể là chưa có dữ liệu phân loại."><AxisColumnChart data={purin} unit="mức (0–3)" maxValue={3} /><DataTable data={purin} unit="mức" /></Card>
    <Card number={4} title="Mức Cholesterol theo bữa" note="Mức Cholesterol trung bình có trọng số theo lipid; thang phân loại từ 0 đến 3. Cột bằng 0 có thể là chưa có dữ liệu phân loại."><AxisColumnChart data={cholesterol} unit="mức (0–3)" maxValue={3} /><DataTable data={cholesterol} unit="mức" /></Card>
    <Card number={5} title="Natri theo bữa" note="Tổng natri từng bữa; đối chiếu lâm sàng cần xem tổng ngày và nguồn thực phẩm."><AxisColumnChart data={sodium} unit="mg natri" /><DataTable data={sodium} unit="mg" /></Card>
    <Card number={6} title="Tỷ lệ năng lượng P/L/G" note="Năng lượng từ ba chất sinh năng lượng theo hệ số Atwater: đạm 4, béo 9, bột đường 4 kcal/g."><PieReport data={macroPoints} unit="kcal" note="Tỷ trọng năng lượng của từng chất sinh năng lượng trong toàn khẩu phần." /></Card>
    <Card number={7} title="Phân bổ năng lượng giữa các bữa" note="So sánh năng lượng thực tế giữa các bữa trong ngày."><PieReport data={mealEnergy} unit="kcal" note="Tỷ trọng năng lượng từng bữa trong tổng năng lượng của ngày." /></Card>
    <Card number={8} title="Nguồn gốc Protein" note="Phần chưa phân loại được giữ riêng, không suy đoán."><PieReport data={proteinPoints} unit="g đạm" note="Cơ cấu đạm theo nguồn gốc phân loại hiện có trong dữ liệu." /></Card>
    <Card number={9} title="Nguồn gốc Lipid" note="Ước lượng theo tên và nhóm thực phẩm; không phải số đo gốc."><PieReport data={lipidPoints} unit="g béo" note="Cơ cấu lipid là ước lượng phục vụ xem xét khẩu phần." /></Card>
    <Card number={10} title="Nhóm thực phẩm theo khối lượng" note="Phần chưa phân nhóm được giữ riêng để kiểm tra dữ liệu."><PieReport data={groupPoints} unit="g" note="Khối lượng thực phẩm được gom theo nhóm phân loại hiện có." /></Card>
  </section>;
}
