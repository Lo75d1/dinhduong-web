"use client";

import { useState } from "react";

type VddItem = { sourceCode: string; imageUrl: string; imageSourceUrl: string; status: "MATCHED" | "NOT_FOUND" | "AMBIGUOUS"; food: { id: string; name: string } | null };
type RniItem = { sourceCode: string; imageSourceId: string; imagePreviewUrl: string; status: "MATCHED" | "NOT_FOUND"; dish: { id: string; name: string } | null };

export default function ImageSourceSync() {
  const [vddItems, setVddItems] = useState<VddItem[]>([]);
  const [rniItems, setRniItems] = useState<RniItem[]>([]);
  const [vddSummary, setVddSummary] = useState<Record<string, number> | null>(null);
  const [rniSummary, setRniSummary] = useState<Record<string, number> | null>(null);
  const [reason, setReason] = useState("Đồng bộ ảnh tham chiếu từ nguồn Viện Dinh dưỡng và RNI theo mã nguồn.");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function scan() {
    setBusy(true); setMessage(""); setVddItems([]); setRniItems([]); setVddSummary(null); setRniSummary(null);
    const [vdd, rni] = await Promise.all([
      fetch("/api/admin/data/images/sync-preview", { method: "POST" }),
      fetch("/api/admin/data/images/rni-sync-preview", { method: "POST" }),
    ]);
    const [vddData, rniData] = await Promise.all([vdd.json(), rni.json()]);
    setBusy(false);
    if (vdd.ok) { setVddItems(vddData.items); setVddSummary(vddData.summary); }
    if (rni.ok) { setRniItems(rniData.items); setRniSummary(rniData.summary); }
    setMessage(vdd.ok && rni.ok ? "Đã quét cả hai nguồn. Kiểm tra từng nhóm trước khi xác nhận cập nhật." : `Có nguồn chưa quét được: ${!vdd.ok ? (vddData.error ?? "Viện Dinh dưỡng") : ""} ${!rni.ok ? (rniData.error ?? "RNI") : ""}`);
  }

  async function commit() {
    const vdd = vddItems.filter((x) => x.status === "MATCHED" && x.food).map((x) => ({ id: x.food!.id, sourceCode: x.sourceCode, imageUrl: x.imageUrl, imageSourceUrl: x.imageSourceUrl }));
    const rni = rniItems.filter((x) => x.status === "MATCHED" && x.dish).map((x) => ({ id: x.dish!.id, sourceCode: x.sourceCode, imageSourceId: x.imageSourceId }));
    if (!vdd.length && !rni.length) { setMessage("Không có ảnh khớp mã để cập nhật."); return; }
    setBusy(true);
    const [vddResult, rniResult] = await Promise.all([
      vdd.length ? fetch("/api/admin/data/images/commit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: vdd, reason }) }) : null,
      rni.length ? fetch("/api/admin/data/images/rni-commit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: rni, reason }) }) : null,
    ]);
    const vddData = vddResult ? await vddResult.json() : { updated: 0 };
    const rniData = rniResult ? await rniResult.json() : { updated: 0 };
    setBusy(false);
    if ((vddResult && !vddResult.ok) || (rniResult && !rniResult.ok)) { setMessage(vddData.error ?? rniData.error ?? "Chưa thể hoàn tất cập nhật."); return; }
    const warning = [vddData.warning, rniData.warning].filter(Boolean).join(" ");
    setMessage(`Đã cập nhật ${vddData.updated ?? 0} ảnh Viện Dinh dưỡng và ${rniData.updated ?? 0} ảnh RNI. Mọi thay đổi đã ghi nhật ký.${warning ? ` ${warning}` : ""}`);
  }

  const totalMatched = (vddSummary?.matched ?? 0) + (rniSummary?.matched ?? 0);
  return <section className="rounded-xl border-2 border-[#73540d] bg-[#fffdf6] p-5">
    <h2 className="text-xl font-semibold">Đồng bộ ảnh từ nguồn tham khảo</h2>
    <p className="mt-1 text-sm">Quét đồng thời Viện Dinh dưỡng (VDD) và RNI, đối chiếu bằng mã nguồn. Không cần Excel, không thay đổi dữ liệu cho đến khi xác nhận.</p>
    <button type="button" onClick={() => void scan()} disabled={busy} className="mt-4 rounded bg-[#73540d] px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? "Đang quét VDD và RNI…" : "Quét ảnh VDD + RNI"}</button>
    {message && <p className="mt-3 rounded border bg-white p-3 text-sm">{message}</p>}
    {(vddSummary || rniSummary) && <div className="mt-4 grid gap-3 md:grid-cols-2">
      <Summary title="Viện Dinh dưỡng" data={vddSummary} tint="bg-[#edf4f0]" />
      <Summary title="RNI" data={rniSummary} tint="bg-[#e8f3f8]" />
    </div>}
    {(vddItems.length > 0 || rniItems.length > 0) && <>
      <div className="mt-4 grid gap-3 lg:grid-cols-2"><Preview title="Viện Dinh dưỡng" items={vddItems} image={(x) => x.imageUrl} name={(x) => x.food?.name} /><Preview title="RNI" items={rniItems} image={(x) => x.imagePreviewUrl} name={(x) => x.dish?.name} /></div>
      <label className="mt-4 block font-semibold">Lý do cập nhật hàng loạt<textarea required value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 min-h-20 w-full rounded border px-3 py-2" /></label>
      <button type="button" onClick={() => void commit()} disabled={busy} className="mt-4 rounded bg-[#123c36] px-5 py-2.5 font-semibold text-white disabled:opacity-60">Xác nhận cập nhật ảnh khớp ({totalMatched})</button>
    </>}
  </section>;
}

function Summary({ title, data, tint }: { title: string; data: Record<string, number> | null; tint: string }) {
  return <div className={`border p-3 ${tint}`}><b>{title}</b><div className="mt-2 grid grid-cols-4 gap-1 text-sm"><span><b>{data?.sourceRows ?? 0}</b><br />nguồn</span><span><b>{data?.matched ?? 0}</b><br />khớp</span><span><b>{data?.unchanged ?? 0}</b><br />đã có</span><span><b>{data?.notFound ?? 0}</b><br />thiếu mã</span></div></div>;
}

function Preview<T extends { sourceCode: string; status: string }>({ title, items, image, name }: { title: string; items: T[]; image: (item: T) => string; name: (item: T) => string | undefined }) {
  return <div className="max-h-64 overflow-auto border bg-white"><p className="sticky top-0 border-b bg-white p-2 font-semibold">{title} · xem trước {Math.min(items.length, 100)}/{items.length}</p><table className="min-w-full text-sm"><tbody>{items.slice(0, 100).map((item) => <tr key={item.sourceCode} className="border-t"><td className="p-2">{item.sourceCode}</td><td className="p-2">{name(item) ?? "—"}</td><td className="p-2">{item.status === "MATCHED" ? "Khớp" : "Không có mã"}</td><td className="p-2"><a className="text-[#0b5d4d] underline" href={image(item)} target="_blank" rel="noreferrer">Ảnh</a></td></tr>)}</tbody></table></div>;
}
