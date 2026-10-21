import type { ReactNode } from "react";
import Icon from "./Icon";

export default function HelpPanel({ children }: { children: ReactNode }) {
  return <details className="admin-help rounded-lg border border-[var(--line)] bg-white">
    <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-2 font-semibold text-[var(--brand)]">
      <span className="flex items-center gap-2"><Icon name="circle-help" />Trợ giúp &amp; hướng dẫn</span><span className="admin-help-toggle text-sm font-normal" aria-hidden="true" />
    </summary>
    <div className="space-y-3 border-t border-[var(--line)] px-4 py-3 text-sm leading-6 text-neutral-700">{children}</div>
  </details>;
}
