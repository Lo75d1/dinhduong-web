"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { MenuInput, ResolvedMenu } from "@/lib/nutrition-chat/contracts";
import NutritionMenuAnalysis from "../../NutritionMenuAnalysis";
import { readNutritionResponse } from "../../client-api";

type Prepared = { input: MenuInput; preview: ResolvedMenu; confirmationToken: string };
const control = "mt-1 w-full min-w-0 rounded border border-[#8fa99e] px-3 py-2 text-neutral-900";
const button = "rounded bg-[#123c36] px-4 py-2 font-semibold text-white disabled:opacity-50";

export default function ReuseSavedMenu({ menu }: { menu: ResolvedMenu }) {
  const [draft, setDraft] = useState<MenuInput>(() => structuredClone(menu.input));
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ id: string; title: string } | null>(null);
  const key = useRef<string | null>(null);
  function change(next: MenuInput) { setDraft(next); setPrepared(null); setConfirmed(false); setSaved(null); key.current = null; }
  function amount(dayIndex: number, rowIndex: number, field: "quantity" | "servings", value: string) {
    const next = structuredClone(draft);
    if (field === "quantity") next.days[dayIndex].rows[rowIndex].quantity = value === "" ? null : Number(value);
    else next.days[dayIndex].rows[rowIndex].servings = value === "" ? 0 : Number(value);
    change(next);
  }
  async function preview() {
    setBusy(true); setError(""); setPrepared(null); setConfirmed(false); setSaved(null);
    try {
      const value = await readNutritionResponse<Prepared>(await fetch("/api/nutrition/v1/prepare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: draft }) }));
      setPrepared(value); key.current = crypto.randomUUID();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa tính được bản điều chỉnh."); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!prepared || !confirmed || !key.current || busy || saved) return;
    setBusy(true); setError("");
    try {
      const value = await readNutritionResponse<{ ration: { id: string; title: string } }>(await fetch("/api/nutrition/v1/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: prepared.input, confirmationToken: prepared.confirmationToken, idempotencyKey: key.current }) }));
      setSaved(value.ration);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa lưu được bản dùng lại."); }
    finally { setBusy(false); }
  }
  return <section className="mt-5 space-y-4" aria-label="Điều chỉnh và dùng lại thực đơn">
    <p className="text-sm text-neutral-700">Đổi tên, ngày, lượng hoặc số suất, xem lại kết quả rồi lưu thành bản riêng. Bản đang mở được giữ để đối chiếu.</p>
    <label className="block text-sm font-semibold">Tên bản dùng lại<input value={draft.title} disabled={busy} maxLength={200} onChange={event => change({ ...draft, title: event.target.value })} className={control} /></label>
    {draft.days.map((day, di) => <details key={day.id} className="rounded-lg border border-[#b1c8bd] p-3" open={draft.days.length === 1}>
      <summary className="cursor-pointer font-semibold">{day.label} · {day.rows.length} dòng</summary>
      <label className="mt-3 block text-sm">Ngày dùng lại<input type="date" value={day.date} disabled={busy} onChange={event => { const next = structuredClone(draft); next.days[di].date = event.target.value; change(next); }} className={control} /></label>
      <div className="mt-3 space-y-3">{day.rows.map((row, ri) => { const name = row.actualFoodName || row.customFood?.name || menu.days[di]?.rows[ri]?.food.name || row.dish; return <div key={row.id} className="grid gap-3 border-t border-[#dcebe5] pt-3 sm:grid-cols-2"><p className="text-sm sm:col-span-2"><strong>{row.meal} · {row.dish}</strong> · {name}</p><label className="text-sm">Lượng ({row.unit}) · {name}<input type="number" min={0} max={1000000} step="any" value={row.quantity ?? ""} disabled={busy} onChange={event => amount(di, ri, "quantity", event.target.value)} className={control} /></label><label className="text-sm">Số suất · {name}<input type="number" min={0.000001} max={10000} step="any" value={row.servings} disabled={busy} onChange={event => amount(di, ri, "servings", event.target.value)} className={control} /></label></div>; })}</div>
    </details>)}
    <button type="button" disabled={busy} onClick={() => void preview()} className={button}>{busy ? "Đang xử lý…" : "Xem trước bản dùng lại"}</button>
    {error ? <p role="alert" className="text-sm text-red-800">{error}</p> : null}
    {prepared ? <div className="border-t border-[#b1c8bd] pt-4"><NutritionMenuAnalysis menu={prepared.preview} />{prepared.preview.missingInputs.length ? <ul className="mt-3 list-disc pl-5 text-sm text-amber-900">{prepared.preview.missingInputs.map((item, i) => <li key={i}>{item.message}</li>)}</ul> : null}<label className="mt-4 flex gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy || !!saved} onChange={event => setConfirmed(event.target.checked)} className="accent-[#123c36]" /><span>Tôi xác nhận đầu vào và nguồn của bản dùng lại.</span></label><button type="button" disabled={busy || !confirmed || !!prepared.preview.missingInputs.length || !!saved} onClick={() => void save()} className={`mt-3 ${button}`}>{saved ? "Đã lưu bản dùng lại" : "Lưu bản dùng lại vào tài khoản"}</button></div> : null}
    {saved ? <p role="status"><Link href={`/ket-noi-ai/ban-luu/${encodeURIComponent(saved.id)}`} className="font-semibold underline">Mở bản dùng lại: {saved.title}</Link></p> : null}
  </section>;
}
