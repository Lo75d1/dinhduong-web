"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function CalculatorHeading() {
  return <section className="clinical-page-heading"><p className="text-xs font-semibold tracking-[0.16em] text-[#123c36]">PHIẾU PHÂN TÍCH DINH DƯỠNG</p><h1 className="mt-1 text-3xl font-semibold text-neutral-950">Phân tích khẩu phần</h1><div className="mt-2 flex flex-wrap items-center gap-3"><Link href="/huong-dan" className="rounded-md border-2 border-[#123c36] bg-white px-3 py-1 text-sm font-semibold text-[#123c36] hover:bg-[#edf4f0]">? Xem hướng dẫn</Link></div></section>;
}

export function CalculatorInputPanel({ active, children }: { active: boolean; children: ReactNode }) {
  return <section data-calculator-entry className={active ? "mode-panel-enter clinical-panel flex min-w-0 flex-col lg:h-[calc(100vh-5.25rem)] lg:overflow-hidden" : "hidden"}>{children}</section>;
}

export function CalculatorResultsHeading({ draft = false, title }: { draft?: boolean; title?: string }) {
  return <div className="border-b-2 border-[#123c36] pb-3"><p className="text-xs font-semibold tracking-[0.14em] text-[#123c36]">BƯỚC 2 · KẾT QUẢ{draft ? " · BẢN TÍNH NHÁP" : ""}</p><h2 className="mt-1 text-2xl font-semibold text-neutral-950">Kết quả &amp; phân tích</h2>{title ? <p className="mt-1 font-semibold">{title}</p> : null}</div>;
}

/** One daily report layout for manual, conversation and saved menu data. */
export function CalculatorResultsLayout({ actions, profile, recommendations, overview, analysis, detail }: { actions?: ReactNode; profile: ReactNode; recommendations: ReactNode; overview: ReactNode; analysis: ReactNode; detail: ReactNode }) {
  return <div className="mt-4 flex flex-col gap-3" data-calculator-daily-results>
    {actions ? <div className="clinical-card flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-lg border-2 border-[#7f948d] bg-[#f7faf8] px-4 py-2.5" data-no-print>{actions}</div> : null}
    <section className="rounded-lg border-2 border-[#123c36] bg-[#eaf3ee] p-3">
      <h2 className="mb-3 text-lg font-semibold text-[#123c36]">1 · Hồ sơ &amp; khuyến nghị dinh dưỡng</h2>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start lg:gap-4">
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-2">{profile}</div>
        <div className="mt-4 flex min-w-0 flex-col gap-4 lg:mt-0">{recommendations}</div>
      </div>
    </section>
    <section className="rounded-lg border-2 border-[#7f948d] bg-white p-3">
      <h2 className="mb-3 text-lg font-semibold text-neutral-950">2 · Khẩu phần &amp; phân tích</h2>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start lg:gap-4">
        <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-2">{overview}</div>
        <div className="mt-4 flex min-w-0 flex-col gap-4 lg:mt-0">{analysis}</div>
      </div>
    </section>
    <section className="rounded-lg border-2 border-[#7f948d] bg-white p-3">
      <h2 className="text-lg font-semibold text-neutral-950">3 · Dinh dưỡng khẩu phần chi tiết <span className="text-sm font-normal text-neutral-600">— chuyên sâu, dành cho dinh dưỡng viên</span></h2>
      <p className="mb-3 mt-1 text-sm text-neutral-700">Bảng theo Bữa → Món → Thực phẩm, có tổng từng món/bữa/ngày và nút “⚙ Chọn chất”.</p>
      {detail}
    </section>
  </div>;
}
