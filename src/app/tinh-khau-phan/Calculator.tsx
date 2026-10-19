"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CORE_CALC_FIELDS } from "@/lib/nutrient-fields";
import LegacyChartReport from "./LegacyChartReport";
import MealInput from "./MealInput";
import ProfileSummary from "./ProfileSummary";
import { CalculatorHeading, CalculatorInputPanel, CalculatorResultsHeading, CalculatorResultsLayout } from "./CalculatorLayout";
import { DailyTotalCard, DailyMacroPerKgCard, DailyMealCards } from "./DailyNutritionSummary";
import CalculatorNavigation, { useCalculatorHeader } from "./CalculatorNavigation";
import MultiDayBoard from "./MultiDayBoard";
import PersonalProfile, { DEFAULT_PROFILE, type Profile } from "./PersonalProfile";
import RecommendationComparison from "./RecommendationComparison";
import DietCodeComparison from "./DietCodeComparison";
import RationDetail from "./RationDetail";
import EnergyDistribution from "./EnergyDistribution";
import MicronutrientComparison from "./MicronutrientComparison";
import WhoGrowthAssessment from "./WhoGrowthAssessment";
import { WHO_GROWTH_ENTRIES } from "@/lib/who-growth";
import ExchangeUnits from "./ExchangeUnits";
import ShoppingList from "./ShoppingList";
import ReportActions from "./ReportActions";
import type { ReportMeta } from "./ReportActions";
import ServerRationActions from "./ServerRationActions";
import { buildTree, mealOrder, type DishNode, type RationMode, type Row } from "./types";
import { type MedicationRow, type MedicationTiming } from "./medication-row";

const round = (n: number) => Math.round(n * 10) / 10;
const ADVANCED_GROUPS: [string, string][] = [["charts", "10 biểu đồ phân tích"]];

// Biểu đồ tăng trưởng WHO cho trẻ em, hiện ngay ở khu Kết quả (không cần DB — dữ
// liệu LMS bundle sẵn trong WHO_GROWTH_ENTRIES). Chỉ hiện khi hồ sơ là trẻ em đủ
// cân nặng + chiều cao.
function GrowthAssessmentPanel({ profile }: { profile: Profile | null }) {
  if (!profile) return null;
  const ageMonth = profile.ageUnit === "thang" ? Number(profile.age) : Number(profile.age) * 12;
  const w = Number(profile.weight);
  const h = Number(profile.height);
  if (!(ageMonth > 0) || ageMonth > 228 || !(w > 0) || !(h > 0)) return null;
  const sex = profile.gender === "Nữ" ? "Nu" : "Nam";
  const entries = WHO_GROWTH_ENTRIES.filter((entry) => entry.sex === sex);
  return <WhoGrowthAssessment entries={entries} ageMonths={ageMonth} weightKg={w} heightCm={h} />;
}

// Nhóm khuyến nghị suy ra từ hồ sơ: mang thai/cho bú > trẻ em (≤18 tuổi) > người lớn.
function profileGroup(profile: Profile | null): "adult" | "child" | "special" | "" {
  if (!profile) return "";
  if (profile.physiology && profile.physiology !== "normal") return "special";
  const ageMonth = profile.ageUnit === "thang" ? Number(profile.age) : Number(profile.age) * 12;
  if (ageMonth > 0 && ageMonth <= 228) return "child";
  return "adult";
}

