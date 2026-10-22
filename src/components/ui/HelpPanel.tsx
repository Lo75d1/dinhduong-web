import type { ReactNode } from "react";
import Icon from "./Icon";

export default function HelpPanel({ children }: { children: ReactNode }) {
  return <details className="admin-help rounded-lg border border-[var(--line)] bg-white">
    <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 py-2 text-base font-medium text-[var(--ink)]">
      <span className="flex min-w-0 items-center gap-2"><Icon name="circle-help" className="h-4 w-4 text-[var(--muted)]" />Trợ giúp &amp; hướng dẫn</span><span className="admin-help-toggle shrink-0 whitespace-nowrap text-[13px] font-normal text-[var(--muted)]" aria-hidden="true" />
    </summary>
    <div className="space-y-3 border-t border-[var(--line)] px-4 py-3 text-sm leading-6 text-neutral-700">{children}</div>
  </details>;
}
