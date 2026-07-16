"use client";

import { useState, type ChangeEvent } from "react";
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
import type { ReportMeta } from "./ReportActions";
import ServerRationActions from "./ServerRationActions";
import type { Row } from "./types";

const round = (n: number) => Math.round(n * 10) / 10;

export default function Calculator() {
  const [rows, setRows] = useState<Row[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [visibleSections, setVisibleSections] = useState<string[]>(["overview"]);
  const [activeView, setActiveView] = useState<"entry" | "analysis">("entry");
  const [reportMeta, setReportMeta] = useState<ReportMeta>(() => ({ subjectName: "", subjectGroup: "", clinicalCourse: "", authorName: "", authorRole: "Bác sĩ", authorOrganization: "", reportDate: new Date().toISOString().slice(0, 10), menuNote: "" }));
  const setMenuNote = (menuNote: string) => setReportMeta((current) => ({ ...current, menuNote }));
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
  const toggleSection = (key: string) => setVisibleSections((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);

  return <div className="calculation-workspace flex flex-col gap-6">
    <section className="clinical-page-heading">
      <p className="text-xs font-semibold tracking-[0.16em] text-[#123c36]">PHIẾU PHÂN TÍCH DINH DƯỠNG</p>
      <h1 className="mt-1 text-3xl font-semibold text-neutral-950">Phân tích khẩu phần</h1>
      <div className="mt-2 flex flex-wrap items-center gap-3"><p className="max-w-3xl text-neutral-800">Nhập thực phẩm theo bữa, tổng hợp dinh dưỡng và đối chiếu với nhu cầu khuyến nghị.</p><Link href="/huong-dan" className="rounded-md border-2 border-[#123c36] bg-white px-3 py-1 text-sm font-semibold text-[#123c36] hover:bg-[#edf4f0]">? Xem hướng dẫn thao tác</Link></div>
    </section>

    <nav className="clinical-stepper flex w-full rounded-xl border-2 border-[#7f948d] bg-white p-1.5" aria-label="Các bước tính khẩu phần">
      <button onClick={() => setActiveView("entry")} className={`clinical-step flex-1 rounded-lg px-4 py-3 text-left font-semibold ${activeView === "entry" ? "bg-[#123c36] text-white" : "text-neutral-900 hover:bg-neutral-100"}`} aria-pressed={activeView === "entry"}>
        <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-current text-sm">1</span>Nhập khẩu phần <span className="ml-2 hidden text-sm font-normal sm:inline">Hồ sơ, bữa ăn, món và thực phẩm</span>
      </button>
      <button onClick={() => setActiveView("analysis")} className={`clinical-step flex-1 rounded-lg px-4 py-3 text-left font-semibold ${activeView === "analysis" ? "bg-[#123c36] text-white" : "text-neutral-900 hover:bg-neutral-100"}`} aria-pressed={activeView === "analysis"}>
        <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-current text-sm">2</span>Kết quả &amp; phân tích <span className="ml-2 hidden text-sm font-normal sm:inline">{foodRows.length ? `${foodRows.length} thực phẩm đã nhập` : "Chưa có dữ liệu"}</span>
      </button>
    </nav>

    <section className={activeView === "entry" ? "clinical-panel rounded-xl border-2 border-[#7f948d] bg-[#f4f8f5] p-6" : "hidden"}>
      <div className="border-b-2 border-[#123c36] pb-4">
        <p className="text-xs font-semibold tracking-[0.14em] text-[#123c36]">BƯỚC 1 · NHẬP LIỆU</p>
        <h2 className="mt-1 text-2xl font-semibold text-neutral-950">Nhập dữ liệu khẩu phần</h2>
        <p className="mt-1 text-neutral-800">Nhập hồ sơ, tạo bữa/món và thêm thực phẩm trên toàn bộ chiều rộng màn hình.</p>
      </div>
      <div className="mt-5 flex flex-col gap-5"><PersonalProfile onChange={setProfile} /><MealInput onRowsChange={setRows} /><NoteBox value={reportMeta.menuNote} onChange={setMenuNote} /></div>
      <div className="mt-6 flex justify-end border-t-2 border-[#7f948d] pt-4"><button onClick={() => setActiveView("analysis")} className="rounded-md bg-[#123c36] px-5 py-3 font-semibold text-white">Sang kết quả &amp; phân tích →</button></div>
    </section>

    <section className={activeView === "analysis" ? "clinical-panel min-w-0 rounded-xl border-2 border-[#7f948d] bg-white p-6" : "hidden"}>
      <section data-print-header><p className="text-center text-sm font-semibold tracking-[0.16em] text-[#123c36]">BÁO CÁO PHÂN TÍCH KHẨU PHẦN</p><h1 className="mt-2 text-center text-2xl font-semibold">Phiếu đánh giá dinh dưỡng</h1><div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 border-y-2 border-[#123c36] py-3 text-sm"><p><b>Người được đánh giá:</b> {reportMeta.subjectName || "Chưa ghi"}</p><p><b>Ngày lập:</b> {reportMeta.reportDate || "Chưa ghi"}</p><p><b>Nhóm / mục tiêu:</b> {reportMeta.subjectGroup || "Chưa ghi"}</p><p><b>Người lập:</b> {reportMeta.authorName || "Chưa ghi"} ({reportMeta.authorRole})</p><p className="col-span-2"><b>Đơn vị / cơ sở:</b> {reportMeta.authorOrganization || "Chưa ghi"}</p><p className="col-span-2"><b>Hồ sơ:</b> {profile ? `${profile.gender}, ${profile.age || "—"} ${profile.ageUnit}, ${profile.weight || "—"} kg, ${profile.height || "—"} cm${profile.physiology.startsWith("pregnant_") ? ` · Thai kỳ: ${profile.pregnancyWeek ? `tuần ${profile.pregnancyWeek}` : "chưa ghi tuần"}${profile.prePregnancyWeight ? ` · trước thai ${profile.prePregnancyWeight} kg` : ""}` : ""}` : "Chưa nhập"}</p>{profile?.pregnancyNote && <p className="col-span-2"><b>Ghi chú thai kỳ:</b> {profile.pregnancyNote}</p>}{reportMeta.menuNote && <p className="col-span-2"><b>Ghi chú thực đơn / khẩu phần:</b> {reportMeta.menuNote}</p>}{reportMeta.clinicalCourse && <p className="col-span-2"><b>Diễn biến bệnh lý / theo dõi:</b> {reportMeta.clinicalCourse}</p>}</div></section>
      <div className="border-b-2 border-[#123c36] pb-3"><p className="text-xs font-semibold tracking-[0.14em] text-[#123c36]">BƯỚC 2 · KẾT QUẢ</p><h2 className="mt-1 text-2xl font-semibold text-neutral-950">Kết quả &amp; phân tích</h2><p className="mt-1 text-neutral-800">Chỉ tích các nhóm bảng cần dùng để màn hình gọn và đúng mục tiêu chuyên môn.</p></div>
      <NoteBox value={reportMeta.menuNote} onChange={setMenuNote} />
      {foodRows.length === 0 ? <div className="mt-5 rounded-lg border-2 border-dashed border-neutral-400 bg-white px-5 py-10 text-center text-neutral-900"><p>Thêm thực phẩm ở bước Nhập khẩu phần để bắt đầu phân tích.</p><button onClick={() => setActiveView("entry")} className="mt-4 rounded-md bg-[#123c36] px-4 py-2 font-semibold text-white">Quay lại nhập dữ liệu</button></div> : <div className="mt-5 flex flex-col gap-5">
        <div className="clinical-card rounded-lg border-2 border-[#7f948d] bg-[#f7faf8] p-4" data-no-print>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-neutral-950">Chọn nhóm kết quả cần xem</h3><p className="text-sm text-neutral-800">Có thể mở nhiều nhóm cùng lúc.</p></div><div className="flex flex-wrap items-center justify-end gap-2"><ServerRationActions rows={rows} profile={profile} /><ReportActions rows={rows} profile={profile} meta={reportMeta} onMetaChange={setReportMeta} /></div></div>
          <div className="mt-3 flex flex-wrap gap-2">{[["overview", "Tổng quan & khẩu phần"], ["clinical", "Khuyến nghị & vi chất"], ["exchange", "Quy đổi thực đơn"], ["charts", "10 biểu đồ phân tích"]].map(([key, label]) => <label key={key} className={`cursor-pointer rounded-md border-2 px-3 py-2 text-sm font-semibold ${visibleSections.includes(key) ? "border-[#123c36] bg-emerald-50 text-[#123c36]" : "border-neutral-400 bg-white text-neutral-900"}`}><input type="checkbox" checked={visibleSections.includes(key)} onChange={() => toggleSection(key)} className="mr-2" />{label}</label>)}</div>
        </div>
        {visibleSections.includes("overview") && <><ClinicalSummary rows={rows} totals={totals} profile={profile} /><div className="rounded-lg border-2 border-[#7f948d] bg-white p-4"><div className="mb-3 flex items-baseline justify-between"><h2 className="text-lg font-semibold text-neutral-950">Tổng dinh dưỡng (tất cả bữa)</h2><span className="text-sm text-neutral-800">{foodRows.length} thực phẩm · {round(totalGrams)}g</span></div><div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">{CORE_CALC_FIELDS.map((field) => <div key={field.key} className="flex items-baseline justify-between gap-2 text-sm"><span className="text-neutral-800">{field.label}</span><span className="font-semibold text-neutral-950">{round(totals[field.key])} {field.unit}</span></div>)}</div><p className="mt-3 text-sm text-neutral-800">Một số thực phẩm không được đo đủ mọi chất; chất thiếu số liệu được tính là 0 nên tổng có thể thấp hơn thực tế. Dữ liệu nhập vẫn được lưu tạm trên trình duyệt.</p></div><EnergyDistribution rows={rows} totals={totals} profile={profile} /><RationDetail rows={rows} /></>}
        {visibleSections.includes("clinical") && <>{profile && <RecommendationComparison profile={profile} totals={totals} />}<MicronutrientComparison rows={rows} profile={profile} /><DietCodeComparison totals={totals} /></>}
        {visibleSections.includes("exchange") && <ExchangeUnits rows={rows} />}
        {visibleSections.includes("charts") && <LegacyChartReport rows={rows} />}
      </div>}
    </section>
  </div>;
}

// Ô ghi chú chung cho thực đơn/khẩu phần — nhỏ gọn mặc định, tự cao dần theo nội
// dung gõ vào (không cuộn ẩn bên trong ô). Cùng 1 state (reportMeta.menuNote)
// dùng ở cả bước 1 và bước 2 nên luôn đồng bộ; bản in/Excel lấy từ state này.
function NoteBox({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  function autoGrow(event: ChangeEvent<HTMLTextAreaElement>) {
    const el = event.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    onChange(el.value);
  }
  return <div data-no-print className="rounded-lg border-2 border-[#7f948d] bg-white p-4">
    <label className="text-sm font-semibold text-neutral-950">Ghi chú thực đơn / khẩu phần
      <textarea value={value} onChange={autoGrow} rows={2} placeholder="Ghi chú chung cho cả thực đơn/khẩu phần này — sẽ hiện ở cả bước nhập liệu, kết quả và khi in/xuất báo cáo." className="mt-1 w-full resize-none overflow-hidden rounded-md border border-neutral-400 px-3 py-2 text-sm font-normal" />
    </label>
  </div>;
}
