import type { ReactNode } from "react";

export default function HelpPanel({ children }: { children: ReactNode }) {
  return <details className="admin-help rounded-lg border border-[#c3d3cb] bg-white">
    <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-2 font-semibold text-[#123c36]">
      <span>Trợ giúp &amp; hướng dẫn</span><span className="admin-help-toggle text-sm font-normal" aria-hidden="true" />
    </summary>
    <div className="space-y-3 border-t border-[#dce6e0] px-4 py-3 text-sm leading-6 text-neutral-700">{children}</div>
  </details>;
}
