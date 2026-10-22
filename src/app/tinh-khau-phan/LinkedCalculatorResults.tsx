"use client";

import type { ResolvedMenu } from "@/lib/nutrition-chat/contracts";
import { ALL_NUTRIENT_FIELDS } from "@/lib/nutrient-fields";
import NutritionClinicalComparison from "@/app/ket-noi-ai/NutritionClinicalComparison";
import MultiDayAnalysis, { ResolvedTargets, ResolvedGrowth, ResolvedShopping, MacroCard, NutrientSummaryTable, RecommendationCard } from "./MultiDayAnalysis";
import { CalculatorResultsHeading, CalculatorResultsLayout } from "./CalculatorLayout";
import { DailyTotalCard, DailyMacroPerKgCard, DailyMealCards } from "./DailyNutritionSummary";
import ProfileSummary from "./ProfileSummary";
import RationDetail from "./RationDetail";
import { resolvedAmountText, resolvedDisplayTotal } from "./resolved-ration-detail";

export default function LinkedCalculatorResults({ menu, draft, onEdit, actionsRef }: { menu: ResolvedMenu; draft: boolean; onEdit?: () => void; actionsRef?: (node: HTMLDivElement | null) => void }) {
  const day = menu.days[0];
  return <section className="mode-panel-enter clinical-panel min-w-0">
    <CalculatorResultsHeading draft={draft} title={menu.title}/>
    {menu.days.length !== 1 ? <MultiDayAnalysis days={[]} profile={menu.input.profile ?? null} recommendations={[]} resolvedMenu={menu} reportActions={actionsRef?<div ref={actionsRef} className="w-full"/>:undefined}/> : <CalculatorResultsLayout
      actions={actionsRef?<div ref={actionsRef} className="w-full"/>:undefined}
      profile={<>
        <div className="rounded-lg border border-[var(--brand)]/30 bg-white p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-[var(--ink)]">Hồ sơ người dùng</h3>{onEdit ? <button type="button" onClick={onEdit} className="font-semibold text-[var(--brand)] underline">Sửa hồ sơ</button> : null}</div><ProfileSummary profile={menu.input.profile ?? null}/></div>
        {menu.clinicalAssessment ? <NutritionClinicalComparison assessment={menu.clinicalAssessment}/> : <p className="text-sm text-neutral-600">Chưa chọn mã chế độ ăn.</p>}
      </>}
      recommendations={<>
        <DailyTotalCard totals={menu.totals} fields={ALL_NUTRIENT_FIELDS} foodCount={day.rows.length} amount={resolvedAmountText(day.rows)} mode={menu.mode} targetKcal={menu.analysis.days.find(item=>item.dayId===day.id)?.targetKcal}/>
        <DailyMacroPerKgCard totals={menu.totals} profile={menu.input.profile ?? null}/>
        <ResolvedTargets menu={menu}/>
        <details className="rounded-lg border border-[var(--control-line)] bg-white p-3"><summary className="cursor-pointer font-semibold text-[var(--brand)]">Vi chất &amp; khoáng chất · mức đáp ứng nhu cầu</summary><div className="mt-3"><NutrientSummaryTable nutrients={menu.analysis.nutrients}/></div></details>
        {menu.analysis.recommendations.length ? <div className="grid gap-2">{menu.analysis.recommendations.map(item=><RecommendationCard key={item.id} item={item}/>)}</div> : null}
        <ResolvedGrowth menu={menu}/>
      </>}
      overview={<div className="rounded-lg border border-[var(--control-line)] bg-[var(--surface-soft)] p-3"><h3 className="mb-3 font-semibold text-[var(--ink)]">Bữa ăn &amp; món ăn</h3>{[...new Set(day.rows.map(row => row.meal))].map(meal => <div key={meal} className="mb-3"><p className="font-semibold text-[var(--brand)]">🍱 {meal}</p><ul className="mt-1 pl-4 text-sm">{[...new Set(day.rows.filter(row => row.meal === meal).map(row => row.dish))].map(dish => <li key={dish}>🍽️ {dish}</li>)}</ul></div>)}</div>}
      analysis={<>
        <div><h3 className="mb-2 text-base font-semibold text-neutral-950">Tổng dinh dưỡng theo từng bữa</h3><DailyMealCards dailyEnergy={menu.totals.energyKcal} meals={[...new Set(day.rows.map(row => row.meal))].map(meal => {
          const rows = day.rows.filter(row => row.meal === meal), canonical = menu.analysis.days.find(item => item.dayId === day.id)?.meals.find(item => item.meal === meal);
          return {name:meal,totals:Object.fromEntries(["energyKcal","proteinG","lipidG","glucidG","fiberG","sodiumMg"].map(key=>[key,canonical?.nutrients[key]??resolvedDisplayTotal(rows,key)]))};
        })}/></div>
        <section className="rounded-lg border border-[var(--control-line)] bg-white p-3"><h3 className="mb-3 font-semibold text-[var(--ink)]">Cân đối chất sinh năng lượng</h3><div className="grid gap-3 sm:grid-cols-3">{menu.analysis.macros.map(macro=><MacroCard key={macro.key} macro={macro}/>)}</div></section>
        <ResolvedShopping menu={menu} singleDay/>
        {menu.warnings.length ? <details className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm"><summary className="cursor-pointer font-semibold">Lưu ý về nguồn và số liệu ({menu.warnings.length})</summary><ul className="mt-2 list-disc space-y-1 pl-5">{[...new Set(menu.warnings)].map(warning => <li key={warning}>{warning}</li>)}</ul></details> : null}
      </>}
      detail={<RationDetail rows={[]} mode={menu.mode} resolvedMenu={menu} dayId={day.id}/>}
    />}
  </section>;
}
