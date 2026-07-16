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
  const [progress, setProgress] = useState<{ done: number; total: number; updated: number; skipped: number; failed: number } | null>(null);

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

  // Ghi từng dòng một (không gộp transaction nhiều dòng) — chậm hơn nhưng mỗi
  // request chỉ đụng 1 dòng nên không bao giờ vượt timeout dù mạng VPS<->DB có
  // độ trễ cao, và hiển thị được tiến trình thực khi số dòng lớn (RNI ~6000+).
  async function commitOne(url: string, item: object): Promise<"updated" | "skipped" | "failed"> {
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [item], reason }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return "failed";
      return (data.updated ?? 0) > 0 ? "updated" : "skipped";
    } catch { return "failed"; }
  }

  async function commit() {
    const vdd = vddItems.filter((x) => x.status === "MATCHED" && x.food).map((x) => ({ url: "/api/admin/data/images/commit", item: { id: x.food!.id, sourceCode: x.sourceCode, imageUrl: x.imageUrl, imageSourceUrl: x.imageSourceUrl } }));
    const rni = rniItems.filter((x) => x.status === "MATCHED" && x.dish).map((x) => ({ url: "/api/admin/data/images/rni-commit", item: { id: x.dish!.id, sourceCode: x.sourceCode, imageSourceId: x.imageSourceId } }));
    const all = [...vdd, ...rni];
    if (!all.length) { setMessage("Không có ảnh khớp mã để cập nhật."); return; }
    setBusy(true); setMessage("");
    let updated = 0, skipped = 0, failed = 0;
    setProgress({ done: 0, total: all.length, updated: 0, skipped: 0, failed: 0 });
    for (const entry of all) {
      const outcome = await commitOne(entry.url, entry.item);
      if (outcome === "updated") updated++; else if (outcome === "skipped") skipped++; else failed++;
      setProgress({ done: updated + skipped + failed, total: all.length, updated, skipped, failed });
    }
    setBusy(false);
    setMessage(`Đã cập nhật ${updated} ảnh, bỏ qua ${skipped} dòng đã đúng, ${failed} dòng lỗi. Mọi thay đổi đã ghi nhật ký.`);
  }

  const totalMatched = (vddSummary?.matched ?? 0) + (rniSummary?.matched ?? 0);
  return <section className="rounded-xl border-2 border-[#73540d] bg-[#fffdf6] p-5">
    <h2 className="text-xl font-semibold">Đồng bộ ảnh từ nguồn tham khảo</h2>
    <p className="mt-1 text-sm">Quét đồng thời Viện Dinh dưỡng (VDD) và RNI, đối chiếu bằng mã nguồn. Không cần Excel, không thay đổi dữ liệu cho đến khi xác nhận.</p>
    {progress && <div className="mt-3 rounded-lg border-2 border-[#123c36] bg-white p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm font-semibold">
        <span>Đang ghi từng dòng một: {progress.done}/{progress.total}</span>
        <span className="font-normal text-neutral-700">đã lưu {progress.updated} · bỏ qua {progress.skipped} · lỗi {progress.failed}</span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#edf4f0]"><div className="h-full bg-[#123c36] transition-[width]" style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }} /></div>
      {progress.done < progress.total && <p className="mt-2 text-xs text-neutral-600">Đừng đóng hoặc rời tab này cho tới khi chạy xong — mỗi dòng ghi riêng nên có thể mất vài phút với danh sách lớn.</p>}
    </div>}
    <button type="button" onClick={() => void scan()} disabled={busy} className="mt-4 rounded bg-[#73540d] px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? "Đang quét VDD và RNI…" : "Quét ảnh VDD + RNI"}</button>
    {message && <p className="mt-3 rounded border bg-white p-3 text-sm">{message}</p>}
    {(vddSummary || rniSummary) && <div className="mt-4 grid gap-3 md:grid-cols-2">
      <Summary title="Viện Dinh dưỡng" data={vddSummary} tint="bg-[#edf4f0]" />
      <Summary title="RNI" data={rniSummary} tint="bg-[#e8f3f8]" />
    </div>}
    {(vddItems.length > 0 || rniItems.length > 0) && <>
      <div className="mt-4 grid gap-3 lg:grid-cols-2"><Preview title="Viện Dinh dưỡng" items={vddItems} image={(x) => x.imageUrl} name={(x) => x.food?.name} /><Preview title="RNI" items={rniItems} image={(x) => x.imagePreviewUrl} name={(x) => x.dish?.name} /></div>
      <label className="mt-4 block font-semibold">Lý do cập nhật hàng loạt<textarea required value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 min-h-20 w-full rounded border px-3 py-2" /></label>
      <button type="button" onClick={() => void commit()} disabled={busy} className="mt-4 rounded bg-[#123c36] px-5 py-2.5 font-semibold text-white disabled:opacity-60">{busy && progress ? `Đang ghi… ${progress.done}/${progress.total}` : `Xác nhận cập nhật ảnh khớp (${totalMatched})`}</button>
    </>}
  </section>;
}

function Summary({ title, data, tint }: { title: string; data: Record<string, number> | null; tint: string }) {
  return <div className={`border p-3 ${tint}`}><b>{title}</b><div className="mt-2 grid grid-cols-4 gap-1 text-sm"><span><b>{data?.sourceRows ?? 0}</b><br />nguồn</span><span><b>{data?.matched ?? 0}</b><br />khớp</span><span><b>{data?.unchanged ?? 0}</b><br />đã có</span><span><b>{data?.notFound ?? 0}</b><br />thiếu mã</span></div></div>;
}

function Preview<T extends { sourceCode: string; status: string }>({ title, items, image, name }: { title: string; items: T[]; image: (item: T) => string; name: (item: T) => string | undefined }) {
  return <div className="max-h-64 overflow-auto border bg-white"><p className="sticky top-0 border-b bg-white p-2 font-semibold">{title} · xem trước {Math.min(items.length, 100)}/{items.length}</p><table className="min-w-full text-sm"><tbody>{items.slice(0, 100).map((item) => <tr key={item.sourceCode} className="border-t"><td className="p-2">{item.sourceCode}</td><td className="p-2">{name(item) ?? "—"}</td><td className="p-2">{item.status === "MATCHED" ? "Khớp" : "Không có mã"}</td><td className="p-2"><a className="text-[#0b5d4d] underline" href={image(item)} target="_blank" rel="noreferrer">Ảnh</a></td></tr>)}</tbody></table></div>;
}
