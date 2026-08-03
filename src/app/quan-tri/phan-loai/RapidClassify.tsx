"use client";

// "Phân loại nhanh" — kiểu game lướt thẻ: mỗi lần 1 thực phẩm, bấm 1 phát gán
// 1 trường phân loại rồi qua thẻ kế. Tái dùng API classify-list (đọc) và
// bulk-classify (ghi, có nhật ký). Mobile-first để cài như app trên điện thoại.
import { useEffect, useMemo, useState } from "react";

type FoodRow = {
  id: string; name: string; source: string;
  foodType: string | null; foodGroup: string | null; proteinOrigin: string | null;
  giLevel: number | null; purinLevel: number | null; cholesterolLevel: number | null;
};
type FieldKey = "foodGroup" | "foodType" | "proteinOrigin" | "giLevel" | "purinLevel" | "cholesterolLevel";

const FIELD_LABEL: Record<FieldKey, string> = {
  foodGroup: "Nhóm thực phẩm", foodType: "Loại", proteinOrigin: "Nguồn đạm",
  giLevel: "Mức GI", purinLevel: "Mức Purin", cholesterolLevel: "Mức Cholesterol",
};
const LEVEL_FIELDS = new Set<FieldKey>(["giLevel", "purinLevel", "cholesterolLevel"]);
const LEVEL_OPTIONS = [
  { value: "0", label: "0 · Thấp" }, { value: "1", label: "1 · Trung bình" },
  { value: "2", label: "2 · Cao" }, { value: "3", label: "3 · Rất cao" },
];
const FOODTYPE_OPTIONS = [
  { value: "TS", label: "TS · Tươi sống" }, { value: "CB", label: "CB · Chế biến" },
  { value: "MA", label: "MA · Món ăn" }, { value: "SP", label: "SP · Sản phẩm" },
];

function currentOf(item: FoodRow, field: FieldKey): string {
  const v = item[field];
  return v === null || v === undefined || v === "" ? "" : String(v);
}

