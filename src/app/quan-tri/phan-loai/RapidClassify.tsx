"use client";

// "Phân loại nhanh" — kiểu game lướt thẻ: mỗi lần 1 thực phẩm, bấm 1 phát gán
// 1 trường phân loại rồi qua thẻ kế. Tái dùng API classify-list (đọc) và
// bulk-classify (ghi, có nhật ký). Mobile-first để cài như app trên điện thoại.
import { useEffect, useMemo, useState } from "react";

type FoodRow = {
  id: string; name: string; source: string; imageUrl: string | null;
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

// Bảng màu (dịu, dễ phân biệt) + emoji để nhận diện nhanh từng giá trị phân loại.
type Swatch = { bg: string; border: string; text: string; solid: string };
const SW = {
  red: { bg: "#fdecec", border: "#e59a9a", text: "#8f2d2d", solid: "#c0392b" },
  green: { bg: "#e9f6ee", border: "#8cce9d", text: "#1e5b34", solid: "#2e8b57" },
  blue: { bg: "#eaf1fb", border: "#9cb8e6", text: "#1e3a6b", solid: "#3b6fc4" },
  amber: { bg: "#fbf3e2", border: "#dfbf78", text: "#6b4e12", solid: "#c9922e" },
  orange: { bg: "#fdefe4", border: "#eeb184", text: "#8a4415", solid: "#d9772e" },
  yellow: { bg: "#fbf7de", border: "#d6c65e", text: "#5f560f", solid: "#b8a417" },
  purple: { bg: "#f2ecf9", border: "#c0a6e0", text: "#4a2c6b", solid: "#7e4fb0" },
  pink: { bg: "#fdecf3", border: "#eaa0c0", text: "#8f2d5c", solid: "#c94f86" },
  cyan: { bg: "#e6f5f6", border: "#8ccdd2", text: "#154d52", solid: "#2e8b93" },
  teal: { bg: "#e4f4f0", border: "#84ccbb", text: "#14503f", solid: "#2e9c7e" },
  brown: { bg: "#f2ece6", border: "#c9a888", text: "#5c3f22", solid: "#8a5a34" },
  rose: { bg: "#fdeef1", border: "#eaa6b4", text: "#8f2740", solid: "#c94f6a" },
  slate: { bg: "#eef1f3", border: "#a7b6bf", text: "#33454f", solid: "#5a7180" },
} satisfies Record<string, Swatch>;
type SwKey = keyof typeof SW;
const PALETTE_ORDER: SwKey[] = ["red", "green", "blue", "amber", "orange", "yellow", "purple", "pink", "cyan", "teal", "brown", "rose", "slate"];

const GROUP_RULES: { kw: string[]; sw: SwKey; icon: string }[] = [
  { kw: ["thit", "ca", "hai san"], sw: "red", icon: "🥩" },
  { kw: ["rau", "cu", "qua"], sw: "green", icon: "🥬" },
  { kw: ["sua"], sw: "blue", icon: "🥛" },
  { kw: ["trung"], sw: "amber", icon: "🥚" },
  { kw: ["luong thuc", "ngu coc", "gao"], sw: "brown", icon: "🍚" },
  { kw: ["hat"], sw: "orange", icon: "🥜" },
  { kw: ["dau", "mo"], sw: "yellow", icon: "🧈" },
  { kw: ["banh keo", "ngot"], sw: "pink", icon: "🍬" },
  { kw: ["nuoc giai khat", "do uong"], sw: "cyan", icon: "🥤" },
  { kw: ["gia vi"], sw: "purple", icon: "🧂" },
  { kw: ["hon hop"], sw: "slate", icon: "🍲" },
  { kw: ["y te"], sw: "teal", icon: "💊" },
  { kw: ["the thao"], sw: "rose", icon: "🏋️" },
];
const PROTEIN_RULES: { kw: string[]; sw: SwKey; icon: string }[] = [
  { kw: ["thit do"], sw: "red", icon: "🥩" },
  { kw: ["thit trang", "ga", "gia cam"], sw: "orange", icon: "🍗" },
  { kw: ["trung sua", "trung", "sua"], sw: "blue", icon: "🥚" },
  { kw: ["thuc vat", "dau", "hat"], sw: "green", icon: "🌿" },
  { kw: ["che bien"], sw: "slate", icon: "🥫" },
  { kw: ["hon hop"], sw: "purple", icon: "🍲" },
];
const FOODTYPE_SW: Record<string, { sw: SwKey; icon: string }> = {
  TS: { sw: "green", icon: "🌿" }, CB: { sw: "amber", icon: "🍳" }, MA: { sw: "orange", icon: "🍲" }, SP: { sw: "blue", icon: "📦" },
};
const LEVEL_SW: SwKey[] = ["green", "yellow", "orange", "red"];

function hashPick(s: string): SwKey {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE_ORDER[h % PALETTE_ORDER.length];
}
// Khớp NGUYÊN TỪ để tránh "các"/"món"/"khát" khớp nhầm "ca"/"mo"/"hat".
// Cụm có dấu cách coi như cụm liền; từ đơn phải đứng thành từ riêng.
function matchNorm(norm: string, kw: string): boolean {
  if (kw.includes(" ")) return norm.includes(kw);
  return new RegExp(`(^|[^a-z])${kw}([^a-z]|$)`).test(norm);
}
function optStyle(field: FieldKey, value: string): { sw: Swatch; icon: string } {
  if (LEVEL_FIELDS.has(field)) { const i = Math.max(0, Math.min(3, Number(value) || 0)); return { sw: SW[LEVEL_SW[i]], icon: "●" }; }
  if (field === "foodType") { const m = FOODTYPE_SW[value]; return m ? { sw: SW[m.sw], icon: m.icon } : { sw: SW.slate, icon: "🏷️" }; }
  const norm = value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase();
  const rules = field === "proteinOrigin" ? PROTEIN_RULES : GROUP_RULES;
  for (const r of rules) if (r.kw.some((k) => matchNorm(norm, k))) return { sw: SW[r.sw], icon: r.icon };
  return { sw: SW[hashPick(norm)], icon: "🏷️" };
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
  // Hiệu ứng lưu: idle → saving (spinner) → saved (✓) rồi mới trượt qua thẻ kế.
  const [phase, setPhase] = useState<"idle" | "saving" | "saved">("idle");
  const [savedLabel, setSavedLabel] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [installEvt, setInstallEvt] = useState<{ prompt: () => void; userChoice: Promise<unknown> } | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [configOpen, setConfigOpen] = useState(true); // focus: đóng phần cài đặt sau khi bắt đầu

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

  // Bắt sự kiện cài PWA của Chrome/Android để hiện nút "Cài ứng dụng" ngay trên trang.
  useEffect(() => {
    const onBip = (e: Event) => { e.preventDefault(); setInstallEvt(e as unknown as { prompt: () => void; userChoice: Promise<unknown> }); };
    const onInstalled = () => setInstallEvt(null);
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    document.body.classList.add("app-fullscreen"); // ẩn header/footer site để full màn, khỏi kéo
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    return () => { window.removeEventListener("beforeinstallprompt", onBip); window.removeEventListener("appinstalled", onInstalled); document.body.classList.remove("app-fullscreen"); };
  }, []);

  function installApp() {
    if (!installEvt) return;
    installEvt.prompt();
    void installEvt.userChoice.finally(() => setInstallEvt(null));
  }

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
    setConfigOpen(list.length ? false : true); // vào focus khi có hàng đợi
    setMessage(list.length ? "" : "Không còn dòng nào khớp bộ lọc — thử tắt “chỉ dòng còn trống”.");
  }

  const currentId = queue[pos];
  const current = currentId ? byId.get(currentId) : undefined;

  async function apply(value: string | null) {
    if (!current || busy) return;
    const prev = currentOf(current, field);
    const id = current.id;
    setBusy(true); setPhase("saving"); setPending(value);
    try {
      const res = await fetch("/api/admin/data/bulk-classify", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [id], field, value, reason: `Phân loại nhanh (mobile): ${FIELD_LABEL[field]}` }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMessage(data.error ?? "Chưa lưu được."); setBusy(false); setPhase("idle"); setPending(null); return; }
      setItems((prevItems) => prevItems.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
      setHistory((h) => [...h, { id, field, prev }]);
      setSavedLabel(value === null ? "Đã xóa" : "Đã lưu");
      setPhase("saved");
      // Giữ ✓ một nhịp để người dùng kịp thấy rồi mới trượt qua thẻ kế.
      window.setTimeout(() => { setPos((p) => p + 1); setCustom(""); setPhase("idle"); setPending(null); setBusy(false); }, 430);
    } catch { setMessage("Mất kết nối khi lưu."); setBusy(false); setPhase("idle"); setPending(null); }
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
  const focusMode = queue.length > 0 && !done;
  const pct = queue.length ? (pos / queue.length) * 100 : 0;

  return (
    <div className="mx-auto flex h-[100svh] max-w-md flex-col overflow-hidden px-3 pb-3 pt-2">
      <style>{`
        @keyframes plIn{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:none}}
        @keyframes plSpin{to{transform:rotate(360deg)}}
        @keyframes plShim{100%{background-position:-200% 0}}
        .pl-cardin{animation:plIn .28s cubic-bezier(.2,.7,.3,1)}
        .pl-spin{width:12px;height:12px;border:2px solid rgba(255,255,255,.45);border-top-color:#fff;border-radius:50%;display:inline-block;animation:plSpin .6s linear infinite}
        .pl-skel{background:linear-gradient(90deg,#eef3f1 25%,#e0eae6 37%,#eef3f1 63%);background-size:200% 100%;animation:plShim 1.2s ease-in-out infinite}
      `}</style>
      {(!focusMode || configOpen) ? (
      <header className="shrink-0 rounded-2xl border-2 border-[#123c36] bg-[#eef6f1] p-3">
        {!focusMode && <>
        <p className="text-[11px] font-bold tracking-[.16em] text-[#0f5a4e]">PHÂN LOẠI NHANH</p>
        <h1 className="text-lg font-semibold text-[#102f2b]">Lướt thẻ · bấm 1 phát</h1>
        {!standalone && (installEvt
          ? <button type="button" onClick={installApp} className="mt-2 w-full rounded-lg border-2 border-[#0c5f4d] bg-white px-3 py-2 text-sm font-bold text-[#0c5f4d] active:scale-[.99]">📲 Cài ứng dụng ra màn hình chính</button>
          : <p className="mt-2 rounded-lg bg-white/70 px-3 py-1.5 text-[11px] text-[#4b655e]">Cài như app: menu Chrome ⋮ → “Thêm vào màn hình chính”.</p>
        )}
        </>}
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
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={buildQueue} disabled={loading} className="flex-1 rounded-lg bg-[#123c36] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {loading ? "Đang tải dữ liệu…" : queue.length ? "Làm lại hàng đợi" : "Bắt đầu"}
          </button>
          {focusMode && <button type="button" onClick={() => setConfigOpen(false)} className="rounded-lg border-2 border-[#8fa99e] bg-white px-4 py-2.5 text-sm font-bold text-[#24483f]">Đóng</button>}
        </div>
      </header>
      ) : (
        <div className="flex shrink-0 items-center gap-2 rounded-xl border-2 border-[#123c36] bg-[#eef6f1] px-2.5 py-2">
          <button type="button" onClick={() => setConfigOpen(true)} aria-label="Cài đặt" className="shrink-0 rounded-lg border-2 border-[#8fa99e] bg-white px-2.5 py-1.5 text-base leading-none text-[#24483f]">⚙</button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-[#0f5a4e]">{FIELD_LABEL[field]}{sourceFilter ? ` · ${sourceFilter}` : ""} · còn {remainingMissing}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#dbe7e1]"><div className="h-full bg-[#0c5f4d] transition-all" style={{ width: `${pct}%` }} /></div>
          </div>
          <span className="shrink-0 text-xs font-bold text-[#4b655e]">{pos + 1}/{queue.length}</span>
        </div>
      )}

      {loading && !queue.length && (
        <div className="mt-2 rounded-2xl border-2 border-[#cdddd6] bg-white p-4">
          <div className="pl-skel h-4 w-16 rounded" />
          <div className="pl-skel mt-3 h-6 w-2/3 rounded" />
          <div className="pl-skel mt-4 h-3 w-1/2 rounded" />
          <div className="mt-4 grid grid-cols-2 gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="pl-skel h-12 rounded-xl" />)}</div>
        </div>
      )}

      {message && <p className="mt-2 rounded-lg border-2 border-[#9bb9ad] bg-[#f7faf8] px-3 py-2 text-sm text-[#193e35]">{message}</p>}

      {focusMode && current && (
        <article
          key={current.id}
          onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
          onTouchEnd={(e) => { if (touchX !== null && e.changedTouches[0].clientX - touchX < -70) skip(); setTouchX(null); }}
          className="pl-cardin relative mt-2 flex min-h-0 flex-1 flex-col rounded-2xl border-2 border-[#123c36] bg-white p-3 shadow-[0_8px_20px_rgba(18,60,54,.08)]"
        >
          {phase !== "idle" && <div className={`absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-white shadow ${phase === "saving" ? "bg-[#123c36]" : "bg-[#0c5f4d]"}`}>{phase === "saving" ? <><span className="pl-spin" />Đang lưu…</> : <>✓ {savedLabel}</>}</div>}
          <div className="shrink-0">
            <div className="flex gap-3">
              {current.imageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={current.imageUrl} alt={current.name} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} className="h-20 w-20 shrink-0 rounded-lg border border-[#cdddd6] bg-[#f5f8f6] object-cover" />
                : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-[#cdddd6] bg-[#f5f8f6] text-3xl text-[#9fb7ae]">🍽️</div>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-[#eef4f1] px-2 py-0.5 text-xs font-bold text-[#0c5f4d]">{current.source || "—"}</span>
                  {currentOf(current, field) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Hiện: {currentOf(current, field)}</span>}
                </div>
                <h2 className="mt-1 text-lg font-bold leading-6 text-[#122f2a]">{current.name}</h2>
                <p className="mt-0.5 text-[11px] text-[#637a73]">
                  {current.foodType ? `Loại ${current.foodType}` : "chưa loại"} · {current.foodGroup ?? "chưa nhóm"} · {current.proteinOrigin ?? "chưa nguồn đạm"}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#0f5a4e]">Chọn {FIELD_LABEL[field]}</p>
          </div>

          <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {valueOptions.map((opt) => {
                const active = pending === opt.value || currentOf(current, field) === opt.value;
                const { sw, icon } = optStyle(field, opt.value);
                return (
                  <button key={opt.value} type="button" disabled={busy} onClick={() => void apply(opt.value)}
                    style={active ? { background: sw.solid, borderColor: sw.solid, color: "#fff" } : { background: sw.bg, borderColor: sw.border, color: sw.text }}
                    className="flex items-center gap-2 rounded-xl border-2 px-2.5 py-2.5 text-left text-sm font-semibold transition active:scale-[.98]">
                    <span className="shrink-0 text-base leading-none">{icon}</span>
                    <span className="min-w-0">{opt.label}</span>
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
          </div>

          <div className="mt-2 flex shrink-0 items-center justify-between gap-2 border-t border-[#e1ebe6] pt-2">
            <button type="button" disabled={busy || !history.length} onClick={() => void undo()} className="rounded-lg border-2 border-[#8fa99e] px-2.5 py-1.5 text-xs font-semibold text-[#24483f] disabled:opacity-40">↩ Hoàn tác</button>
            <button type="button" disabled={busy} onClick={() => void apply(null)} className="rounded-lg border-2 border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-40">Xóa</button>
            <button type="button" onClick={skip} className="rounded-lg bg-[#f0f7f3] px-2.5 py-1.5 text-xs font-semibold text-[#0f5a4e]">Bỏ qua →</button>
          </div>
        </article>
      )}

      {done && (
        <div className="mt-2 flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-[#0c5f4d] bg-[#f4fbf7] p-5 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-1 font-semibold text-[#122f2a]">Xong hàng đợi {queue.length} thẻ!</p>
          <p className="mt-1 text-sm text-[#4b655e]">Còn {remainingMissing} dòng trống {FIELD_LABEL[field].toLowerCase()} trong CSDL.</p>
          <button type="button" onClick={buildQueue} className="mt-3 rounded-lg bg-[#123c36] px-4 py-2.5 text-sm font-bold text-white">Tải lượt tiếp</button>
        </div>
      )}
    </div>
  );
}
