"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MenuInput, ResolvedMenu } from "@/lib/nutrition-chat/contracts";
import NutritionMenuAnalysis, { NutritionMenuInput } from "../../NutritionMenuAnalysis";
import { readNutritionResponse, sameSiteNutritionDownload, type NutritionDownload } from "../../client-api";

type Saved = { ration: { id: string; title: string; revision: number }; input: MenuInput; preview: ResolvedMenu; confirmationToken: string; sourceChanged?: boolean };
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c36]";

export default function SavedMenuView({ rationId }: { rationId: string }) {
  const router = useRouter();
  const [result, setResult] = useState<Saved | null>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [download, setDownload] = useState<NutritionDownload | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deleteDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/nutrition/v1/saved?id=${encodeURIComponent(rationId)}`, { cache: "no-store", signal: controller.signal })
      .then(response => readNutritionResponse<Saved>(response))
      .then(value => {
        if (typeof value.ration?.id !== "string" || !Array.isArray(value.preview?.days) || typeof value.confirmationToken !== "string") throw new Error("Chưa đọc được bản lưu hợp lệ.");
        if (!controller.signal.aborted) setResult(value);
      })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Chưa mở được bản lưu."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [rationId, refresh]);

  function readAgain() {
    setResult(null); setError(""); setConfirmed(false); setDownload(null); setLoading(true); setRefresh(value => value + 1);
  }
  async function exportFile() {
    if (!result || !confirmed || result.preview.missingInputs.length || exporting || deleting) return;
    setExporting(true); setError("");
    try {
      const value = await readNutritionResponse<NutritionDownload>(await fetch("/api/nutrition/v1/export", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: result.preview.input, confirmationToken: result.confirmationToken }),
      }));
      setDownload(sameSiteNutritionDownload(value));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa xuất được Excel."); }
    finally { setExporting(false); }
  }
  async function deleteMenu() {
    if (!result || deleting || exporting) return;
    setDeleting(true); setError("");
    try {
      const value = await readNutritionResponse<{ deleted: boolean }>(await fetch("/api/nutrition/v1/saved", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: result.ration.id, expectedRevision: result.ration.revision }),
      }));
      if (value.deleted !== true) throw new Error("Chưa xác nhận được việc xóa. Đọc lại bản để kiểm tra.");
      deleteDialog.current?.close(); router.push("/ket-noi-ai/ban-luu");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa xóa được bản."); deleteDialog.current?.close(); }
    finally { setDeleting(false); }
  }

  return <div className="mt-6 rounded-xl border border-[#b1c8bd] bg-white p-5 sm:p-7">
    {loading ? <p role="status" className="text-neutral-700">Đang mở bản lưu của tài khoản…</p> : null}
    {error ? <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-800"><p>{error}</p><Link href="/dang-nhap" className={`mt-2 inline-block underline ${focus}`}>Đăng nhập tài khoản</Link></div> : null}
    {result ? <>
      <h2 className="text-2xl font-semibold">{result.ration.title}</h2><p className="mt-1 text-sm text-neutral-700">Phiên bản {result.ration.revision}. Bản này thuộc tài khoản đang đăng nhập.</p>
      {result.sourceChanged ? <p role="status" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Dữ liệu nguồn đã đổi so với lần lưu. Phân tích dưới đây đã tính lại theo nguồn hiện tại; hãy xem lại trước khi xuất.</p> : null}
      <details className="mt-5"><summary className={`cursor-pointer font-semibold ${focus}`}>Đầu vào đã lưu</summary><NutritionMenuInput menu={result.preview} /></details>
      {result.preview.warnings.length || result.preview.missingInputs.length ? <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900"><p className="font-semibold">Cảnh báo của bản này</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{[...new Set([...result.preview.warnings, ...result.preview.missingInputs.map(item => item.message)])].map(warning => <li key={warning}>{warning}</li>)}</ul></div> : null}
      <NutritionMenuAnalysis menu={result.preview} />
      <label className="mt-6 flex items-start gap-3"><input type="checkbox" checked={confirmed} disabled={exporting} onChange={event => setConfirmed(event.target.checked)} className={`mt-1 h-5 w-5 shrink-0 accent-[#123c36] ${focus}`} /><span>Tôi đã xem đầu vào và nguồn của bản này, đồng ý xuất Excel để tiếp tục làm việc.</span></label>
      {result.preview.missingInputs.length ? <p className="mt-3 text-sm text-amber-900">Cần làm rõ đầu vào còn thiếu trong hội thoại trước khi xuất bản mới.</p> : null}
      <div className="mt-4 flex flex-wrap gap-4"><button type="button" disabled={!confirmed || !!result.preview.missingInputs.length || exporting || deleting} onClick={() => void exportFile()} className={`rounded-lg bg-[#123c36] px-4 py-2 font-semibold text-white hover:bg-[#0f5c51] disabled:cursor-not-allowed disabled:opacity-50 ${focus}`}>{exporting ? "Đang xuất…" : "Xuất Excel chỉnh được"}</button><button type="button" disabled={exporting || deleting} onClick={() => deleteDialog.current?.showModal()} className={`px-2 py-2 text-sm text-red-800 underline underline-offset-4 disabled:opacity-50 ${focus}`}>Xóa bản này</button></div>
      {download ? <div role="status" className="mt-4 rounded-lg bg-[#eaf3ee] p-3"><a href={download.downloadUrl} download={download.filename} className={`font-semibold underline ${focus}`}>Tải {download.filename}</a><p className="mt-1 text-sm text-neutral-700">Link hết hạn: {new Date(download.expiresAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}.</p></div> : null}
    </> : null}
    {!loading ? <button type="button" disabled={exporting || deleting} onClick={readAgain} className={`mt-5 text-sm underline underline-offset-4 disabled:opacity-50 ${focus}`}>Đọc lại bản và làm mới quyền xuất</button> : null}
    <dialog ref={deleteDialog} aria-labelledby="delete-menu-title" aria-describedby="delete-menu-description" onCancel={event => { if (deleting) event.preventDefault(); }} className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-xl border border-[#b1c8bd] bg-white p-6 text-[#123c36] backdrop:bg-black/30"><h2 id="delete-menu-title" className="text-xl font-semibold">Xóa bản khẩu phần này?</h2><p id="delete-menu-description" className="mt-3 text-neutral-700">Bản “{result?.ration.title}” sẽ bị xóa khỏi tài khoản và không thể mở lại trên hệ thống. File Excel đã tải trên máy được giữ riêng.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={deleting} onClick={() => deleteDialog.current?.close()} className={`rounded-lg border border-[#123c36] px-4 py-2 font-semibold disabled:opacity-50 ${focus}`}>Giữ bản này</button><button type="button" disabled={deleting} onClick={() => void deleteMenu()} className={`rounded-lg bg-red-800 px-4 py-2 font-semibold text-white disabled:opacity-50 ${focus}`}>{deleting ? "Đang xóa…" : "Xác nhận xóa"}</button></div></dialog>
  </div>;
}