export default function RapidClassify() {
  const [items, setItems] = useState<FoodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [field, setField] = useState<FieldKey>("foodGroup");
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [sourceFilter, setSourceFilter] = useState("");
  const [queue, setQueue] = useState<string[]>([]);
  const [pos, setPos] = useState(0);
  const [history, setHistory] = useState<{ id: string; field: FieldKey; prev: string }[]>([]);
  const [custom, setCustom] = useState("");
  const [touchX, setTouchX] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/data/classify-list");
        const data = await res.json();
        if (res.ok) setItems(data.items ?? []);
        else setMessage(data.error ?? "Không tải được danh sách.");
      } catch { setMessage("Không kết nối được để tải dữ liệu."); }
      setLoading(false);
    })();
  }, []);

  const byId = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);
  const sources = useMemo(() => [...new Set(items.map((it) => it.source).filter(Boolean))].sort(), [items]);

  // Giá trị gợi ý (chips) cho trường đang chọn.
  const valueOptions = useMemo<{ value: string; label: string }[]>(() => {
    if (field === "foodType") return FOODTYPE_OPTIONS;
    if (LEVEL_FIELDS.has(field)) return LEVEL_OPTIONS;
    const set = new Set<string>();
    for (const it of items) { const v = currentOf(it, field); if (v) set.add(v); }
    return [...set].sort((a, b) => a.localeCompare(b, "vi")).map((v) => ({ value: v, label: v }));
  }, [items, field]);

  const remainingMissing = useMemo(
    () => items.filter((it) => (!sourceFilter || it.source === sourceFilter) && !currentOf(it, field)).length,
    [items, field, sourceFilter],
  );

  function buildQueue() {
    const list = items
      .filter((it) => (!sourceFilter || it.source === sourceFilter))
      .filter((it) => (onlyMissing ? !currentOf(it, field) : true))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"))
      .map((it) => it.id);
    setQueue(list);
    setPos(0);
    setHistory([]);
    setMessage(list.length ? "" : "Không còn dòng nào khớp bộ lọc — thử tắt “chỉ dòng còn trống”.");
  }

  const currentId = queue[pos];
  const current = currentId ? byId.get(currentId) : undefined;

  async function apply(value: string | null) {
    if (!current || busy) return;
    const prev = currentOf(current, field);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/data/bulk-classify", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [current.id], field, value, reason: `Phân loại nhanh (mobile): ${FIELD_LABEL[field]}` }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error ?? "Chưa lưu được."); setBusy(false); return; }
      setItems((prevItems) => prevItems.map((it) => (it.id === current.id ? { ...it, [field]: value } : it)));
      setHistory((h) => [...h, { id: current.id, field, prev }]);
      setPos((p) => p + 1);
      setCustom("");
    } catch { setMessage("Mất kết nối khi lưu."); }
    setBusy(false);
  }

  function skip() { setPos((p) => p + 1); }

  async function undo() {
    const last = history[history.length - 1];
    if (!last || busy) return;
    setBusy(true);
    try {
      await fetch("/api/admin/data/bulk-classify", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [last.id], field: last.field, value: last.prev === "" ? null : (LEVEL_FIELDS.has(last.field) ? Number(last.prev) : last.prev), reason: "Hoàn tác phân loại nhanh (mobile)" }),
      });
      setItems((prevItems) => prevItems.map((it) => (it.id === last.id ? { ...it, [last.field]: last.prev === "" ? null : last.prev } : it)));
      setHistory((h) => h.slice(0, -1));
      setPos((p) => Math.max(0, p - 1));
    } catch { setMessage("Không hoàn tác được."); }
    setBusy(false);
  }

  const done = queue.length > 0 && pos >= queue.length;

  return (
    <div className="mx-auto flex min-h-[100svh] max-w-md flex-col gap-3 px-3 pb-6 pt-3">
      <header className="rounded-2xl border-2 border-[#123c36] bg-[#eef6f1] p-3">
        <p className="text-[11px] font-bold tracking-[.16em] text-[#0f5a4e]">PHÂN LOẠI NHANH</p>
        <h1 className="text-lg font-semibold text-[#102f2b]">Lướt thẻ · bấm 1 phát</h1>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold text-[#24483f]">Trường phân loại
            <select value={field} onChange={(e) => setField(e.target.value as FieldKey)} className="mt-1 w-full rounded-lg border-2 border-[#8fa99e] bg-white px-2 py-2 text-sm">
              {(Object.keys(FIELD_LABEL) as FieldKey[]).map((k) => <option key={k} value={k}>{FIELD_LABEL[k]}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#24483f]">Nguồn
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="mt-1 w-full rounded-lg border-2 border-[#8fa99e] bg-white px-2 py-2 text-sm">
              <option value="">Tất cả</option>
              {sources.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#24483f]">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} className="h-4 w-4" />
          Chỉ dòng còn trống ({remainingMissing} dòng)
        </label>
        <button type="button" onClick={buildQueue} disabled={loading} className="mt-2 w-full rounded-lg bg-[#123c36] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {loading ? "Đang tải dữ liệu…" : queue.length ? "Làm lại hàng đợi" : "Bắt đầu"}
        </button>
      </header>

      {message && <p className="rounded-lg border-2 border-[#9bb9ad] bg-[#f7faf8] px-3 py-2 text-sm text-[#193e35]">{message}</p>}

      {queue.length > 0 && !done && current && (
        <>
          <div className="flex items-center justify-between px-1 text-xs font-semibold text-[#4b655e]">
            <span>Thẻ {pos + 1} / {queue.length}</span>
            <span>Còn trống trong CSDL: {remainingMissing}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#dbe7e1]"><div className="h-full bg-[#0c5f4d]" style={{ width: `${(pos / queue.length) * 100}%` }} /></div>

          <article
            onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
            onTouchEnd={(e) => { if (touchX !== null && e.changedTouches[0].clientX - touchX < -70) skip(); setTouchX(null); }}
            className="rounded-2xl border-2 border-[#123c36] bg-white p-4 shadow-[0_8px_20px_rgba(18,60,54,.08)]"
          >
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#eef4f1] px-2 py-0.5 text-xs font-bold text-[#0c5f4d]">{current.source || "—"}</span>
              {currentOf(current, field) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Hiện: {currentOf(current, field)}</span>}
            </div>
            <h2 className="mt-2 text-xl font-bold leading-6 text-[#122f2a]">{current.name}</h2>
            <p className="mt-1 text-xs text-[#637a73]">
              {current.foodType ? `Loại ${current.foodType}` : "chưa loại"} · {current.foodGroup ?? "chưa nhóm"} · {current.proteinOrigin ?? "chưa nguồn đạm"}
            </p>

            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-[#0f5a4e]">Chọn {FIELD_LABEL[field]}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {valueOptions.map((opt) => {
                const active = currentOf(current, field) === opt.value;
                return (
                  <button key={opt.value} type="button" disabled={busy} onClick={() => void apply(opt.value)}
                    className={`rounded-xl border-2 px-3 py-3 text-left text-sm font-semibold transition active:scale-[.98] ${active ? "border-[#0c5f4d] bg-[#0c5f4d] text-white" : "border-[#8fa99e] bg-white text-[#183d35] hover:bg-[#f0f7f3]"}`}>
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {!LEVEL_FIELDS.has(field) && field !== "foodType" && (
              <div className="mt-2 flex gap-2">
                <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Giá trị khác…" className="min-w-0 flex-1 rounded-lg border-2 border-[#8fa99e] px-3 py-2 text-sm" />
                <button type="button" disabled={busy || !custom.trim()} onClick={() => void apply(custom.trim())} className="rounded-lg bg-[#123c36] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Gán</button>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-2">
              <button type="button" disabled={busy || !history.length} onClick={() => void undo()} className="rounded-lg border-2 border-[#8fa99e] px-3 py-2 text-sm font-semibold text-[#24483f] disabled:opacity-40">↩ Hoàn tác</button>
              <button type="button" disabled={busy} onClick={() => void apply(null)} className="rounded-lg border-2 border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-40">Xóa giá trị</button>
              <button type="button" onClick={skip} className="rounded-lg bg-[#f0f7f3] px-3 py-2 text-sm font-semibold text-[#0f5a4e]">Bỏ qua →</button>
            </div>
          </article>
          <p className="text-center text-[11px] text-[#81958e]">Mẹo: vuốt trái để bỏ qua nhanh.</p>
        </>
      )}

      {done && (
        <div className="rounded-2xl border-2 border-[#0c5f4d] bg-[#f4fbf7] p-5 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-1 font-semibold text-[#122f2a]">Xong hàng đợi {queue.length} thẻ!</p>
          <p className="mt-1 text-sm text-[#4b655e]">Còn {remainingMissing} dòng trống {FIELD_LABEL[field].toLowerCase()} trong CSDL.</p>
          <button type="button" onClick={buildQueue} className="mt-3 rounded-lg bg-[#123c36] px-4 py-2.5 text-sm font-bold text-white">Tải lượt tiếp</button>
        </div>
      )}
    </div>
  );
}
