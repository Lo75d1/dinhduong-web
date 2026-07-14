"use client";

import { lmsZScore, nearestStandard, type WhoGrowthEntry, type WhoIndicator } from "@/lib/who-growth";

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

type Assessment = { label: string; value: number; unit: string; indicator: WhoIndicator; score: number; source: string; status: string };

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

  if (!items.length) return <p className="rounded-md border border-amber-600 bg-amber-50 p-3 text-sm text-neutral-950">Chưa có chuẩn WHO phù hợp với tuổi hoặc chỉ số đã nhập.</p>;

  return <section className="rounded-lg border-2 border-[#123c36] bg-white p-4" aria-label="Đánh giá tăng trưởng WHO bằng Z-score">
    <div className="border-b-2 border-[#123c36] pb-3"><p className="text-xs font-semibold tracking-[0.14em] text-[#123c36]">TĂNG TRƯỞNG TRẺ EM · WHO LMS</p><h2 className="mt-1 text-xl font-semibold text-neutral-950">Đối chiếu Z-score</h2><p className="mt-1 text-sm text-neutral-900">Tính từ L/M/S của chuẩn WHO theo giới và tuổi đã nhập. Kết quả hỗ trợ sàng lọc, không thay thế khám và đánh giá lâm sàng.</p></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{items.map((item) => <article key={item.label} className={`border-l-4 p-3 ${tone(item.status)}`}><p className="text-sm font-semibold text-neutral-950">{item.label}</p><p className="mt-1 text-sm text-neutral-900">{round(item.value)} {item.unit}</p><p className="mt-2 text-2xl font-semibold text-neutral-950">Z {round(item.score)}</p><p className="mt-1 text-sm font-semibold text-neutral-950">{item.status}</p></article>)}</div>
    <div className="mt-4 overflow-x-auto"><table className="min-w-[680px] w-full text-sm"><thead className="border-y border-neutral-300 bg-[#e7efeb] text-left"><tr><th className="px-3 py-2">Chỉ số</th><th className="px-3 py-2 text-right">Thực tế</th><th className="px-3 py-2 text-right">Z-score</th><th className="px-3 py-2">Diễn giải sàng lọc</th><th className="px-3 py-2">Nguồn</th></tr></thead><tbody>{items.map((item) => <tr key={item.label} className="border-b border-neutral-200"><td className="px-3 py-2 font-medium">{item.label}</td><td className="px-3 py-2 text-right">{round(item.value)} {item.unit}</td><td className="px-3 py-2 text-right font-semibold">{round(item.score)}</td><td className="px-3 py-2">{item.status}</td><td className="px-3 py-2 text-xs">{item.source}</td></tr>)}</tbody></table></div>
    <p className="mt-3 text-xs text-neutral-800">0–5 tuổi dùng WHO Child Growth Standards 2006. Từ 5–19 tuổi dùng WHO Growth Reference 2007 cho BMI và chiều cao; cân nặng-theo-tuổi chỉ dùng đến 10 tuổi theo phạm vi WHO. Tuổi đang nhập theo tháng nên Z-score là ước tính theo mốc tháng gần nhất; trẻ sinh non hoặc có bệnh lý cần dùng quy trình chuyên môn riêng.</p>
  </section>;
}
