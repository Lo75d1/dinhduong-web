"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CustomFoodInput, MenuInput, ResolvedMenu } from "@/lib/nutrition-chat/contracts";
import { savedCalculatorUrl, libraryCalculatorUrl } from "@/lib/nutrition-chat/calculator-links";
import { libraryMenuInput } from "@/lib/nutrition-chat/library-menu-input";
import { readNutritionResponse } from "../../client-api";
import ReuseSavedMenu, { type Prepared, type SavedTarget } from "./ReuseSavedMenu";
import SavedLibraryLinks from "@/app/tai-khoan/SavedLibraryLinks";
import CalculatorNavigation, { useCalculatorHeader } from "@/app/tinh-khau-phan/CalculatorNavigation";
import { LinkedCalculatorResults } from "../../ban-tam/WebMenuView";

type Saved = Prepared & { ration: SavedTarget; sourceChanged?: boolean };
type Initial = { input: MenuInput; names: Record<string, string> };
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c36]";

export function AccountMenuWorkspace({ result, initial, onSaved, onDelete, onRefresh }: { result?: Saved; initial?: Initial; onSaved?: (ration: SavedTarget, prepared: Prepared) => void; onDelete?: () => void; onRefresh?: () => void }) {
  const headerSlot = useCalculatorHeader();
  const [view, setView] = useState<"entry" | "analysis">(result ? "analysis" : "entry");
  const [preview, setPreview] = useState<ResolvedMenu | null>(result?.preview ?? null);
  const [dirty, setDirty] = useState(false), [draftResult, setDraftResult] = useState(false);
  const days = preview?.days ?? initial?.input.days ?? [];
  const navigation = <CalculatorNavigation pageMode={days.length > 1 ? "multi" : "single"} activeView={view} foodCount={days.reduce((sum, day) => sum + day.rows.length, 0)} onViewChange={setView}/>;
  return <>
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#9bb6ab] bg-[#f4f8f5] px-4 py-3 text-sm">
      <div className="min-w-0 flex-1"><p className="font-semibold">{result ? result.ration.title : "Thực đơn mới của bạn"}</p><p className="mt-1 text-neutral-600">{result ? `Đã lưu trong tài khoản · phiên bản ${result.ration.revision}` : "Chọn món và thực phẩm, kiểm tra rồi lưu vào tài khoản."}</p></div>
      <Link href="/tai-khoan/thuc-don" className={`font-semibold underline underline-offset-4 ${focus}`}>Thực đơn của tôi</Link>
      {onRefresh ? <button type="button" onClick={() => { if (!dirty || window.confirm("Đọc lại bản đã lưu sẽ bỏ các chỉnh sửa chưa lưu. Tiếp tục?")) onRefresh(); }} className={`underline underline-offset-4 ${focus}`}>Đọc lại bản lưu</button> : null}
      {onDelete ? <button type="button" onClick={onDelete} className={`text-red-800 underline underline-offset-4 ${focus}`}>Xóa thực đơn</button> : null}
    </div>
    {headerSlot ? createPortal(navigation, headerSlot) : navigation}
    {result?.sourceChanged ? <p role="status" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Nguồn đã đổi từ lần lưu trước. Báo cáo được tính lại theo dữ liệu hiện tại; kiểm tra và xác nhận trước khi lưu thay đổi.</p> : null}
    {dirty ? <p role="status" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Đã sửa đầu vào. Bấm Xem trước và tính lại để cập nhật kết quả trước khi lưu.</p> : null}
    {!dirty && preview?.warnings.length ? <details className="rounded border border-[#d4dfd8] bg-white p-3 text-sm"><summary className="cursor-pointer font-semibold">Lưu ý về nguồn và số liệu ({preview.warnings.length})</summary><ul className="mt-3 list-disc space-y-1 pl-5 text-neutral-700">{[...new Set(preview.warnings)].map(warning=><li key={warning}>{warning}</li>)}</ul></details> : null}
    <section className={view === "entry" ? "clinical-panel flex min-w-0 flex-col lg:h-[calc(100vh-10rem)]" : "clinical-panel min-w-0"}>
      <ReuseSavedMenu menu={result?.preview} initialInput={initial?.input} initialNames={initial?.names} initialPrepared={result} savedTarget={result?.ration} layout="calculator" view={view} onDraftChange={() => setDirty(true)} onPrepared={value => { setPreview(value); setDirty(false); setDraftResult(true); setView("analysis"); }} onSaved={(ration, prepared) => { setDraftResult(false); onSaved?.(ration, prepared); }}/>
    </section>
    {view === "analysis" && !dirty && preview ? <LinkedCalculatorResults menu={preview} draft={draftResult}/> : null}
    {view === "analysis" && !preview ? <p className="clinical-panel text-sm text-neutral-700">Chưa có kết quả. Nhập món và thực phẩm rồi bấm Xem trước và tính lại.</p> : null}
    {result && !dirty && !draftResult ? <SavedLibraryLinks menu={preview ?? result.preview} rationId={result.ration.id}/> : null}
  </>;
}

