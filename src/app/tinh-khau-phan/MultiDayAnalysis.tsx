"use client";

import { useEffect, useMemo, useState } from "react";
import type { Profile } from "./PersonalProfile";
import type { RecommendationRow } from "./matchRecommendation";
import { dayMealsOrdered, type MenuDay } from "./multi-day";
import {
  analyzeMenuPeriod,
  buildPeriodShoppingList,
  type DayPeriodAnalysis,
  type EnergyStatus,
  type MacroPeriodSummary,
  type NutrientPeriodSummary,
  type PeriodRecommendation,
  type StrictMetric,
} from "./multi-day-analysis";
import { buildMultiDayExcelXml, buildMultiDayWordHtml } from "./multi-day-export";

const TARGET_KEY = "khauphan_menu_meal_targets_v1";
const round = (value: number) => Math.round(value * 10) / 10;

function formatNumber(value: number | null, unit = "") {
  return value == null || !Number.isFinite(value) ? "—" : `${round(value).toLocaleString("vi-VN")}${unit ? ` ${unit}` : ""}`;
}

function formatMetric(metric: StrictMetric | undefined, unit = "") {
  return metric?.value == null ? "—" : `${round(metric.value).toLocaleString("vi-VN")} ${unit}`.trim();
}

function formatSigned(value: number | null, unit = "kcal") {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${round(Math.abs(value)).toLocaleString("vi-VN")} ${unit}`;
}

function statusText(status: EnergyStatus) {
  return status === "dat" ? "Đạt" : status === "thieu" ? "Thiếu" : status === "vuot" ? "Vượt" : "—";
}

function StatusBadge({ status }: { status: EnergyStatus }) {
  const styles = status === "dat"
    ? "border-emerald-700 bg-emerald-50 text-emerald-800"
    : status === "thieu"
      ? "border-amber-600 bg-amber-50 text-amber-800"
      : status === "vuot"
        ? "border-rose-600 bg-rose-50 text-rose-800"
        : "border-slate-300 bg-slate-50 text-slate-600";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${styles}`}>{statusText(status)}</span>;
}

