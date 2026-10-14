"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { MenuInput, ResolvedMenu } from "@/lib/nutrition-chat/contracts";
import { ALL_NUTRIENT_FIELDS } from "@/lib/nutrient-fields";
import NutritionMenuAnalysis, { NutritionMenuInput } from "./NutritionMenuAnalysis";
import { readNutritionResponse, sameSiteNutritionDownload, type NutritionDownload } from "./client-api";

type ImportedMenu = { input: MenuInput; preview: ResolvedMenu; confirmationToken: string };
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c36]";

export default function WorkbookImport() {
  const [file, setFile] = useState<File | null>(null);
  const [imported, setImported] = useState<ImportedMenu | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState<"import" | "prepare" | "save" | "export" | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ id: string; title: string; revision: number } | null>(null);
  const [download, setDownload] = useState<NutritionDownload | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  function changeFile(value: File | null) {
    setFile(value); setImported(null); setConfirmed(false); setError(""); setSaved(null); setDownload(null);
    idempotencyKey.current = null;
  }

  async function previewFile() {
    if (!file || busy) return;
    setError("");
    if (!file.name.toLowerCase().endsWith(".xlsx") || file.size > MAX_FILE_BYTES || file.size === 0) {
      setError("Chọn file .xlsx do Dinh dưỡng 2598 xuất, không quá 5 MB. File macro không được hỗ trợ."); return;
    }
    setBusy("import"); setImported(null); setConfirmed(false); setSaved(null); setDownload(null);
    try {
      const form = new FormData(); form.set("file", file);
      const result = await readNutritionResponse<ImportedMenu>(await fetch("/api/nutrition/v1/import", { method: "POST", body: form }));
      if (!result.input || !Array.isArray(result.preview?.days) || typeof result.confirmationToken !== "string") throw new Error("Bản xem trước chưa đầy đủ. Vui lòng thử lại.");
      setImported(result); idempotencyKey.current = crypto.randomUUID();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không gửi được file. Vui lòng thử lại."); }
    finally { setBusy(null); }
  }

  async function act(action: "save" | "export") {
    if (!imported || !confirmed || busy || (action === "save" && saved)) return;
    setBusy(action); setError("");
    try {
      if (action === "save") {
        if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
        const result = await readNutritionResponse<{ ration: { id: string; title: string; revision: number } }>(await fetch("/api/nutrition/v1/save", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: imported.input, confirmationToken: imported.confirmationToken, idempotencyKey: idempotencyKey.current }),
        }));
        if (typeof result.ration?.id !== "string") throw new Error("Chưa xác nhận được bản lưu. Thử lại sẽ giữ cùng mã yêu cầu.");
        setSaved(result.ration);
      } else {
        const result = await readNutritionResponse<NutritionDownload>(await fetch("/api/nutrition/v1/export", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: imported.input, confirmationToken: imported.confirmationToken }),
        }));
        setDownload(sameSiteNutritionDownload(result));
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa hoàn thành thao tác. Vui lòng thử lại."); }
    finally { setBusy(null); }
  }

  async function acknowledgeEditedSources() {
    if (!imported || busy) return;
    const input = structuredClone(imported.input);
    let updated = false;
    for (const day of input.days) for (const row of day.rows) {
      if (row.customFood && row.customFood.source.kind !== "unknown" && !row.customFood.source.confirmed) {
        row.customFood.source.confirmed = true; updated = true;
      }
    }
    if (!updated) return;
    setBusy("prepare"); setError(""); setConfirmed(false); setSaved(null); setDownload(null);
    try {
      const value = await readNutritionResponse<ImportedMenu>(await fetch("/api/nutrition/v1/prepare", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input }),
      }));
      if (!value.input || !Array.isArray(value.preview?.days) || typeof value.confirmationToken !== "string") throw new Error("Bản xem trước chưa đầy đủ sau xác nhận nguồn.");
      setImported(value); idempotencyKey.current = crypto.randomUUID();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa chuẩn bị lại được bản."); }
    finally { setBusy(null); }
  }

  const preview = imported?.preview;
  const rows = preview?.days.flatMap(day => day.rows) ?? [];
  const incompleteInput = !!preview?.missingInputs.length;
  const editedSources = [...new Map((imported?.input.days.flatMap(day => day.rows) ?? []).flatMap(row => row.customFood && row.customFood.source.kind !== "unknown" && !row.customFood.source.confirmed ? [[row.customFood.id, row.customFood] as const] : [])).values()];

  return (
    <div className="mt-5 rounded-xl border border-[#b1c8bd] bg-white p-5 sm:p-6">
      <label htmlFor="nutrition-workbook" className="block font-semibold">File Excel đã chỉnh</label>
      <input id="nutrition-workbook" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy !== null} onChange={event => changeFile(event.target.files?.[0] ?? null)} className={`mt-2 block w-full min-w-0 rounded-lg border border-[#9bb6ab] p-2 text-sm text-neutral-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#dcebe5] file:px-3 file:py-2 file:font-semibold file:text-[#123c36] ${focus}`} aria-describedby="nutrition-upload-help" />
      <p id="nutrition-upload-help" className="mt-2 text-sm text-neutral-700">Tối đa 5 MB, định dạng .xlsx của hệ thống. Nhập lại chỉ đọc đầu vào, không chạy công thức hoặc macro trong file.</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="button" disabled={!file || busy !== null} onClick={() => void previewFile()} className={`rounded-lg bg-[#123c36] px-4 py-2 font-semibold text-white hover:bg-[#0f5c51] disabled:cursor-not-allowed disabled:opacity-50 ${focus}`}>{busy === "import" ? "Đang đọc file…" : "Xem trước đầu vào"}</button>
        <Link href="/dang-nhap" className={`text-sm underline underline-offset-4 ${focus}`}>Đăng nhập tài khoản</Link>
      </div>
      {error ? <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-red-800">{error}</p> : null}
      {preview ? (
        <div className="mt-6 border-t border-[#dcebe5] pt-5" aria-live="polite">
          <h3 className="text-xl font-semibold">{preview.title}</h3>
          <p className="mt-1 text-neutral-700">{preview.days.length} ngày · {rows.length} dòng nguyên liệu · {imported?.input.comparison.mode === "none" ? "Chỉ tính thành phần" : "Có đối chiếu mục tiêu"}</p>
          <NutritionMenuInput menu={preview} />
          {preview.warnings.length || preview.missingInputs.length ? <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900"><p className="font-semibold">Lưu ý trước khi chốt</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{[...new Set([...preview.warnings, ...preview.missingInputs.map(item => item.message)])].map(warning => <li key={warning}>{warning}</li>)}</ul></div> : null}
          {editedSources.length ? <section aria-label="Xác nhận số liệu ngoài kho đã sửa" className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4"><h3 className="text-lg font-semibold">Số liệu ngoài kho cần bạn xác nhận</h3><p className="mt-2 text-sm text-neutral-700">Những số đã sửa trong Excel được ghi thành số người dùng điều chỉnh. Xem cơ sở, đơn vị và nguồn dưới đây; bấm xác nhận nếu đúng, hoặc sửa file rồi tải lại.</p><div className="mt-4 space-y-4">{editedSources.map(food => <div key={food.id} className="rounded-lg border border-amber-200 bg-white p-3"><h4 className="font-semibold">{food.name}</h4><p className="mt-1 text-sm text-neutral-700">Nguồn: {food.source.label || "Chưa đặt tên nguồn"}. Cơ sở: {food.basis === "portion" ? `một phần ${food.portionAmount ?? "chưa rõ"} ${food.portionUnit ?? ""}` : food.basis === "100ml" ? "100 ml" : "100 g"}.</p><p className="mt-1 text-sm text-neutral-700">Thải bỏ: {food.wastePercent == null ? "chưa có số" : `${food.wastePercent}%`}. Nhóm: {food.foodGroup || "chưa phân nhóm"}.</p>{food.source.url ? <p className="mt-1 break-all text-sm text-neutral-700">URL nguồn: {food.source.url}</p> : null}<dl className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(food.nutrients).map(([key, value]) => { const field = ALL_NUTRIENT_FIELDS.find(item => item.key === key); return <div key={key} className="rounded bg-[#f1f6f4] p-2 text-sm"><dt>{field?.label ?? key}</dt><dd className="font-semibold">{value === null ? "Chưa có số" : `${value.toLocaleString("vi-VN", { maximumFractionDigits: 4 })} ${field?.unit ?? ""}`}</dd></div>; })}</dl></div>)}</div><button type="button" disabled={busy !== null} onClick={() => void acknowledgeEditedSources()} className={`mt-4 rounded-lg bg-[#123c36] px-4 py-2 font-semibold text-white disabled:opacity-50 ${focus}`}>{busy === "prepare" ? "Đang chuẩn bị lại bản…" : "Xác nhận số liệu tôi đã sửa"}</button><p className="mt-2 text-sm text-neutral-700">Sau bước này, bạn xem lại toàn bộ preview và chốt lần cuối trước khi lưu hoặc xuất.</p></section> : null}
          <NutritionMenuAnalysis menu={preview} />
          {incompleteInput ? <p className="mt-4 text-sm text-amber-900">Đầu vào còn thiếu thông tin cần chốt. Sửa vùng nhập trong Excel và gửi lại trước khi lưu hoặc xuất; thiếu số liệu nguồn vẫn được báo riêng trong kết quả.</p> : null}
          <label className="mt-5 flex items-start gap-3"><input type="checkbox" checked={confirmed} disabled={busy !== null} onChange={event => setConfirmed(event.target.checked)} className={`mt-1 h-5 w-5 shrink-0 accent-[#123c36] ${focus}`} /><span>Tôi đã xem và xác nhận đầu vào, nguồn và phần dữ liệu còn thiếu của bản này.</span></label>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={!confirmed || incompleteInput || busy !== null || !!saved} onClick={() => void act("save")} className={`rounded-lg bg-[#123c36] px-4 py-2 font-semibold text-white hover:bg-[#0f5c51] disabled:cursor-not-allowed disabled:opacity-50 ${focus}`}>{busy === "save" ? "Đang lưu…" : saved ? "Đã lưu bản cá nhân" : "Xác nhận và lưu bản mới"}</button>
            <button type="button" disabled={!confirmed || incompleteInput || busy !== null} onClick={() => void act("export")} className={`rounded-lg border border-[#123c36] px-4 py-2 font-semibold hover:bg-[#eaf3ee] disabled:cursor-not-allowed disabled:opacity-50 ${focus}`}>{busy === "export" ? "Đang xuất…" : "Xuất lại Excel từ bản này"}</button>
          </div>
          {saved ? <p role="status" className="mt-3 text-sm">Đã lưu “{saved.title}” trong tài khoản. <Link href={`/ket-noi-ai/ban-luu/${encodeURIComponent(saved.id)}`} className={`underline ${focus}`}>Mở bản đã lưu</Link>.</p> : null}
          {download ? <div role="status" className="mt-4 rounded-lg bg-[#eaf3ee] p-3"><a href={download.downloadUrl} download={download.filename} className={`font-semibold underline underline-offset-4 ${focus}`}>Tải {download.filename}</a><p className="mt-1 text-sm text-neutral-700">Link hết hạn: {new Date(download.expiresAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}. Bấm xuất lại nếu link đã hết hạn.</p></div> : null}
        </div>
      ) : null}
    </div>
  );
}
