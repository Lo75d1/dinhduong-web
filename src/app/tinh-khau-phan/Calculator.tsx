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
import ClinicalSummary from "./ClinicalSummary";
import MicronutrientComparison from "./MicronutrientComparison";
import ExchangeUnits from "./ExchangeUnits";
import ReportActions from "./ReportActions";
import Modal from "./Modal";
import type { ReportMeta } from "./ReportActions";
import ServerRationActions from "./ServerRationActions";
import type { RationMode, Row } from "./types";

const round = (n: number) => Math.round(n * 10) / 10;
const RESULT_GROUPS: [string, string][] = [["exchange", "Quy đổi thực đơn"], ["charts", "10 biểu đồ phân tích"]];

export default function Calculator() {
  const [rows, setRows] = useState<Row[]>([]);
  const [rationMode, setRationMode] = useState<RationMode>("recall24h");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [resultModal, setResultModal] = useState<string | null>(null);
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
      <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1"><MealInput onRowsChange={setRows} onModeChange={setRationMode} profileSlot={<PersonalProfile onChange={setProfile} />} /><div className="lg:hidden"><NoteBox value={reportMeta.menuNote} onChange={setMenuNote} /></div></div>
      <div className="mt-3 flex shrink-0 justify-end border-t-2 border-[#7f948d] pt-3"><button onClick={() => setActiveView("analysis")} className="rounded-md bg-[#123c36] px-5 py-2.5 font-semibold text-white">Sang kết quả &amp; phân tích →</button></div>
    </section>

    <section className={activeView === "analysis" ? "clinical-panel min-w-0 rounded-xl border-2 border-[#7f948d] bg-white p-6" : "hidden"}>
      <section data-print-header><p className="text-center text-sm font-semibold tracking-[0.16em] text-[#123c36]">BÁO CÁO PHÂN TÍCH KHẨU PHẦN</p><h1 className="mt-2 text-center text-2xl font-semibold">Phiếu đánh giá dinh dưỡng</h1><div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 border-y-2 border-[#123c36] py-3 text-sm"><p><b>Người được đánh giá:</b> {reportMeta.subjectName || "Chưa ghi"}</p><p><b>Ngày lập:</b> {reportMeta.reportDate || "Chưa ghi"}</p><p><b>Nhóm / mục tiêu:</b> {reportMeta.subjectGroup || "Chưa ghi"}</p><p><b>Người lập:</b> {reportMeta.authorName || "Chưa ghi"} ({reportMeta.authorRole})</p><p className="col-span-2"><b>Đơn vị / cơ sở:</b> {reportMeta.authorOrganization || "Chưa ghi"}</p><p className="col-span-2"><b>Hồ sơ:</b> {profile ? `${profile.gender}, ${profile.age || "—"} ${profile.ageUnit}, ${profile.weight || "—"} kg, ${profile.height || "—"} cm${profile.physiology.startsWith("pregnant_") ? ` · Thai kỳ: ${profile.pregnancyWeek ? `tuần ${profile.pregnancyWeek}` : "chưa ghi tuần"}${profile.prePregnancyWeight ? ` · trước thai ${profile.prePregnancyWeight} kg` : ""}` : ""}` : "Chưa nhập"}</p>{profile?.pregnancyNote && <p className="col-span-2"><b>Ghi chú thai kỳ:</b> {profile.pregnancyNote}</p>}{reportMeta.menuNote && <p className="col-span-2"><b>Ghi chú thực đơn / khẩu phần:</b> {reportMeta.menuNote}</p>}{reportMeta.clinicalCourse && <p className="col-span-2"><b>Diễn biến bệnh lý / theo dõi:</b> {reportMeta.clinicalCourse}</p>}</div></section>
      <div className="border-b-2 border-[#123c36] pb-3"><p className="text-xs font-semibold tracking-[0.14em] text-[#123c36]">BƯỚC 2 · KẾT QUẢ</p><h2 className="mt-1 text-2xl font-semibold text-neutral-950">Kết quả &amp; phân tích</h2></div>
      <NoteBox value={reportMeta.menuNote} onChange={setMenuNote} />
      {foodRows.length === 0 ? <div className="mt-5 rounded-lg border-2 border-dashed border-neutral-400 bg-white px-5 py-10 text-center text-neutral-900"><p>Thêm thực phẩm ở bước Nhập khẩu phần để bắt đầu phân tích.</p><button onClick={() => setActiveView("entry")} className="mt-4 rounded-md bg-[#123c36] px-4 py-2 font-semibold text-white">Quay lại nhập dữ liệu</button></div> : <div className="mt-5 flex flex-col gap-5">
        <div className="clinical-card rounded-lg border-2 border-[#7f948d] bg-[#f7faf8] p-4" data-no-print>
          <h3 className="font-semibold text-neutral-950">Xem thêm nhóm kết quả (mở popup)</h3>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{RESULT_GROUPS.map(([key, label]) => <button key={key} type="button" onClick={() => setResultModal(key)} className="w-full rounded-md border-2 border-[#123c36] bg-white px-3 py-2.5 text-sm font-semibold text-[#123c36] hover:bg-emerald-50">{label}</button>)}</div>
          <div className="mt-4 border-t-2 border-[#cdd9d3] pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#123c36]">Lưu phiếu &amp; xuất báo cáo</p>
            <div className="mt-3 flex flex-col gap-3"><ServerRationActions rows={rows} profile={profile} /><ReportActions rows={rows} profile={profile} meta={reportMeta} mode={rationMode} onMetaChange={setReportMeta} /></div>
          </div>
        </div>
        <div className="flex flex-col gap-5"><section className="rounded-lg border-2 border-[#123c36] bg-[#eaf3ee] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold text-[#123c36]">Hồ sơ &amp; đối chiếu nhu cầu</h2><button type="button" data-no-print onClick={() => setActiveView("entry")} className="rounded-md border border-[#123c36] bg-white px-3 py-1.5 text-sm font-semibold text-[#123c36] hover:bg-white/70">✏️ Sửa hồ sơ</button></div><ProfileSummary profile={profile} /><div className="mt-4 flex flex-col gap-5">{profile && <RecommendationComparison profile={profile} totals={totals} />}<MicronutrientComparison rows={rows} profile={profile} /><DietCodeComparison totals={totals} /></div></section><ClinicalSummary rows={rows} totals={totals} profile={profile} /><div className="rounded-lg border-2 border-[#7f948d] bg-white p-4"><div className="mb-3 flex items-baseline justify-between"><h2 className="text-lg font-semibold text-neutral-950">Tổng dinh dưỡng (tất cả bữa)</h2><span className="text-sm text-neutral-800">{foodRows.length} thực phẩm · {round(totalGrams)} g sống sạch</span></div><div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">{CORE_CALC_FIELDS.map((field) => <div key={field.key} className="flex items-baseline justify-between gap-2 text-sm"><span className="text-neutral-800">{field.label}</span><span className="font-semibold text-neutral-950">{round(totals[field.key])} {field.unit}</span></div>)}</div><p className="mt-3 text-sm text-neutral-800">Tính trên 100 g phần ăn được (sống sạch); khối lượng mua xem ở bảng quy đổi.</p></div><EnergyDistribution rows={rows} totals={totals} profile={profile} /><RationDetail rows={rows} mode={rationMode} /></div>
        <Modal printable open={resultModal === "exchange"} onClose={() => setResultModal(null)} title="Quy đổi thực đơn" maxWidth="max-w-5xl">
          <ExchangeUnits rows={rows} />
        </Modal>
        <Modal printable open={resultModal === "charts"} onClose={() => setResultModal(null)} title="10 biểu đồ phân tích" maxWidth="max-w-5xl">
          <LegacyChartReport rows={rows} />
        </Modal>
      </div>}
    </section>
  </div>;
}

// Ô ghi chú chung cho thực đơn/khẩu phần — nhỏ gọn mặc định, tự cao dần theo nội
// dung gõ vào (không cuộn ẩn bên trong ô). Cùng 1 state (reportMeta.menuNote)
// dùng ở cả bước 1 và bước 2 nên luôn đồng bộ; bản in/Excel lấy từ state này.
// Tóm tắt hồ sơ cá nhân (chỉ đọc) hiển thị ở đầu khu Kết quả — dữ liệu nhập/sửa
// vẫn ở bước 1; ở đây chỉ trình bày lại cho dễ đối chiếu với khuyến nghị.
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
