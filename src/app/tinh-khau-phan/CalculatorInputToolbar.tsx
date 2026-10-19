"use client";

import type { ReactNode } from "react";
import type { RationMode } from "./types";

export default function CalculatorInputToolbar({mode,disabled,onModeChange,children,hideMode=false}:{mode:RationMode;disabled:boolean;onModeChange:(mode:RationMode)=>void;children?:ReactNode;hideMode?:boolean}) {
  return <div className="flex shrink-0 flex-wrap items-center gap-2" data-calculator-input-toolbar>{!hideMode&&<ModeSelector mode={mode} disabled={disabled} onChange={onModeChange}/>}<fieldset disabled={disabled} className="contents">{children}</fieldset></div>;
}

function ModeSelector({ mode, disabled, onChange }: { mode: RationMode; disabled: boolean; onChange: (mode: RationMode) => void }) {
  const isRecall = mode === "recall24h";
  // Gọn thành segmented control 1 hàng để chừa tối đa chiều dọc cho 2 khung cây/chi tiết.
  return (
    <div className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-neutral-300 bg-white p-0.5" role="group" aria-label="Chế độ nhập khẩu phần">
      <button type="button" disabled={disabled} onClick={() => onChange("recall24h")} aria-pressed={isRecall} title="Khẩu phần 24 giờ: nhập lượng đã ăn + hệ số đổi về sống sạch" className={`rounded px-2.5 py-1.5 text-xs font-semibold disabled:cursor-wait disabled:opacity-60 ${isRecall ? "bg-emerald-700 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}>
        Khẩu phần 24h
      </button>
      <button type="button" disabled={disabled} onClick={() => onChange("menu")} aria-pressed={!isRecall} title="Lập thực đơn: nhập trực tiếp lượng sống sạch" className={`rounded px-2.5 py-1.5 text-xs font-semibold disabled:cursor-wait disabled:opacity-60 ${!isRecall ? "bg-emerald-700 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}>
        Lập thực đơn
      </button>
    </div>
  );
}
