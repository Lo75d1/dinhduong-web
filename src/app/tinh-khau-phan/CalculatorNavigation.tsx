"use client";
import { useEffect, useState } from "react";

export function useCalculatorHeader() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    document.body.classList.add("ration-focus");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The existing header slot is browser-owned.
    setSlot(document.getElementById("header-page-slot"));
    return () => document.body.classList.remove("ration-focus");
  }, []);
  return slot;
}

export default function CalculatorNavigation({ pageMode, activeView, foodCount, onViewChange, onPageModeChange }: { pageMode: "single" | "multi"; activeView: "entry" | "analysis"; foodCount: number; onViewChange: (view: "entry" | "analysis") => void; onPageModeChange?: (mode: "single" | "multi") => void }) {
  const multi = pageMode === "multi";
  return <div data-no-print className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center" data-calculator-navigation>
    <div className="inline-flex shrink-0 items-center self-start gap-1 rounded-lg sm:self-auto border border-[#7f948d] bg-white p-1" role="group" aria-label="Chế độ lập khẩu phần">
      {onPageModeChange ? (["single", "multi"] as const).map(mode => <button key={mode} type="button" onClick={() => onPageModeChange(mode)} aria-pressed={pageMode === mode} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${pageMode === mode ? mode === "multi" ? "bg-[#185FA5] text-white" : "bg-[#123c36] text-white" : "text-neutral-700 hover:bg-neutral-100"}`}>{mode === "single" ? "📋 Một ngày" : "🗓️ Nhiều ngày"}</button>) : <span className={`rounded-md px-3 py-1.5 text-sm font-semibold text-white ${multi ? "bg-[#185FA5]" : "bg-[#123c36]"}`}>{multi ? "🗓️ Nhiều ngày" : "📋 Một ngày"}</span>}
    </div>
    <nav className="clinical-stepper flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-[#7f948d] bg-white p-1" aria-label="Các bước tính khẩu phần">
      {(["entry", "analysis"] as const).map((view, index) => <button key={view} type="button" onClick={() => onViewChange(view)} aria-pressed={activeView === view} className={`clinical-step flex-1 rounded-md px-3 py-2 text-center text-sm font-semibold ${activeView === view ? multi ? "bg-[#185FA5] text-white" : "bg-[#123c36] text-white" : "text-neutral-800 hover:bg-neutral-100"}`}><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">{index + 1}</span>{view === "entry" ? multi ? "Nhập thực đơn" : "Nhập khẩu phần" : `Kết quả${foodCount ? ` · ${foodCount} TP` : ""}`}</button>)}
    </nav>
  </div>;
}