function download(content: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function MultiDayAnalysis({
  days,
  profile,
  recommendations,
}: {
  days: MenuDay[];
  profile: Profile | null;
  recommendations: RecommendationRow[];
}) {
  const mealNames = useMemo(() => {
    const names: string[] = [];
    const seen = new Set<string>();
    for (const day of days) {
      for (const meal of dayMealsOrdered(day)) {
        if (!seen.has(meal.meal)) { seen.add(meal.meal); names.push(meal.meal); }
      }
    }
    return names;
  }, [days]);
  const [shareText, setShareText] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = JSON.parse(window.localStorage.getItem(TARGET_KEY) || "{}");
      if (raw && typeof raw === "object") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShareText(Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, String(value)])));
      }
    } catch {
      setShareText({});
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(TARGET_KEY, JSON.stringify(shareText)); } catch { /* không chặn UI */ }
  }, [shareText, hydrated]);

  const shares = useMemo(() => Object.fromEntries(mealNames.map((meal) => {
    const value = Number.parseFloat((shareText[meal] ?? "").replace(",", "."));
    return [meal, Number.isFinite(value) && value >= 0 ? value : 0];
  })), [mealNames, shareText]);
  const shareTotal = Object.values(shares).reduce((sum, value) => sum + value, 0);
  const sharesValid = mealNames.length > 0 && Math.abs(shareTotal - 100) <= 0.5;
  const analysis = useMemo(
    () => analyzeMenuPeriod(days, profile, recommendations, sharesValid ? shares : {}),
    [days, profile, recommendations, shares, sharesValid],
  );
  const shopping = useMemo(() => buildPeriodShoppingList(days), [days]);
  // #5: chỉ đối chiếu vi chất có dữ liệu nguồn; gom phần thiếu thành ghi chú thay
  // vì một loạt "—" vô nghĩa.
  const nutrientsWithData = useMemo(() => analysis.nutrients.filter((n) => n.averagePerDay != null), [analysis.nutrients]);
  const nutrientsMissing = useMemo(() => analysis.nutrients.filter((n) => n.averagePerDay == null), [analysis.nutrients]);
  const periodName = analysis.calendarDayCount === 7 ? "TỔNG CẢ TUẦN" : `TỔNG ${analysis.calendarDayCount} NGÀY`;

  function splitEvenly() {
    if (!mealNames.length) return;
    const base = Math.floor((100 / mealNames.length) * 10) / 10;
    const next: Record<string, string> = {};
    mealNames.forEach((meal, index) => {
      next[meal] = String(index === mealNames.length - 1 ? round(100 - base * (mealNames.length - 1)) : base);
    });
    setShareText(next);
  }

  return (
    <section className="mt-3 flex flex-col gap-4 rounded-xl border-2 border-[#B5D4F4] bg-[#EEF5FE] p-3 sm:p-4" aria-label="Phân tích thực đơn nhiều ngày">
      {/* Thanh gọn: tiêu đề + xuất (không còn header to) */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border-2 border-[#185FA5] bg-white px-3 py-2">
        <div>
          <p className="text-sm font-bold text-[#0C447C]">Báo cáo toàn kỳ · {periodName}</p>
          <p className="text-xs text-[#5a708c]">Phân tích {analysis.dataDayCount}/{analysis.calendarDayCount} ngày có thực phẩm · ngày trống không tính là 0 kcal.</p>
        </div>
        <div className="flex flex-wrap gap-2" data-no-print>
          <button type="button" onClick={() => download(buildMultiDayWordHtml(days, analysis, shopping, profile), "application/msword;charset=utf-8", "bao-cao-dinh-duong-toan-ky.doc")} className="rounded-md border-2 border-[#185FA5] bg-white px-3 py-1.5 text-sm font-semibold text-[#0C447C] hover:bg-[#EAF3FE]">⬇ Word</button>
          <button type="button" onClick={() => download(buildMultiDayExcelXml(days, analysis, shopping, profile), "application/vnd.ms-excel;charset=utf-8", "bao-cao-dinh-duong-toan-ky.xls")} className="rounded-md bg-[#185FA5] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#0C447C]">⬇ Excel</button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BigMetric title="Năng lượng toàn kỳ" value={formatNumber(analysis.totalEnergy.value, "kcal")} note={`Mục tiêu ${formatNumber(analysis.targetPeriodKcal, "kcal")}`} status={analysis.periodEnergyStatus} />
        <BigMetric title="Thâm hụt / tăng" value={formatSigned(analysis.periodGapKcal)} note={`Bình quân ${formatSigned(analysis.averageGapKcal, "kcal/ngày")}`} status={analysis.periodEnergyStatus} />
        <BigMetric title="Trung bình mỗi ngày" value={formatNumber(analysis.averageEnergyKcal, "kcal")} note={`Nhu cầu ${formatNumber(analysis.target.value, "kcal/ngày")} · ${analysis.target.source ?? "chưa có RNI"}`} />
        <BigMetric title="Ngày đạt / thiếu / vượt" value={`${analysis.achievedDays} / ${analysis.lowDays} / ${analysis.highDays}`} note={`${analysis.completeEnergyDayCount}/${analysis.dataDayCount} ngày đủ dữ liệu năng lượng`} />
      </div>

      <MacroPerKgRow macros={analysis.macros} profile={profile} kcalPerDay={analysis.averageEnergyKcal} />

      {(analysis.emptyDayCount > 0 || analysis.totalEnergy.incomplete) && <div className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        <b>Độ đầy đủ:</b> {analysis.emptyDayCount ? `${analysis.emptyDayCount} ngày đang trống. ` : ""}{analysis.totalEnergy.incomplete ? "Có thực phẩm thiếu năng lượng nên tổng kỳ được giữ “—”." : "Các phép tính tổng chỉ dùng ngày có thực phẩm."}
      </div>}

      <AnalysisSection eyebrow="KẾT LUẬN" title="Khuyến nghị tự động theo toàn kỳ" note="Sắp theo năng lượng, P/L/G, vi chất, phân bổ bữa và độ đầy đủ dữ liệu.">
        <div className="grid gap-2 lg:grid-cols-2">
          {analysis.recommendations.map((item) => <RecommendationCard key={item.id} item={item} />)}
        </div>
      </AnalysisSection>

      <AnalysisSection eyebrow="01 · NĂNG LƯỢNG" title="Tổng kỳ và biến động từng ngày" note="Ngưỡng đạt: 90–110% nhu cầu ngày. Chênh lệch dương là vượt, âm là thiếu.">
        <EnergyTimeline days={analysis.days} target={analysis.target.value} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-[#B5D4F4]">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-[#E6F1FB] text-[#0C447C]"><tr><th className="px-3 py-2 text-left">Ngày</th><th className="px-3 py-2 text-right">Kcal</th><th className="px-3 py-2 text-right">Mục tiêu</th><th className="px-3 py-2 text-right">Chênh lệch</th><th className="px-3 py-2 text-right">% nhu cầu</th><th className="px-3 py-2 text-right">Đạm</th><th className="px-3 py-2 text-right">Béo</th><th className="px-3 py-2 text-right">Bột đường</th><th className="px-3 py-2 text-center">Đánh giá</th></tr></thead>
            <tbody>{analysis.days.map((day) => <DayTotalRow key={day.dayId} day={day} />)}</tbody>
            <tfoot><tr className="border-t-2 border-[#0C447C] bg-[#0C447C] font-bold text-white"><td className="px-3 py-2">{periodName}</td><td className="px-3 py-2 text-right">{formatNumber(analysis.totalEnergy.value)}</td><td className="px-3 py-2 text-right">{formatNumber(analysis.targetPeriodKcal)}</td><td className="px-3 py-2 text-right">{formatSigned(analysis.periodGapKcal, "")}</td><td className="px-3 py-2 text-right">{analysis.totalEnergy.value != null && analysis.targetPeriodKcal ? `${round(analysis.totalEnergy.value / analysis.targetPeriodKcal * 100)}%` : "—"}</td>{analysis.macros.map((macro) => <td key={macro.key} className="px-3 py-2 text-right">{formatNumber(macro.grams.value)}</td>)}<td className="px-3 py-2 text-center"><StatusBadge status={analysis.periodEnergyStatus} /></td></tr></tfoot>
          </table>
        </div>
      </AnalysisSection>

      <AnalysisSection eyebrow="02 · P / L / G" title="Cân đối chất sinh năng lượng toàn kỳ" note="Tỷ lệ năng lượng tính theo Atwater: đạm 4 kcal/g, béo 9 kcal/g, bột đường 4 kcal/g.">
        <div className="grid gap-3 lg:grid-cols-3">
          {analysis.macros.map((macro) => <MacroCard key={macro.key} macro={macro} />)}
        </div>
      </AnalysisSection>

      <AnalysisSection eyebrow="03 · BỮA ĂN" title="Phân bổ năng lượng và P/L/G theo bữa" note="Tổng bữa được cộng trên toàn bộ ngày có dữ liệu; một bữa có thể chứa vài chục món mà không giới hạn dòng.">
        <details className="mb-3 rounded-lg border border-[#B5D4F4] bg-[#F4F9FE]" open={!sharesValid}>
          <summary className="cursor-pointer px-3 py-2 text-sm font-bold text-[#0C447C]">⚙ Mục tiêu năng lượng từng bữa {sharesValid ? `(đủ ${round(shareTotal)}%)` : `(hiện ${round(shareTotal)}%)`}</summary>
          <div className="border-t border-[#D7E6F5] p-3">
            <p className="text-xs text-neutral-700">Chỉ đánh giá thiếu/đạt/vượt theo bữa khi tổng tỷ lệ do người dùng đặt bằng 100%.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {mealNames.map((meal) => <label key={meal} className="flex items-center gap-1 rounded border border-[#B5D4F4] bg-white px-2 py-1 text-xs"><span className="max-w-40 truncate">{meal}</span><input aria-label={`Tỷ lệ mục tiêu ${meal}`} inputMode="decimal" value={shareText[meal] ?? ""} onChange={(event) => setShareText((current) => ({ ...current, [meal]: event.target.value }))} className="w-14 rounded border border-neutral-300 px-1 py-0.5 text-right" /><span>%</span></label>)}
              <button type="button" onClick={splitEvenly} className="rounded border border-[#185FA5] px-2 py-1 text-xs font-bold text-[#0C447C]">Chia đều</button>
              <button type="button" onClick={() => setShareText({})} className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-600">Xóa tỷ lệ</button>
            </div>
            {!sharesValid && <p className="mt-2 text-xs font-bold text-amber-700">Tổng phải bằng 100%. Hiện tại: {round(shareTotal)}%.</p>}
          </div>
        </details>
        <div className="overflow-x-auto rounded-lg border border-[#B5D4F4]">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-[#E6F1FB] text-[#0C447C]"><tr><th className="px-3 py-2 text-left">Bữa</th><th className="px-3 py-2 text-right">Ngày có bữa</th><th className="px-3 py-2 text-right">Tổng kcal</th><th className="px-3 py-2 text-right">TB/ngày</th><th className="px-3 py-2 text-right">% toàn kỳ</th><th className="px-3 py-2 text-right">Mục tiêu</th><th className="px-3 py-2 text-right">Chênh lệch</th><th className="px-3 py-2 text-right">P (g)</th><th className="px-3 py-2 text-right">L (g)</th><th className="px-3 py-2 text-right">G (g)</th><th className="px-3 py-2 text-center">Đánh giá</th></tr></thead>
            <tbody>{analysis.mealAggregates.map((meal) => <tr key={meal.meal} className="border-t border-[#E1E9F5]"><td className="px-3 py-2 font-bold text-[#0C447C]">{meal.meal}</td><td className="px-3 py-2 text-right">{meal.daysPresent}/{analysis.dataDayCount}</td><td className="px-3 py-2 text-right">{formatMetric(meal.energy)}</td><td className="px-3 py-2 text-right">{formatNumber(meal.averageEnergyPerDataDay)}</td><td className="px-3 py-2 text-right">{formatNumber(meal.distributionPct, "%")}</td><td className="px-3 py-2 text-right">{meal.targetSharePct == null ? "—" : `${round(meal.targetSharePct)}% · ${formatNumber(meal.targetPeriodKcal, "kcal")}`}</td><td className="px-3 py-2 text-right">{formatSigned(meal.gapKcal, "")}</td><td className="px-3 py-2 text-right">{formatMetric(meal.protein)}</td><td className="px-3 py-2 text-right">{formatMetric(meal.lipid)}</td><td className="px-3 py-2 text-right">{formatMetric(meal.glucid)}</td><td className="px-3 py-2 text-center"><StatusBadge status={meal.status} /></td></tr>)}</tbody>
          </table>
        </div>
      </AnalysisSection>

      <AnalysisSection eyebrow="04 · MÓN ĂN" title="Món đóng góp nhiều nhất trong kỳ" note={`${analysis.uniqueDishCount} món khác nhau · ${analysis.uniqueFoodCount} thực phẩm khác nhau. Bấm tên món để xem ngày và bữa xuất hiện.`}>
        <div className="overflow-x-auto rounded-lg border border-[#B5D4F4]">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-[#E6F1FB] text-[#0C447C]"><tr><th className="px-3 py-2 text-left">Món</th><th className="px-3 py-2 text-right">Lần xuất hiện</th><th className="px-3 py-2 text-right">Thực phẩm</th><th className="px-3 py-2 text-right">Kcal</th><th className="px-3 py-2 text-right">% toàn kỳ</th><th className="px-3 py-2 text-right">P (g)</th><th className="px-3 py-2 text-right">L (g)</th><th className="px-3 py-2 text-right">G (g)</th><th className="px-3 py-2 text-right">Natri (mg)</th></tr></thead>
            <tbody>{analysis.dishes.slice(0, 30).map((dish) => <tr key={dish.dish} className="border-t border-[#E1E9F5]"><td className="px-3 py-2"><details><summary className="cursor-pointer font-bold text-[#0C447C]">{dish.dish}</summary><p className="mt-1 text-xs text-neutral-600">Ngày: {dish.days.join(", ")} · Bữa: {dish.meals.join(", ")}</p></details></td><td className="px-3 py-2 text-right">{dish.appearances}</td><td className="px-3 py-2 text-right">{dish.foodCount}</td><td className="px-3 py-2 text-right font-semibold">{formatMetric(dish.energy)}</td><td className="px-3 py-2 text-right">{dish.energy.value != null && analysis.totalEnergy.value ? `${round(dish.energy.value / analysis.totalEnergy.value * 100)}%` : "—"}</td><td className="px-3 py-2 text-right">{formatMetric(dish.protein)}</td><td className="px-3 py-2 text-right">{formatMetric(dish.lipid)}</td><td className="px-3 py-2 text-right">{formatMetric(dish.glucid)}</td><td className="px-3 py-2 text-right">{formatMetric(dish.sodium)}</td></tr>)}</tbody>
          </table>
        </div>
      </AnalysisSection>

      <AnalysisSection eyebrow="05 · VI CHẤT & KHOÁNG CHẤT" title="Tổng kỳ, trung bình ngày và mức đáp ứng" note="Chỉ hiển thị chất đủ dữ liệu nguồn. Với natri, mục tiêu là giới hạn trên; các chất còn lại đánh giá mức đáp ứng tối thiểu.">
        {nutrientsWithData.length === 0 ? (
          <p className="text-sm text-neutral-600">Chưa có vi chất/khoáng chất nào đủ dữ liệu để đối chiếu — dữ liệu nguồn của các thực phẩm trong kỳ đang thiếu các trường này.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#B5D4F4]">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-[#E6F1FB] text-[#0C447C]"><tr><th className="px-3 py-2 text-left">Chất</th><th className="px-3 py-2 text-right">Tổng kỳ</th><th className="px-3 py-2 text-right">TB/ngày</th><th className="px-3 py-2 text-right">Khuyến nghị/ngày</th><th className="px-3 py-2 text-right">Nhu cầu kỳ</th><th className="px-3 py-2 text-right">Đáp ứng</th><th className="px-3 py-2 text-right">Ngày đạt</th><th className="px-3 py-2 text-center">Đánh giá</th><th className="px-3 py-2 text-left">Ghi chú dữ liệu</th></tr></thead>
              <tbody>{nutrientsWithData.map((nutrient) => <NutrientRow key={nutrient.key} nutrient={nutrient} />)}</tbody>
            </table>
          </div>
        )}
        {nutrientsMissing.length > 0 && (
          <p className="mt-2 rounded border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-800">Chưa đủ dữ liệu nguồn để đối chiếu {nutrientsMissing.length} chất: {nutrientsMissing.map((n) => n.label).join(", ")}. (Ẩn để tránh một loạt “—” gây nhiễu.)</p>
        )}
      </AnalysisSection>

      <AnalysisSection eyebrow="06 · ĐA DẠNG THỰC PHẨM" title="Nhóm thực phẩm trong toàn kỳ" note={`${formatNumber(analysis.averageFoodGroups, "nhóm/ngày")} · ${analysis.missingFoodGroupRows} dòng chưa có phân loại nhóm.`}>
        <div className="grid gap-3 lg:grid-cols-[1fr_2fr]">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            <SmallMetric title="Nhóm thực phẩm" value={`${analysis.foodGroups.length}`} />
            <SmallMetric title="Món khác nhau" value={`${analysis.uniqueDishCount}`} />
            <SmallMetric title="Thực phẩm khác nhau" value={`${analysis.uniqueFoodCount}`} />
            <SmallMetric title="TB nhóm/ngày" value={formatNumber(analysis.averageFoodGroups)} />
          </div>
          <div className="overflow-x-auto rounded-lg border border-[#B5D4F4]">
            <table className="w-full min-w-[620px] text-sm"><thead className="bg-[#E6F1FB] text-[#0C447C]"><tr><th className="px-3 py-2 text-left">Nhóm</th><th className="px-3 py-2 text-right">Khối lượng (g)</th><th className="px-3 py-2 text-right">Kcal</th><th className="px-3 py-2 text-right">% năng lượng</th><th className="px-3 py-2 text-left">Có trong ngày</th></tr></thead><tbody>{analysis.foodGroups.map((group) => <tr key={group.group} className="border-t border-[#E1E9F5]"><td className="px-3 py-2 font-semibold">{group.group}</td><td className="px-3 py-2 text-right">{formatNumber(group.edibleGrams)}</td><td className="px-3 py-2 text-right">{formatMetric(group.energy)}</td><td className="px-3 py-2 text-right">{formatNumber(group.energySharePct, "%")}</td><td className="px-3 py-2 text-xs">{group.days.join(", ")}</td></tr>)}</tbody></table>
          </div>
        </div>
      </AnalysisSection>

      <AnalysisSection eyebrow="07 · CHI TIẾT NGÀY → BỮA" title="Mở rộng từng ngày như báo cáo một ngày" note="Giữ cấu trúc Ngày → Bữa → tổng năng lượng, P/L/G, món và nhóm thực phẩm.">
        <div className="flex flex-col gap-2">
          {analysis.days.map((day) => <DayDetail key={day.dayId} day={day} />)}
        </div>
      </AnalysisSection>

      <details className="rounded-xl border border-[#B5D4F4] bg-white">
        <summary className="cursor-pointer px-4 py-3 text-base font-black text-[#0C447C]">🛒 Bảng đi chợ gộp toàn kỳ ({shopping.length} thực phẩm)</summary>
        <div className="overflow-x-auto border-t border-[#D7E6F5]">
          <table className="w-full min-w-[760px] text-sm"><thead className="bg-[#E6F1FB] text-[#0C447C]"><tr><th className="px-3 py-2 text-left">Thực phẩm</th><th className="px-3 py-2 text-right">Sống sạch</th><th className="px-3 py-2 text-right">Mua/xuất kho</th><th className="px-3 py-2 text-right">Thải bỏ</th><th className="px-3 py-2 text-left">Dùng trong ngày</th></tr></thead><tbody>{shopping.map((item) => <tr key={item.key} className="border-t border-[#E1E9F5]"><td className="px-3 py-2 font-medium">{item.foodName}</td><td className="px-3 py-2 text-right">{formatNumber(item.edibleGrams, "g")}</td><td className="px-3 py-2 text-right">{formatNumber(item.rawGrams, "g")}</td><td className="px-3 py-2 text-right">{formatNumber(item.wastePercent, "%")}</td><td className="px-3 py-2 text-xs">{item.days.join(", ")}</td></tr>)}</tbody></table>
        </div>
      </details>
    </section>
  );
}

// Chỉ số lâm sàng: g đạm/béo/bột đường trên kg cân nặng — trung bình mỗi ngày.
function MacroPerKgRow({ macros, profile, kcalPerDay }: { macros: { key: string; averageGramsPerDay: number | null }[]; profile: Profile | null; kcalPerDay: number | null }) {
  const w = Number(profile?.weight);
  const META: Record<string, { label: string; color: string }> = { proteinG: { label: "Đạm", color: "#2563eb" }, lipidG: { label: "Béo", color: "#d97706" }, glucidG: { label: "Bột đường", color: "#16a34a" } };
  if (!(w > 0)) return <div className="rounded-lg border-2 border-[#185FA5] bg-white p-3 text-sm text-[#5a708c]">⚖️ <b className="text-[#0C447C]">Trên cân nặng (g/kg/ngày)</b> — nhập cân nặng ở hồ sơ để hiện chỉ số này.</div>;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return (
    <div className="rounded-lg border-2 border-[#185FA5] bg-white p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-bold text-[#0C447C]">⚖️ Trên cân nặng — trung bình/ngày (g/kg)</h3>
        <span className="text-xs text-[#5a708c]">{w} kg · {kcalPerDay != null ? Math.round((kcalPerDay / w) * 10) / 10 : "—"} kcal/kg</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {(["proteinG", "lipidG", "glucidG"] as const).map((key) => {
          const m = macros.find((x) => x.key === key);
          const perKg = m && m.averageGramsPerDay != null ? r2(m.averageGramsPerDay / w) : null;
          const meta = META[key];
          return <div key={key} className="rounded-md border border-[#B5D4F4] bg-[#F4F9FE] p-2 text-center">
            <div className="text-xl font-extrabold" style={{ color: meta.color }}>{perKg != null ? perKg : "—"}</div>
            <div className="text-xs text-[#5a708c]">{meta.label} g/kg</div>
          </div>;
        })}
      </div>
      <p className="mt-2 text-[11px] text-[#7d8ea3]">Trung bình mỗi ngày trên cân nặng hồ sơ. Tham khảo: đạm ~1–1,5 g/kg (bệnh lý gan/thận… có ngưỡng riêng — đối chiếu chỉ định).</p>
    </div>
  );
}

function AnalysisSection({ eyebrow, title, note, children }: { eyebrow: string; title: string; note: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-[#B5D4F4] bg-white p-3 sm:p-4"><div className="mb-3 border-b-2 border-[#185FA5] pb-2"><p className="text-[11px] font-black tracking-[0.13em] text-[#185FA5]">{eyebrow}</p><h3 className="mt-0.5 text-lg font-black text-[#0C447C] sm:text-xl">{title}</h3><p className="mt-1 text-xs text-neutral-600 sm:text-sm">{note}</p></div>{children}</section>;
}

function BigMetric({ title, value, note, status }: { title: string; value: string; note: string; status?: EnergyStatus }) {
  return <div className="rounded-xl border border-[#B5D4F4] bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-neutral-600">{title}</p>{status && <StatusBadge status={status} />}</div><p className="mt-2 text-2xl font-black text-[#0C447C]">{value}</p><p className="mt-1 text-xs text-neutral-600">{note}</p></div>;
}

function SmallMetric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-lg border border-[#D7E6F5] bg-[#F4F9FE] p-3"><p className="text-xs text-neutral-600">{title}</p><p className="mt-1 text-xl font-black text-[#0C447C]">{value}</p></div>;
}

function RecommendationCard({ item }: { item: PeriodRecommendation }) {
  const style = item.tone === "good" ? "border-emerald-500 bg-emerald-50" : item.tone === "attention" ? "border-rose-500 bg-rose-50" : item.tone === "adjust" ? "border-amber-500 bg-amber-50" : "border-sky-400 bg-sky-50";
  const label = item.tone === "good" ? "Đang tốt" : item.tone === "attention" ? "Cần chú ý" : item.tone === "adjust" ? "Nên điều chỉnh" : "Dữ liệu";
  return <article className={`rounded-lg border-l-4 p-3 ${style}`}><p className="text-[10px] font-black uppercase tracking-wide text-neutral-600">{label}</p><h4 className="mt-0.5 font-black text-neutral-950">{item.title}</h4><p className="mt-1 text-sm leading-5 text-neutral-800">{item.text}</p></article>;
}

function EnergyTimeline({ days, target }: { days: DayPeriodAnalysis[]; target: number | null }) {
  const max = Math.max(1, target ?? 0, ...days.map((day) => day.energy.value ?? 0));
  return <div className="grid gap-2 lg:grid-cols-2">{days.map((day) => {
    const actualPct = day.energy.value == null ? 0 : Math.min(100, day.energy.value / max * 100);
    const targetPct = target == null ? null : Math.min(100, target / max * 100);
    const color = day.status === "dat" ? "#059669" : day.status === "thieu" ? "#D97706" : day.status === "vuot" ? "#E11D48" : "#94A3B8";
    return <div key={day.dayId} className="rounded-lg border border-[#D7E6F5] p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-bold text-[#0C447C]">{day.label}</p><p className="text-xs text-neutral-500">{day.date || "Chưa gán ngày"}</p></div><div className="text-right"><p className="font-black">{formatNumber(day.energy.value, "kcal")}</p><p className="text-xs text-neutral-600">{formatSigned(day.gapKcal)}</p></div></div><div className="relative mt-2 h-4 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full" style={{ width: `${actualPct}%`, background: color }} />{targetPct != null && <span className="absolute inset-y-0 w-0.5 bg-neutral-950" style={{ left: `${targetPct}%` }} title="Mục tiêu" />}</div></div>;
  })}</div>;
}

function DayTotalRow({ day }: { day: DayPeriodAnalysis }) {
  const pct = day.energy.value != null && day.targetKcal ? day.energy.value / day.targetKcal * 100 : null;
  return <tr className="border-t border-[#E1E9F5]"><td className="px-3 py-2"><span className="font-bold text-[#0C447C]">{day.label}</span>{day.date && <span className="ml-2 text-xs text-neutral-500">{day.date}</span>}</td><td className="px-3 py-2 text-right">{formatNumber(day.energy.value)}</td><td className="px-3 py-2 text-right">{formatNumber(day.targetKcal)}</td><td className="px-3 py-2 text-right">{formatSigned(day.gapKcal, "")}</td><td className="px-3 py-2 text-right">{formatNumber(pct, "%")}</td><td className="px-3 py-2 text-right">{formatMetric(day.nutrients.proteinG)}</td><td className="px-3 py-2 text-right">{formatMetric(day.nutrients.lipidG)}</td><td className="px-3 py-2 text-right">{formatMetric(day.nutrients.glucidG)}</td><td className="px-3 py-2 text-center"><StatusBadge status={day.status} /></td></tr>;
}

function MacroCard({ macro }: { macro: MacroPeriodSummary }) {
  const width = macro.energySharePct == null ? 0 : Math.min(100, macro.energySharePct);
  const color = macro.status === "dat" ? "#059669" : macro.status === "thieu" ? "#D97706" : macro.status === "vuot" ? "#E11D48" : "#94A3B8";
  const recommendedRange = macro.recommendedMinPct == null || macro.recommendedMaxPct == null
    ? "—"
    : `${round(macro.recommendedMinPct)}–${round(macro.recommendedMaxPct)}%`;
  return <article className="rounded-xl border border-[#B5D4F4] p-4"><div className="flex items-center justify-between"><h4 className="text-lg font-black text-[#0C447C]">{macro.label}</h4><StatusBadge status={macro.status} /></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div><p className="text-xs text-neutral-500">Tổng kỳ</p><p className="font-bold">{formatMetric(macro.grams, "g")}</p></div><div><p className="text-xs text-neutral-500">Trung bình/ngày</p><p className="font-bold">{formatNumber(macro.averageGramsPerDay, "g")}</p></div><div><p className="text-xs text-neutral-500">Năng lượng</p><p className="font-bold">{formatNumber(macro.energyKcal, "kcal")}</p></div><div><p className="text-xs text-neutral-500">Tỷ lệ năng lượng</p><p className="font-bold">{formatNumber(macro.energySharePct, "%")}</p></div></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} /></div><p className="mt-2 text-xs text-neutral-600">Khuyến nghị: {recommendedRange}{macro.gramsPerKgPerDay != null ? ` · ${round(macro.gramsPerKgPerDay)} g/kg/ngày` : ""}</p></article>;
}

function NutrientRow({ nutrient }: { nutrient: NutrientPeriodSummary }) {
  return <tr className="border-t border-[#E1E9F5]"><td className="px-3 py-2 font-bold text-[#0C447C]">{nutrient.label}</td><td className="px-3 py-2 text-right">{formatMetric(nutrient.total, nutrient.unit)}</td><td className="px-3 py-2 text-right">{formatNumber(nutrient.averagePerDay, nutrient.unit)}</td><td className="px-3 py-2 text-right">{formatNumber(nutrient.targetPerDay, nutrient.unit)}</td><td className="px-3 py-2 text-right">{formatNumber(nutrient.targetPeriod, nutrient.unit)}</td><td className="px-3 py-2 text-right">{formatNumber(nutrient.percentOfTarget, "%")}</td><td className="px-3 py-2 text-right">{nutrient.comparableDays ? `${nutrient.achievedDays}/${nutrient.comparableDays}` : "—"}</td><td className="px-3 py-2 text-center"><StatusBadge status={nutrient.status} /></td><td className="px-3 py-2 text-xs text-neutral-600">{nutrient.total.incomplete ? "Thiếu dữ liệu ở một số thực phẩm" : nutrient.targetPerDay == null ? "Chưa có mốc RNI phù hợp" : nutrient.isUpperLimit ? "Đối chiếu giới hạn trên" : nutrient.targetType || "Đủ dữ liệu"}</td></tr>;
}

function DayDetail({ day }: { day: DayPeriodAnalysis }) {
  return <details className="rounded-lg border border-[#B5D4F4] bg-[#F8FBFF]" open={day.hasData}><summary className="cursor-pointer px-3 py-2"><span className="font-black text-[#0C447C]">{day.label}</span><span className="ml-2 text-sm text-neutral-600">{formatNumber(day.energy.value, "kcal")} · {day.dishCount} món · {day.foodGroupCount ?? "—"} nhóm TP</span></summary><div className="overflow-x-auto border-t border-[#D7E6F5]"><table className="w-full min-w-[820px] text-sm"><thead className="bg-[#E6F1FB]"><tr><th className="px-3 py-2 text-left">Bữa</th><th className="px-3 py-2 text-right">Kcal</th><th className="px-3 py-2 text-right">Mục tiêu</th><th className="px-3 py-2 text-right">P (g)</th><th className="px-3 py-2 text-right">L (g)</th><th className="px-3 py-2 text-right">G (g)</th><th className="px-3 py-2 text-center">Đánh giá</th></tr></thead><tbody>{day.meals.map((meal) => <tr key={meal.meal} className="border-t border-[#E1E9F5]"><td className="px-3 py-2 font-bold">{meal.meal}</td><td className="px-3 py-2 text-right">{formatMetric(meal.energy)}</td><td className="px-3 py-2 text-right">{formatNumber(meal.targetKcal)}</td><td className="px-3 py-2 text-right">{formatMetric(meal.nutrients.proteinG)}</td><td className="px-3 py-2 text-right">{formatMetric(meal.nutrients.lipidG)}</td><td className="px-3 py-2 text-right">{formatMetric(meal.nutrients.glucidG)}</td><td className="px-3 py-2 text-center"><StatusBadge status={meal.status} /></td></tr>)}</tbody></table></div></details>;
}