export default function Calculator({linkedMenu}:{linkedMenu?:ReactNode}) {
  return linkedMenu ? <div className="calculation-workspace flex min-w-0 flex-col gap-6"><CalculatorHeading/>{linkedMenu}</div> : <ManualCalculator/>;
}
function ManualCalculator() {
  const [rows, setRows] = useState<Row[]>([]);
  const [meds, setMeds] = useState<MedicationRow[]>([]);
  const [rationMode, setRationMode] = useState<RationMode>("recall24h");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [openAdvanced, setOpenAdvanced] = useState<Record<string, boolean>>({});
  const [profileOpen, setProfileOpen] = useState(false);
  const headerSlot = useCalculatorHeader();
  const [activeView, setActiveView] = useState<"entry" | "analysis">("entry");
  // Chế độ cấp trang: một ngày ↔ thực đơn nhiều ngày (board riêng).
  const [pageMode, setPageMode] = useState<"single" | "multi">("single");
  const [reportMeta, setReportMeta] = useState<ReportMeta>(() => ({ subjectName: "", subjectGroup: "", clinicalCourse: "", authorName: "", authorRole: "Bác sĩ", authorOrganization: "", reportDate: new Date().toISOString().slice(0, 10), menuNote: "" }));
  const setMenuNote = (menuNote: string) => setReportMeta((current) => ({ ...current, menuNote }));
  // Bấm nút nhóm (Người lớn/Trẻ em/Mang thai) sẽ đặt SẴN đúng tình trạng vào hồ sơ
  // rồi mới mở modal — để "🤰 Mang thai / cho bú" hiện ngay ô tuần thai + badge +kcal.
  function applyProfileMode(mode: "adult" | "child" | "special") {
    const base = profile ?? DEFAULT_PROFILE;
    let next: Profile = base;
    if (mode === "special") {
      const alreadySpecial = base.physiology.startsWith("pregnant_") || base.physiology.startsWith("lactating_");
      next = { ...base, gender: "Nữ", physiology: alreadySpecial ? base.physiology : "pregnant_1" };
    } else if (mode === "adult") {
      next = { ...base, physiology: "normal" };
    }
    if (next !== base) {
      try { localStorage.setItem("khauphan_profile_v1", JSON.stringify(next)); } catch { /* localStorage bị chặn */ }
      // Đồng bộ tới cả 2 instance PersonalProfile (bước 1 & bước 2) + Calculator.
      window.dispatchEvent(new CustomEvent("khauphan:profile", { detail: next }));
      setProfile(next);
    }
    setProfileOpen(true);
  }
  // Focus mode (desktop): thu gọn header/tiêu đề để khu nhập chiếm gần trọn màn hình.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore the existing manual page mode after hydration.
      if ((params.get("menuDate") && params.get("dietTypeId")) || localStorage.getItem("khauphan_pagemode_v1") === "multi") setPageMode("multi");
    } catch { /* localStorage bị chặn */ }
  }, []);

  function changePageMode(next: "single" | "multi") {
    setPageMode(next);
    // Mỗi lần đổi chế độ đều trở về bước lập/nhập thực đơn, tránh giữ lại màn
    // phân tích của chế độ trước và giúp người dùng định hướng ngay sau chuyển cảnh.
    setActiveView("entry");
    try { localStorage.setItem("khauphan_pagemode_v1", next); } catch { /* localStorage bị chặn */ }
  }
  const foodRows = rows.filter((r) => r.foodId);

  const totals: Record<string, number> = {};
  for (const field of CORE_CALC_FIELDS) totals[field.key] = 0;
  for (const row of foodRows) {
    const factor = row.grams / 100;
    for (const field of CORE_CALC_FIELDS) {
      const value = row.nutrients[field.key];
      if (typeof value === "number") totals[field.key] += value * factor;
    }
  }
  const displayTotals = Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, { value, incomplete: false }]));
  const totalGrams = foodRows.reduce((sum, row) => sum + (row.grams || 0), 0);

  return <div className="calculation-workspace flex flex-col gap-6">
    <CalculatorHeading/>

    {(() => { const navigation = <CalculatorNavigation pageMode={pageMode} activeView={activeView} foodCount={foodRows.length} onViewChange={setActiveView} onPageModeChange={changePageMode}/>; return headerSlot ? createPortal(navigation, headerSlot) : navigation; })()}

    {pageMode === "multi" && <section key={`multi-${activeView}`} className="mode-panel-enter clinical-panel min-w-0"><MultiDayBoard view={activeView} /></section>}

    <CalculatorInputPanel active={pageMode === "single" && activeView === "entry"}>
      <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1"><MealInput onRowsChange={setRows} onModeChange={setRationMode} onMedsChange={setMeds} profileSlot={<PersonalProfile onChange={setProfile} />} savedMenuSlot={<ServerRationActions rows={rows} profile={profile} variant="load" />} analysisSlot={<button onClick={() => setActiveView("analysis")} className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#123c36] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d2e29]">Sang phân tích →</button>} /><div className="lg:hidden"><NoteBox value={reportMeta.menuNote} onChange={setMenuNote} /></div></div>
    </CalculatorInputPanel>

    <section className={pageMode === "single" && activeView === "analysis" ? "mode-panel-enter clinical-panel min-w-0" : "hidden"}>
      <section data-print-header><p className="text-center text-sm font-semibold tracking-[0.16em] text-[#123c36]">BÁO CÁO PHÂN TÍCH KHẨU PHẦN</p><h1 className="mt-2 text-center text-2xl font-semibold">Phiếu đánh giá dinh dưỡng</h1><div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 border-y-2 border-[#123c36] py-3 text-sm"><p><b>Người được đánh giá:</b> {reportMeta.subjectName || "Chưa ghi"}</p><p><b>Ngày lập:</b> {reportMeta.reportDate || "Chưa ghi"}</p><p><b>Nhóm / mục tiêu:</b> {reportMeta.subjectGroup || "Chưa ghi"}</p><p><b>Người lập:</b> {reportMeta.authorName || "Chưa ghi"} ({reportMeta.authorRole})</p><p className="col-span-2"><b>Đơn vị / cơ sở:</b> {reportMeta.authorOrganization || "Chưa ghi"}</p><p className="col-span-2"><b>Hồ sơ:</b> {profile ? `${profile.gender}, ${profile.age || "—"} ${profile.ageUnit}, ${profile.weight || "—"} kg, ${profile.height || "—"} cm${profile.physiology.startsWith("pregnant_") ? ` · Thai kỳ: ${profile.pregnancyWeek ? `tuần ${profile.pregnancyWeek}` : "chưa ghi tuần"}${profile.prePregnancyWeight ? ` · trước thai ${profile.prePregnancyWeight} kg` : ""}` : ""}` : "Chưa nhập"}</p>{profile?.pregnancyNote && <p className="col-span-2"><b>Ghi chú thai kỳ:</b> {profile.pregnancyNote}</p>}{reportMeta.menuNote && <p className="col-span-2"><b>Ghi chú thực đơn / khẩu phần:</b> {reportMeta.menuNote}</p>}{reportMeta.clinicalCourse && <p className="col-span-2"><b>Diễn biến bệnh lý / theo dõi:</b> {reportMeta.clinicalCourse}</p>}</div></section>
      <CalculatorResultsHeading/>
      {foodRows.length === 0 ? <div className="mt-5 rounded-lg border-2 border-dashed border-neutral-400 bg-white px-5 py-10 text-center text-neutral-900"><p>Thêm thực phẩm ở bước Nhập khẩu phần để bắt đầu phân tích.</p><button onClick={() => setActiveView("entry")} className="mt-4 rounded-md bg-[#123c36] px-4 py-2 font-semibold text-white">Quay lại nhập dữ liệu</button></div> : <CalculatorResultsLayout
        actions={<><ServerRationActions rows={rows} profile={profile} />
          <ReportActions rows={rows} profile={profile} meta={reportMeta} mode={rationMode} onMetaChange={setReportMeta} /></>}
        profile={<><div className="rounded-lg border border-[#123c36]/30 bg-white p-3">
                <h3 className="mb-2 text-sm font-bold text-[#123c36]">Nhóm để nhận khuyến nghị</h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {([["adult", "🧑 Người lớn"], ["child", "🧒 Trẻ em"], ["special", "🤰 Mang thai / cho bú"]] as const).map(([key, label]) => (
                    <button key={key} type="button" onClick={() => applyProfileMode(key)} aria-pressed={profileGroup(profile) === key} className={`rounded-md border px-2 py-1.5 text-center text-xs font-semibold ${profileGroup(profile) === key ? "border-[#0c5f4d] bg-[#0c5f4d] text-white" : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"}`}>{label}</button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-500">Bấm để nhập/sửa thông tin — hệ thống tự đối chiếu khuyến nghị theo nhóm.</p>
              </div>
              <div className="rounded-lg border border-[#123c36]/30 bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-[#123c36]">Hồ sơ người dùng</h3><PersonalProfile onChange={setProfile} open={profileOpen} onOpenChange={setProfileOpen} /></div>
                <ProfileSummary profile={profile} />
              </div>
              <DietCodeComparison totals={totals} /></>}
        recommendations={<><DailyTotalCard totals={displayTotals} fields={CORE_CALC_FIELDS} foodCount={foodRows.length} amount={`${round(totalGrams)} g sống sạch`} mode={rationMode} />
              <DailyMacroPerKgCard totals={displayTotals} profile={profile} />
              {profile && <RecommendationComparison profile={profile} totals={totals} />}
              <MicronutrientComparison rows={rows} profile={profile} />
              <GrowthAssessmentPanel profile={profile} /></>}
        overview={<><MealDishOverview rows={rows} meds={meds} /><NoteBox value={reportMeta.menuNote} onChange={setMenuNote} /></>}
        analysis={<><div><h3 className="mb-2 text-base font-semibold text-neutral-950">Tổng dinh dưỡng theo từng bữa</h3><MealNutritionCards rows={rows} totalKcal={totals.energyKcal} /></div>
              <EnergyDistribution rows={rows} totals={totals} profile={profile} />
              <div className="rounded-lg border border-[#7f948d] bg-white p-4"><h3 className="mb-3 text-base font-semibold text-neutral-950">Quy đổi thực đơn <span className="text-sm font-normal text-neutral-600">(sống sạch → mua / xuất kho)</span></h3><ExchangeUnits rows={rows} /></div>
              <div className="rounded-lg border border-[#7f948d] bg-white p-4"><h3 className="mb-3 text-base font-semibold text-neutral-950">🛒 Danh sách đi chợ / xuất kho <span className="text-sm font-normal text-neutral-600">(gộp toàn bộ thực phẩm)</span></h3><ShoppingList rows={foodRows} /></div>
              <div className="flex flex-col gap-3">
                {ADVANCED_GROUPS.map(([key, label]) => {
                  const isOpen = !!openAdvanced[key];
                  return (
                    <div key={key} className="overflow-hidden rounded-lg border border-[#7f948d] bg-white">
                      <button type="button" data-no-print onClick={() => setOpenAdvanced((s) => ({ ...s, [key]: !s[key] }))} className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-semibold text-[#123c36] hover:bg-emerald-50"><span>{label} <span className="ml-1 text-xs font-normal text-neutral-500">— chuyên sâu</span></span><span className="shrink-0 text-base">{isOpen ? "▾" : "▸"}</span></button>
                      {isOpen && <div className="border-t border-[#cdd9d3] p-4"><LegacyChartReport rows={rows} /></div>}
                    </div>
                  );
                })}
              </div></>}
        detail={<RationDetail rows={rows} mode={rationMode} />}
      />}
    </section>
  </div>;
}

// Ô ghi chú chung cho thực đơn/khẩu phần — nhỏ gọn mặc định, tự cao dần theo nội
// dung gõ vào (không cuộn ẩn bên trong ô). Cùng 1 state (reportMeta.menuNote)
// dùng ở cả bước 1 và bước 2 nên luôn đồng bộ; bản in/Excel lấy từ state này.
// Tóm tắt hồ sơ cá nhân (chỉ đọc) hiển thị ở đầu khu Kết quả — dữ liệu nhập/sửa
// vẫn ở bước 1; ở đây chỉ trình bày lại cho dễ đối chiếu với khuyến nghị.
// Danh sách chỉ đọc Bữa → Món (kèm calo) cho khung trái bước 2.
function dishKcalOf(dish: DishNode): number {
  return dish.rows.reduce((sum, row) => {
    const e = row.nutrients?.energyKcal;
    return sum + (typeof e === "number" && Number.isFinite(e) ? ((row.grams || 0) * e) / 100 : 0);
  }, 0);
}

// Thuốc/TPBS gắn theo bữa — hiển thị chỉ đọc ở khu Kết quả (nhóm theo thời điểm),
// phân biệt THUỐC (cần bác sĩ + dược sĩ) với TPBS. Không tham gia phép tính dinh dưỡng.
const MED_TIMING_ORDER: { timing: MedicationTiming; label: string }[] = [
  { timing: "before", label: "Trước bữa" },
  { timing: "after", label: "Sau bữa" },
  { timing: "standalone", label: "Mốc riêng" },
  { timing: "unspecified", label: "Chưa định vị trí" },
];

function MedChip({ med }: { med: MedicationRow }) {
  const isDrug = med.kind === "drug";
  const dose = [med.dose, med.doseUnit].filter(Boolean).join(" ");
  return (
    <li className={`flex items-start gap-1.5 px-2 py-1 pl-4 text-sm ${isDrug ? "text-rose-900" : "text-emerald-900"}`}>
      <span className={`mt-0.5 shrink-0 rounded px-1 text-[10px] font-bold ${isDrug ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>{isDrug ? "💊 Thuốc" : "🌿 TPBS"}</span>
      <span className="min-w-0">
        <span className="font-medium">{med.name || "(chưa đặt tên)"}</span>
        {dose && <span className="text-neutral-600"> · {dose}</span>}
        {isDrug && !med.confirmed && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">chưa xác nhận BS+DS</span>}
      </span>
    </li>
  );
}

function MealDishOverview({ rows, meds = [] }: { rows: Row[]; meds?: MedicationRow[] }) {
  const tree = buildTree(rows);
  const mealsWithMeds = new Set(meds.map((m) => m.meal));
  const orderedMeals = [...tree.map((m) => m.meal), ...[...mealsWithMeds].filter((m) => !tree.some((t) => t.meal === m))];
  if (orderedMeals.length === 0) return <div className="rounded-lg border border-[#cdd9d3] bg-white p-3 text-sm text-neutral-600">Chưa có bữa ăn.</div>;
  return (
    <div className="rounded-lg border border-[#cdd9d3] bg-[#f9fdfb] p-3">
      <h3 className="mb-2 text-sm font-bold text-[#123c36]">🍱 Bữa ăn · món ăn · thuốc</h3>
      <div className="flex flex-col gap-2">
        {orderedMeals.map((mealName) => {
          const meal = tree.find((m) => m.meal === mealName);
          const mealKcal = meal ? meal.dishes.reduce((s, d) => s + dishKcalOf(d), 0) : 0;
          const mealMeds = meds.filter((m) => m.meal === mealName);
          return (
            <div key={mealName} className="overflow-hidden rounded-md border border-neutral-200 bg-white">
              <div className="flex items-center justify-between gap-2 bg-[#eef4f1] px-2 py-1 text-sm font-semibold text-[#0c5f4d]"><span className="min-w-0 truncate">{mealName}</span><span className="shrink-0 rounded bg-[#123c36] px-1.5 text-xs font-bold text-white">{Math.round(mealKcal)} kcal</span></div>
              {meal && meal.dishes.length > 0 && <ul className="divide-y divide-neutral-100">{meal.dishes.map((dish) => <li key={dish.dish} className="flex items-center justify-between gap-2 px-2 py-1 pl-4 text-sm"><span className="min-w-0 truncate text-neutral-800">🍽️ {dish.dish}</span><span className="shrink-0 rounded bg-amber-100 px-1.5 text-xs font-semibold text-amber-900">{Math.round(dishKcalOf(dish))}</span></li>)}</ul>}
              {mealMeds.length > 0 && <div className="border-t border-dashed border-violet-200 bg-[#f7faf8]">
                {MED_TIMING_ORDER.map(({ timing, label }) => {
                  const list = mealMeds.filter((m) => m.timing === timing);
                  if (list.length === 0) return null;
                  return <div key={timing}>
                    <div className="px-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-violet-700">{label}</div>
                    <ul>{list.map((med) => <MedChip key={med.uid} med={med} />)}</ul>
                  </div>;
                })}
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MealNutritionCards({ rows, totalKcal }: { rows: Row[]; totalKcal: number }) {
  const order: string[] = [];
  const map = new Map<string, Record<string, number>>();
  for (const r of rows) {
    if (!r.foodId) continue;
    if (!map.has(r.meal)) { map.set(r.meal, {}); order.push(r.meal); }
    const t = map.get(r.meal)!;
    const f = r.grams / 100;
    for (const k of ["energyKcal", "proteinG", "lipidG", "glucidG", "fiberG", "sodiumMg"]) {
      const v = r.nutrients[k];
      if (typeof v === "number" && Number.isFinite(v)) t[k] = (t[k] || 0) + v * f;
    }
  }
  const meals = order.sort((a, b) => mealOrder(a) - mealOrder(b)).map((m) => ({ meal: m, t: map.get(m)! }));
  return <DailyMealCards meals={meals.map(({meal,t})=>({name:meal,totals:Object.fromEntries(Object.entries(t).map(([key,value])=>[key,{value,incomplete:false}]))}))} dailyEnergy={{value:totalKcal,incomplete:false}}/>;
}

function NoteBox({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  function autoGrow(event: ChangeEvent<HTMLTextAreaElement>) {
    const el = event.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    onChange(el.value);
  }
  return <div data-no-print className="rounded-lg border-2 border-[#7f948d] bg-white p-4">
    <label className="text-sm font-semibold text-neutral-950">Ghi chú thực đơn / khẩu phần
      <textarea value={value} onChange={autoGrow} rows={2} placeholder="Ghi chú chung — hiện khi in/xuất báo cáo." className="mt-1 w-full resize-none overflow-hidden rounded-md border border-neutral-400 px-3 py-2 text-sm font-normal" />
    </label>
  </div>;
}
