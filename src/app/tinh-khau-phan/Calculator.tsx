"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { CORE_CALC_FIELDS } from "@/lib/nutrient-fields";
import LegacyChartReport from "./LegacyChartReport";
import MealInput from "./MealInput";
import PersonalProfile, { type Profile } from "./PersonalProfile";
import RecommendationComparison from "./RecommendationComparison";
import DietCodeComparison from "./DietCodeComparison";
import RationDetail from "./RationDetail";
import EnergyDistribution from "./EnergyDistribution";
import MicronutrientComparison from "./MicronutrientComparison";
import ExchangeUnits from "./ExchangeUnits";
import ReportActions from "./ReportActions";
import Modal from "./Modal";
import type { ReportMeta } from "./ReportActions";
import ServerRationActions from "./ServerRationActions";
import { mealOrder, type RationMode, type Row } from "./types";

const round = (n: number) => Math.round(n * 10) / 10;
const ADVANCED_GROUPS: [string, string][] = [["exchange", "Quy đổi thực đơn"], ["charts", "10 biểu đồ phân tích"]];

export default function Calculator() {
  const [rows, setRows] = useState<Row[]>([]);
  const [rationMode, setRationMode] = useState<RationMode>("recall24h");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [openAdvanced, setOpenAdvanced] = useState<Record<string, boolean>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [activeView, setActiveView] = useState<"entry" | "analysis">("entry");
  const [reportMeta, setReportMeta] = useState<ReportMeta>(() => ({ subjectName: "", subjectGroup: "", clinicalCourse: "", authorName: "", authorRole: "Bác sĩ", authorOrganization: "", reportDate: new Date().toISOString().slice(0, 10), menuNote: "" }));
  const setMenuNote = (menuNote: string) => setReportMeta((current) => ({ ...current, menuNote }));
  // Focus mode (desktop): thu gọn header/tiêu đề để khu nhập chiếm gần trọn màn hình.
  useEffect(() => {
    document.body.classList.add("ration-focus");
    return () => document.body.classList.remove("ration-focus");
  }, []);
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
  const totalGrams = foodRows.reduce((sum, row) => sum + (row.grams || 0), 0);

  return <div className="calculation-workspace flex flex-col gap-6">
    <section className="clinical-page-heading">
      <p className="text-xs font-semibold tracking-[0.16em] text-[#123c36]">PHIẾU PHÂN TÍCH DINH DƯỠNG</p>
      <h1 className="mt-1 text-3xl font-semibold text-neutral-950">Phân tích khẩu phần</h1>
      <div className="mt-2 flex flex-wrap items-center gap-3"><Link href="/huong-dan" className="rounded-md border-2 border-[#123c36] bg-white px-3 py-1 text-sm font-semibold text-[#123c36] hover:bg-[#edf4f0]">? Xem hướng dẫn</Link></div>
    </section>

    <nav className="clinical-stepper flex w-full rounded-xl border-2 border-[#7f948d] bg-white p-1.5" aria-label="Các bước tính khẩu phần">
      <button onClick={() => setActiveView("entry")} className={`clinical-step flex-1 rounded-lg px-4 py-3 text-left font-semibold ${activeView === "entry" ? "bg-[#123c36] text-white" : "text-neutral-900 hover:bg-neutral-100"}`} aria-pressed={activeView === "entry"}>
        <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-current text-sm">1</span>Nhập khẩu phần <span className="ml-2 hidden text-sm font-normal sm:inline">Hồ sơ, bữa ăn, món và thực phẩm</span>
      </button>
      <button onClick={() => setActiveView("analysis")} className={`clinical-step flex-1 rounded-lg px-4 py-3 text-left font-semibold ${activeView === "analysis" ? "bg-[#123c36] text-white" : "text-neutral-900 hover:bg-neutral-100"}`} aria-pressed={activeView === "analysis"}>
        <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-current text-sm">2</span>Kết quả &amp; phân tích <span className="ml-2 hidden text-sm font-normal sm:inline">{foodRows.length ? `${foodRows.length} thực phẩm đã nhập` : "Chưa có dữ liệu"}</span>
      </button>
    </nav>

    <section className={activeView === "entry" ? "clinical-panel rounded-xl border-2 border-[#7f948d] bg-[#f4f8f5] p-4 lg:flex lg:h-[calc(100vh-8.5rem)] lg:flex-col lg:overflow-hidden lg:p-3" : "hidden"}>
      <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1"><MealInput onRowsChange={setRows} onModeChange={setRationMode} profileSlot={<PersonalProfile onChange={setProfile} />} analysisSlot={<button onClick={() => (foodRows.length ? setReviewOpen(true) : setActiveView("analysis"))} className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#123c36] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d2e29]">Sang phân tích →</button>} /><div className="lg:hidden"><NoteBox value={reportMeta.menuNote} onChange={setMenuNote} /></div></div>
      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Xem lại khẩu phần trước khi phân tích" maxWidth="max-w-4xl">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-700">Kiểm tra sơ đồ cây <b>Bữa → Món → Thực phẩm</b> kèm khối lượng. Nếu đúng, bấm xác nhận để sang bước phân tích.</p>
          <RationDetail rows={rows} mode={rationMode} />
          <div className="flex flex-wrap justify-end gap-2 border-t-2 border-[#7f948d] pt-3">
            <button onClick={() => setReviewOpen(false)} className="rounded-md border border-[#123c36] bg-white px-4 py-2 text-sm font-semibold text-[#123c36] hover:bg-[#edf4f0]">← Quay lại chỉnh</button>
            <button onClick={() => { setReviewOpen(false); setActiveView("analysis"); }} className="rounded-md bg-[#123c36] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0d2e29]">Xác nhận &amp; phân tích →</button>
          </div>
        </div>
      </Modal>
    </section>

    <section className={activeView === "analysis" ? "clinical-panel min-w-0 rounded-xl border-2 border-[#7f948d] bg-white p-6" : "hidden"}>
      <section data-print-header><p className="text-center text-sm font-semibold tracking-[0.16em] text-[#123c36]">BÁO CÁO PHÂN TÍCH KHẨU PHẦN</p><h1 className="mt-2 text-center text-2xl font-semibold">Phiếu đánh giá dinh dưỡng</h1><div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 border-y-2 border-[#123c36] py-3 text-sm"><p><b>Người được đánh giá:</b> {reportMeta.subjectName || "Chưa ghi"}</p><p><b>Ngày lập:</b> {reportMeta.reportDate || "Chưa ghi"}</p><p><b>Nhóm / mục tiêu:</b> {reportMeta.subjectGroup || "Chưa ghi"}</p><p><b>Người lập:</b> {reportMeta.authorName || "Chưa ghi"} ({reportMeta.authorRole})</p><p className="col-span-2"><b>Đơn vị / cơ sở:</b> {reportMeta.authorOrganization || "Chưa ghi"}</p><p className="col-span-2"><b>Hồ sơ:</b> {profile ? `${profile.gender}, ${profile.age || "—"} ${profile.ageUnit}, ${profile.weight || "—"} kg, ${profile.height || "—"} cm${profile.physiology.startsWith("pregnant_") ? ` · Thai kỳ: ${profile.pregnancyWeek ? `tuần ${profile.pregnancyWeek}` : "chưa ghi tuần"}${profile.prePregnancyWeight ? ` · trước thai ${profile.prePregnancyWeight} kg` : ""}` : ""}` : "Chưa nhập"}</p>{profile?.pregnancyNote && <p className="col-span-2"><b>Ghi chú thai kỳ:</b> {profile.pregnancyNote}</p>}{reportMeta.menuNote && <p className="col-span-2"><b>Ghi chú thực đơn / khẩu phần:</b> {reportMeta.menuNote}</p>}{reportMeta.clinicalCourse && <p className="col-span-2"><b>Diễn biến bệnh lý / theo dõi:</b> {reportMeta.clinicalCourse}</p>}</div></section>
      <div className="border-b-2 border-[#123c36] pb-3"><p className="text-xs font-semibold tracking-[0.14em] text-[#123c36]">BƯỚC 2 · KẾT QUẢ</p><h2 className="mt-1 text-2xl font-semibold text-neutral-950">Kết quả &amp; phân tích</h2></div>
      <NoteBox value={reportMeta.menuNote} onChange={setMenuNote} />
      {foodRows.length === 0 ? <div className="mt-5 rounded-lg border-2 border-dashed border-neutral-400 bg-white px-5 py-10 text-center text-neutral-900"><p>Thêm thực phẩm ở bước Nhập khẩu phần để bắt đầu phân tích.</p><button onClick={() => setActiveView("entry")} className="mt-4 rounded-md bg-[#123c36] px-4 py-2 font-semibold text-white">Quay lại nhập dữ liệu</button></div> : <div className="mt-5 flex flex-col gap-5">
        <div className="clinical-card rounded-lg border-2 border-[#7f948d] bg-[#f7faf8] p-4" data-no-print>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#123c36]">Lưu phiếu &amp; xuất báo cáo</p>
          <div className="mt-3 flex flex-col gap-3"><ServerRationActions rows={rows} profile={profile} /><ReportActions rows={rows} profile={profile} meta={reportMeta} mode={rationMode} onMetaChange={setReportMeta} /></div>
        </div>
        <div className="flex flex-col gap-5"><section className="rounded-lg border-2 border-[#123c36] bg-[#eaf3ee] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold text-[#123c36]">Hồ sơ &amp; đối chiếu nhu cầu</h2><button type="button" data-no-print onClick={() => setActiveView("entry")} className="rounded-md border border-[#123c36] bg-white px-3 py-1.5 text-sm font-semibold text-[#123c36] hover:bg-white/70">✏️ Sửa hồ sơ</button></div><ProfileSummary profile={profile} /><div className="mt-4 flex flex-col gap-5">{profile && <RecommendationComparison profile={profile} totals={totals} />}<MicronutrientComparison rows={rows} profile={profile} /><DietCodeComparison totals={totals} /></div></section><section className="rounded-lg border-2 border-[#7f948d] bg-white p-4"><h2 className="mb-3 text-lg font-semibold text-neutral-950">Tổng dinh dưỡng theo từng bữa</h2><MealNutritionCards rows={rows} totalKcal={totals.energyKcal} /></section><div className="rounded-lg border-2 border-[#7f948d] bg-white p-4"><div className="mb-3 flex items-baseline justify-between"><h2 className="text-lg font-semibold text-neutral-950">Tổng dinh dưỡng (tất cả bữa)</h2><span className="text-sm text-neutral-800">{foodRows.length} thực phẩm · {round(totalGrams)} g sống sạch</span></div><div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">{CORE_CALC_FIELDS.map((field) => <div key={field.key} className="flex items-baseline justify-between gap-2 text-sm"><span className="text-neutral-800">{field.label}</span><span className="font-semibold text-neutral-950">{round(totals[field.key])} {field.unit}</span></div>)}</div><p className="mt-3 text-sm text-neutral-800">Tính trên 100 g phần ăn được (sống sạch); khối lượng mua xem ở bảng quy đổi.</p></div><EnergyDistribution rows={rows} totals={totals} profile={profile} /></div>
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Phân tích chuyên sâu (bấm để xem khi cần)</p>
          {ADVANCED_GROUPS.map(([key, label]) => {
            const isOpen = !!openAdvanced[key];
            return (
              <div key={key} className="overflow-hidden rounded-lg border-2 border-[#7f948d] bg-white">
                <button type="button" data-no-print onClick={() => setOpenAdvanced((s) => ({ ...s, [key]: !s[key] }))} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-[#123c36] hover:bg-emerald-50">
                  <span>{label} <span className="ml-1 text-xs font-normal text-neutral-500">— chuyên sâu</span></span>
                  <span className="shrink-0 text-base">{isOpen ? "▾" : "▸"}</span>
                </button>
                {isOpen && <div className="border-t-2 border-[#cdd9d3] p-4">{key === "exchange" ? <ExchangeUnits rows={rows} /> : <LegacyChartReport rows={rows} />}</div>}
              </div>
            );
          })}
        </div>
      </div>}
    </section>
  </div>;
}

// Ô ghi chú chung cho thực đơn/khẩu phần — nhỏ gọn mặc định, tự cao dần theo nội
// dung gõ vào (không cuộn ẩn bên trong ô). Cùng 1 state (reportMeta.menuNote)
// dùng ở cả bước 1 và bước 2 nên luôn đồng bộ; bản in/Excel lấy từ state này.
// Tóm tắt hồ sơ cá nhân (chỉ đọc) hiển thị ở đầu khu Kết quả — dữ liệu nhập/sửa
// vẫn ở bước 1; ở đây chỉ trình bày lại cho dễ đối chiếu với khuyến nghị.
// Tổng dinh dưỡng theo TỪNG bữa — thẻ gọn, nổi bật calo + thanh tỷ lệ P:L:G.
const MEAL_MACROS: { key: string; label: string; color: string }[] = [
  { key: "proteinG", label: "Đạm", color: "#2563eb" },
  { key: "lipidG", label: "Béo", color: "#d97706" },
  { key: "glucidG", label: "Bột đường", color: "#16a34a" },
];

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
  if (meals.length === 0) return <p className="text-sm text-neutral-600">Chưa có bữa nào có thực phẩm.</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {meals.map(({ meal, t }) => {
        const kcal = t.energyKcal || 0;
        const energies = [(t.proteinG || 0) * 4, (t.lipidG || 0) * 9, (t.glucidG || 0) * 4];
        const sumE = energies[0] + energies[1] + energies[2] || 1;
        const dayPct = totalKcal > 0 ? Math.round((kcal / totalKcal) * 100) : 0;
        return (
          <div key={meal} className="rounded-xl border border-[#cdd9d3] bg-[#f9fdfb] p-3 shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="min-w-0 truncate text-base font-bold text-[#123c36]">🍱 {meal}</h3>
              <div className="shrink-0 text-right"><span className="text-2xl font-extrabold text-[#0c5f4d]">{round(kcal)}</span> <span className="text-xs text-neutral-600">kcal · {dayPct}%</span></div>
            </div>
            <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-neutral-200" title="Tỷ lệ năng lượng Đạm : Béo : Bột đường">
              {MEAL_MACROS.map((mm, i) => <div key={mm.key} style={{ width: `${(energies[i] / sumE) * 100}%`, background: mm.color }} />)}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-800">
              {MEAL_MACROS.map((mm) => <span key={mm.key} className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: mm.color }} />{mm.label} <b className="text-neutral-950">{round(t[mm.key] || 0)}g</b></span>)}
              {(t.fiberG || 0) > 0 && <span className="text-neutral-600">· Xơ {round(t.fiberG)}g</span>}
              {(t.sodiumMg || 0) > 0 && <span className="text-neutral-600">· Natri {round(t.sodiumMg)}mg</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProfileSummary({ profile }: { profile: Profile | null }) {
  if (!profile) return <p className="mt-3 text-sm text-neutral-800">Chưa nhập hồ sơ cá nhân — bấm “✏️ Sửa hồ sơ” để nhập tuổi, giới, chiều cao, cân nặng (cần cho đối chiếu nhu cầu).</p>;
  const h = Number(profile.height), w = Number(profile.weight);
  const bmi = h > 0 && w > 0 ? Math.round((w / (h / 100) ** 2) * 10) / 10 : null;
  const activity = { sedentary: "Tĩnh tại", light: "Nhẹ", moderate: "Trung bình", heavy: "Nặng", very_heavy: "Rất nặng" }[profile.activityLevel];
  const physiology = { normal: "", pregnant_1: "Thai kỳ (3 tháng đầu)", pregnant_2: "Thai kỳ (3 tháng giữa)", pregnant_3: "Thai kỳ (3 tháng cuối)", lactating_1: "Cho bú (0–6 tháng)", lactating_2: "Cho bú (6–12 tháng)" }[profile.physiology];
  const chips: [string, string][] = [
    ["Giới", profile.gender],
    ["Tuổi", `${profile.age || "—"} ${profile.ageUnit === "thang" ? "tháng" : "tuổi"}`],
    ["Chiều cao", profile.height ? `${profile.height} cm` : "—"],
    ["Cân nặng", profile.weight ? `${profile.weight} kg` : "—"],
    ["BMI", bmi != null ? String(bmi) : "—"],
    ["Vận động", activity],
  ];
  if (physiology) chips.push(["Sinh lý", physiology]);
  return <div className="mt-3 flex flex-wrap gap-2">{chips.map(([label, value]) => <span key={label} className="inline-flex items-baseline gap-1 rounded-md border border-[#8fa99e] bg-white px-2.5 py-1 text-sm"><span className="text-neutral-600">{label}:</span><span className="font-semibold text-neutral-950">{value}</span></span>)}</div>;
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