export default function SavedMenuView({ rationId, library, createNew }: { rationId?: string; library?: { kind: "food" | "dish"; id: string }; createNew?: boolean }) {
  const router = useRouter(), deleteDialog = useRef<HTMLDialogElement>(null);
  const [result, setResult] = useState<Saved | undefined>(), [initial, setInitial] = useState<Initial | undefined>();
  const [loading, setLoading] = useState(true), [refresh, setRefresh] = useState(0), [error, setError] = useState(""), [deleting, setDeleting] = useState(false);
  const kind = library?.kind, itemId = library?.id;
  const next = rationId ? savedCalculatorUrl(rationId) : libraryCalculatorUrl(kind, itemId);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (rationId) {
        const value = await readNutritionResponse<Saved>(await fetch(`/api/nutrition/v1/saved?id=${encodeURIComponent(rationId)}`, { cache: "no-store", signal: controller.signal }));
        if (value.ration?.id !== rationId || !Array.isArray(value.preview?.days) || typeof value.confirmationToken !== "string") throw new Error("Chưa đọc được bản lưu hợp lệ.");
        if (!controller.signal.aborted) setResult(value);
      } else if (kind && itemId) {
        const item = await readNutritionResponse<{ content: CustomFoodInput | MenuInput; preview?: ResolvedMenu }>(await fetch(`/api/personal-library/${kind}?id=${encodeURIComponent(itemId)}`, { cache: "no-store", signal: controller.signal }));
        if (!controller.signal.aborted) setInitial(libraryMenuInput(kind, item));
      } else if (createNew) {
        const account = await readNutritionResponse<{ user: unknown }>(await fetch("/api/auth/me", { cache: "no-store", signal: controller.signal }));
        if (!account.user) throw new Error("Đăng nhập để lưu và dùng lại thực đơn của bạn.");
        if (!controller.signal.aborted) setInitial(libraryMenuInput());
      }
    }
    void load().catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Chưa mở được thực đơn."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [rationId, kind, itemId, createNew, refresh]);
  function readAgain() { setResult(undefined); setInitial(undefined); setError(""); setLoading(true); setRefresh(value => value + 1); }
  async function deleteMenu() {
    if (!result || deleting) return;
    setDeleting(true); setError("");
    try {
      const value = await readNutritionResponse<{ deleted: boolean }>(await fetch("/api/nutrition/v1/saved", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: result.ration.id, expectedRevision: result.ration.revision }) }));
      if (value.deleted !== true) throw new Error("Chưa xác nhận được việc xóa; đọc lại bản lưu để kiểm tra.");
      deleteDialog.current?.close(); router.push("/tai-khoan/thuc-don");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa xóa được thực đơn."); deleteDialog.current?.close(); }
    finally { setDeleting(false); }
  }
  return <>
    {loading ? <p role="status" className="clinical-panel text-neutral-700">Đang mở thực đơn của tài khoản…</p> : null}
    {error ? <div role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-red-800"><p>{error}</p><Link href={`/dang-nhap?next=${encodeURIComponent(next)}`} className={`mt-2 inline-block underline ${focus}`}>Đăng nhập tài khoản</Link><button type="button" onClick={readAgain} className={`ml-4 underline ${focus}`}>Thử mở lại</button></div> : null}
    {result || initial ? <AccountMenuWorkspace key={`${rationId ?? `${kind ?? "new"}:${itemId ?? ""}`}:${refresh}`} result={result} initial={initial} onRefresh={result ? readAgain : undefined} onDelete={result ? () => deleteDialog.current?.showModal() : undefined} onSaved={(ration, prepared) => setResult({ ...prepared, ration })}/> : null}
    <dialog ref={deleteDialog} aria-labelledby="delete-menu-title" className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-lg border border-[#9bb6ab] bg-white p-6 text-[#123c36] backdrop:bg-black/30" onCancel={event => { if (deleting) event.preventDefault(); }}><h2 id="delete-menu-title" className="text-xl font-semibold">Xóa thực đơn này?</h2><p className="mt-3">Bản “{result?.ration.title}” sẽ bị xóa khỏi tài khoản và không thể mở lại.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={deleting} onClick={() => deleteDialog.current?.close()} className="rounded border border-[#123c36] px-4 py-2">Giữ bản này</button><button type="button" disabled={deleting} onClick={() => void deleteMenu()} className="rounded bg-red-800 px-4 py-2 font-semibold text-white disabled:opacity-50">{deleting ? "Đang xóa…" : "Xác nhận xóa"}</button></div></dialog>
  </>;
}
