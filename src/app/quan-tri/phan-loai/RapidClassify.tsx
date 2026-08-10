"use client";

// "Phân loại nhanh" — kiểu game lướt thẻ: mỗi lần 1 thực phẩm, bấm 1 phát gán
// 1 trường phân loại rồi qua thẻ kế. Tái dùng API classify-list (đọc) và
// bulk-classify (ghi, có nhật ký). Mobile-first để cài như app trên điện thoại.
import { useEffect, useMemo, useState } from "react";
import ShiftEvent, { type StatImpact } from "./ShiftEvent";

type FoodRow = {
  id: string; name: string; source: string; imageUrl: string | null;
  foodType: string | null; foodGroup: string | null; proteinOrigin: string | null;
  giLevel: number | null; purinLevel: number | null; cholesterolLevel: number | null;
  sourceCode: string | null; unit: string; wastePercent: number | null; vddGroupRaw: string | null;
  energyKcal: number | null; proteinG: number | null; lipidG: number | null; glucidG: number | null;
  fiberG: number | null; sodiumMg: number | null; calciumMg: number | null; ironMg: number | null;
  purinMg: number | null; cholesterolMg: number | null;
};
type FieldKey = "foodGroup" | "foodType" | "proteinOrigin" | "giLevel" | "purinLevel" | "cholesterolLevel";

const FIELD_LABEL: Record<FieldKey, string> = {
  foodGroup: "Nhóm thực phẩm", foodType: "Loại", proteinOrigin: "Nguồn đạm",
  giLevel: "Mức GI", purinLevel: "Mức Purin", cholesterolLevel: "Mức Cholesterol",
};
const LEVEL_FIELDS = new Set<FieldKey>(["giLevel", "purinLevel", "cholesterolLevel"]);
const FIELD_ORDER = Object.keys(FIELD_LABEL) as FieldKey[];
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

type SurvivalStats = { focus: number; integrity: number; momentum: number; morale: number };
type GameSave = { reviewed: number; round: number; keys: string[]; stats: SurvivalStats; shiftTurns: number; bestRun: number };
const INITIAL_STATS: SurvivalStats = { focus: 72, integrity: 76, momentum: 58, morale: 70 };

function loadGameStats(): GameSave {
  const empty: GameSave = { reviewed: 0, round: 1, keys: [], stats: INITIAL_STATS, shiftTurns: 0, bestRun: 0 };
  if (typeof window === "undefined") return empty;
  try {
    const saved = JSON.parse(localStorage.getItem("phanloai_game_stats_v1") || "{}");
    return {
      reviewed: typeof saved.reviewed === "number" ? saved.reviewed : 0,
      round: typeof saved.round === "number" ? saved.round : 1,
      keys: Array.isArray(saved.keys) ? saved.keys.filter((value: unknown): value is string => typeof value === "string") : [],
      stats: saved.stats && typeof saved.stats === "object" ? {
        focus: numberOr(saved.stats.focus, INITIAL_STATS.focus), integrity: numberOr(saved.stats.integrity, INITIAL_STATS.integrity),
        momentum: numberOr(saved.stats.momentum, INITIAL_STATS.momentum), morale: numberOr(saved.stats.morale, INITIAL_STATS.morale),
      } : INITIAL_STATS,
      shiftTurns: numberOr(saved.shiftTurns, 0),
      bestRun: numberOr(saved.bestRun, 0),
    };
  } catch { return empty; }
}

function numberOr(value: unknown, fallback: number) { return typeof value === "number" ? value : fallback; }
function clampStat(value: number) { return Math.max(0, Math.min(100, value)); }

export default function RapidClassify() {
  const [initialGame] = useState(loadGameStats);
  const [items, setItems] = useState<FoodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [field, setField] = useState<FieldKey>("foodGroup");
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [sourceFilter, setSourceFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [campaign, setCampaign] = useState(false);
  const [hideReviewed, setHideReviewed] = useState(true);
  const [roundSize, setRoundSize] = useState(30);
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
  const [reviewed, setReviewed] = useState(initialGame.reviewed);
  const [eventOpen, setEventOpen] = useState(false);
  const [eventRound, setEventRound] = useState(initialGame.round);
  const [reviewedKeys, setReviewedKeys] = useState<string[]>(initialGame.keys);
  const [stats, setStats] = useState<SurvivalStats>(initialGame.stats);
  const [shiftTurns, setShiftTurns] = useState(initialGame.shiftTurns);
  const [bestRun, setBestRun] = useState(initialGame.bestRun);
  const [gameOver, setGameOver] = useState(Object.values(initialGame.stats).some((value) => value <= 0));
  const [sourceOpen, setSourceOpen] = useState(false);

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

  useEffect(() => {
    try { localStorage.setItem("phanloai_game_stats_v1", JSON.stringify({ reviewed, round: eventRound, keys: reviewedKeys, stats, shiftTurns, bestRun })); } catch { /* localStorage bị chặn */ }
  }, [reviewed, eventRound, reviewedKeys, stats, shiftTurns, bestRun]);

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

  function resetGameProgress() {
    if (!window.confirm("Xóa tiến độ chơi trên máy này? Dữ liệu trong CSDL không bị thay đổi.")) return;
    setReviewed(0); setEventRound(1); setReviewedKeys([]); setStats(INITIAL_STATS); setShiftTurns(0); setBestRun(0); setGameOver(false);
  }

  function applyImpact(impact: StatImpact, countTurn = true) {
    const next = { ...stats };
    for (const key of Object.keys(impact) as (keyof SurvivalStats)[]) next[key] = clampStat(next[key] + (impact[key] ?? 0));
    setStats(next);
    if (countTurn) {
      const turns = shiftTurns + 1;
      setShiftTurns(turns);
      setBestRun((best) => Math.max(best, turns));
    }
    if (Object.values(next).some((value) => value <= 0)) setGameOver(true);
  }

  function startNewShift() {
    setStats(INITIAL_STATS); setShiftTurns(0); setGameOver(false); setEventOpen(false); setSourceOpen(false);
  }

  const byId = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);
  const sources = useMemo(() => [...new Set(items.map((it) => it.source).filter(Boolean))].sort(), [items]);
  const types = useMemo(() => [...new Set(items.map((it) => it.foodType).filter((value): value is string => !!value))].sort(), [items]);
  const groups = useMemo(() => [...new Set(items.map((it) => it.foodGroup).filter((value): value is string => !!value))].sort((a, b) => a.localeCompare(b, "vi")), [items]);
  const reviewedSet = useMemo(() => new Set(reviewedKeys), [reviewedKeys]);

  // Giá trị gợi ý (chips) cho trường đang chọn.
  const valueOptions = useMemo<{ value: string; label: string }[]>(() => {
    if (field === "foodType") return FOODTYPE_OPTIONS;
    if (LEVEL_FIELDS.has(field)) return LEVEL_OPTIONS;
    const set = new Set<string>();
    for (const it of items) { const v = currentOf(it, field); if (v) set.add(v); }
    return [...set].sort((a, b) => a.localeCompare(b, "vi")).map((v) => ({ value: v, label: v }));
  }, [items, field]);

  const remainingMissing = useMemo(
    () => items.filter((it) => (!sourceFilter || it.source === sourceFilter) && (!typeFilter || it.foodType === typeFilter) && (!groupFilter || it.foodGroup === groupFilter) && !currentOf(it, field)).length,
    [items, field, sourceFilter, typeFilter, groupFilter],
  );

  function filteredIds(targetField: FieldKey) {
    const needle = nameFilter.trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    return items
      .filter((it) => (!sourceFilter || it.source === sourceFilter))
      .filter((it) => (!typeFilter || it.foodType === typeFilter))
      .filter((it) => (!groupFilter || it.foodGroup === groupFilter))
      .filter((it) => !needle || it.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(needle))
      .filter((it) => !hideReviewed || !reviewedSet.has(`${targetField}:${it.id}`))
      .filter((it) => (onlyMissing ? !currentOf(it, targetField) : true))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"))
      .slice(0, roundSize)
      .map((it) => it.id);
  }

  function startQueue(targetField: FieldKey) {
    const list = filteredIds(targetField);
    setField(targetField);
    setQueue(list);
    setPos(0);
    setHistory([]);
    setConfigOpen(list.length ? false : true);
    setMessage(list.length ? "" : "Không còn dòng nào khớp bộ lọc — thử tắt “chỉ dòng còn trống”.");
  }

  function buildQueue() {
    startQueue(field);
  }

  function nextCampaignField() {
    const index = FIELD_ORDER.indexOf(field);
    const next = FIELD_ORDER[index + 1];
    if (next) startQueue(next);
    else { setCampaign(false); setQueue([]); setMessage("🏆 Đã hoàn thành chiến dịch rà toàn bộ 6 trường!"); setConfigOpen(true); }
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
        body: JSON.stringify({ ids: [id], field, value, reason: `Ca trực 2598: ${FIELD_LABEL[field]}` }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMessage(data.error ?? "Chưa lưu được."); setBusy(false); setPhase("idle"); setPending(null); return; }
      setItems((prevItems) => prevItems.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
      setHistory((h) => [...h, { id, field, prev }]);
      setSavedLabel(value === null ? "Đã xóa" : "Đã lưu");
      setPhase("saved");
      const nextReviewed = reviewed + 1;
      setReviewed(nextReviewed);
      applyImpact(value === null
        ? { focus: -3, integrity: -4, momentum: 1, morale: -2 }
        : value === prev
          ? { focus: -2, integrity: 2, momentum: 4, morale: 1 }
          : { focus: -5, integrity: 5, momentum: 3, morale: 2 });
      setReviewedKeys((keys) => keys.includes(`${field}:${id}`) ? keys : [...keys, `${field}:${id}`]);
      // Giữ ✓ một nhịp để người dùng kịp thấy rồi mới trượt qua thẻ kế.
      window.setTimeout(() => { setPos((p) => p + 1); setCustom(""); setSourceOpen(false); setPhase("idle"); setPending(null); setBusy(false); if (nextReviewed % 10 === 0) setEventOpen(true); }, 430);
    } catch { setMessage("Mất kết nối khi lưu."); setBusy(false); setPhase("idle"); setPending(null); }
  }

  function skip() { applyImpact({ focus: 2, integrity: 3, momentum: -5, morale: -1 }); setSourceOpen(false); setPos((p) => p + 1); }

  function inspectSource() {
    if (!sourceOpen) applyImpact({ focus: -1, integrity: 3, momentum: -1 }, false);
    setSourceOpen((open) => !open);
  }

  async function undo() {
    const last = history[history.length - 1];
    if (!last || busy) return;
    setBusy(true);
    try {
      await fetch("/api/admin/data/bulk-classify", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [last.id], field: last.field, value: last.prev === "" ? null : (LEVEL_FIELDS.has(last.field) ? Number(last.prev) : last.prev), reason: "Hoàn tác Ca trực 2598" }),
      });
      setItems((prevItems) => prevItems.map((it) => (it.id === last.id ? { ...it, [last.field]: last.prev === "" ? null : last.prev } : it)));
      setHistory((h) => h.slice(0, -1));
      setReviewedKeys((keys) => keys.filter((key) => key !== `${last.field}:${last.id}`));
      setReviewed((value) => Math.max(0, value - 1));
      setPos((p) => Math.max(0, p - 1));
    } catch { setMessage("Không hoàn tác được."); }
    setBusy(false);
  }

  const done = queue.length > 0 && pos >= queue.length;
  const focusMode = queue.length > 0 && !done;
  const pct = queue.length ? (pos / queue.length) * 100 : 0;
  const hasMoreInField = done && filteredIds(field).length > 0;

  return (
    <div className="mx-auto flex h-[100svh] max-w-4xl flex-col overflow-hidden px-3 pb-3 pt-2 sm:px-5">
      <style>{`
        @keyframes plIn{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:none}}
        @keyframes plSpin{to{transform:rotate(360deg)}}
        @keyframes plShim{100%{background-position:-200% 0}}
        .pl-cardin{animation:plIn .28s cubic-bezier(.2,.7,.3,1)}
        .pl-spin{width:12px;height:12px;border:2px solid rgba(255,255,255,.45);border-top-color:#fff;border-radius:50%;display:inline-block;animation:plSpin .6s linear infinite}
        .pl-skel{background:linear-gradient(90deg,#eef3f1 25%,#e0eae6 37%,#eef3f1 63%);background-size:200% 100%;animation:plShim 1.2s ease-in-out infinite}
      `}</style>
      {(!focusMode || configOpen) ? (
      <header className="max-h-[calc(100svh-1rem)] shrink-0 overflow-y-auto rounded-2xl border-2 border-[#123c36] bg-[#eef6f1] p-3">
        {!focusMode && <>
        <p className="text-[11px] font-bold tracking-[.16em] text-[#0f5a4e]">GAME KIỂM DUYỆT DỮ LIỆU</p>
        <div className="flex flex-wrap items-end justify-between gap-2"><div><h1 className="text-lg font-semibold text-[#102f2b]">👑 Ca trực 2598</h1><p className="text-xs text-[#527168]">Sinh tồn bằng những lựa chọn có căn cứ.</p></div><div className="flex gap-2 text-xs font-bold"><span className="rounded-full bg-white px-2.5 py-1 text-[#0c5f4d]">✅ {reviewed} thẻ</span><span className="rounded-full bg-[#102f59] px-2.5 py-1 text-white">Kỷ lục {bestRun} lượt</span></div></div>
        <SurvivalMeters stats={stats} />
        {!standalone && (installEvt
          ? <button type="button" onClick={installApp} className="mt-2 w-full rounded-lg border-2 border-[#0c5f4d] bg-white px-3 py-2 text-sm font-bold text-[#0c5f4d] active:scale-[.99]">📲 Cài ứng dụng ra màn hình chính</button>
          : <p className="mt-2 rounded-lg bg-white/70 px-3 py-1.5 text-[11px] text-[#4b655e]">Cài như app: menu Chrome ⋮ → “Thêm vào màn hình chính”.</p>
        )}
        </>}
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
          <label className="text-xs font-semibold text-[#24483f]">Loại
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="mt-1 w-full rounded-lg border-2 border-[#8fa99e] bg-white px-2 py-2 text-sm"><option value="">Tất cả</option>{types.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          </label>
          <label className="text-xs font-semibold text-[#24483f]">Nhóm
            <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="mt-1 w-full rounded-lg border-2 border-[#8fa99e] bg-white px-2 py-2 text-sm"><option value="">Tất cả</option>{groups.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          </label>
        </div>
        <label className="mt-2 block text-xs font-semibold text-[#24483f]">Tìm theo tên
          <input value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} placeholder="VD: cá, sữa, món cháo…" className="mt-1 w-full rounded-lg border-2 border-[#8fa99e] bg-white px-3 py-2 text-sm" />
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2"><label className="flex items-center gap-2 text-xs font-semibold text-[#24483f]">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} className="h-4 w-4" />
          Chỉ dòng còn trống ({remainingMissing} dòng)
        </label><label className="flex items-center gap-2 text-xs font-semibold text-[#24483f]"><input type="checkbox" checked={hideReviewed} onChange={(e) => setHideReviewed(e.target.checked)} className="h-4 w-4" />Ẩn thẻ đã rà trên máy</label><label className="ml-auto flex items-center gap-2 text-xs font-semibold text-[#24483f]">Mỗi lượt<select value={roundSize} onChange={(e) => setRoundSize(Number(e.target.value))} className="rounded-md border border-[#8fa99e] bg-white px-2 py-1"><option value={10}>10 thẻ</option><option value={30}>30 thẻ</option><option value={50}>50 thẻ</option><option value={100}>100 thẻ</option></select></label></div>
        <div className="mt-2 flex flex-wrap items-center gap-2"><button type="button" onClick={() => { setCampaign((value) => !value); setOnlyMissing(false); }} className={`rounded-lg border-2 px-3 py-1.5 text-xs font-bold ${campaign ? "border-[#102f59] bg-[#102f59] text-white" : "border-[#8fa99e] bg-white text-[#24483f]"}`}>🏆 Chiến dịch đủ 6 trường {campaign ? "✓" : ""}</button><button type="button" onClick={resetGameProgress} className="rounded-lg border border-[#8fa99e] bg-white px-3 py-1.5 text-xs font-semibold text-[#637a73]">Đặt lại ca/tiến độ</button></div>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={buildQueue} disabled={loading} className="flex-1 rounded-lg bg-[#123c36] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {loading ? "Đang tải dữ liệu…" : queue.length ? "Làm lại hàng đợi" : campaign ? "Bắt đầu chiến dịch" : "Bắt đầu"}
          </button>
          {focusMode && <button type="button" onClick={() => setConfigOpen(false)} className="rounded-lg border-2 border-[#8fa99e] bg-white px-4 py-2.5 text-sm font-bold text-[#24483f]">Đóng</button>}
        </div>
      </header>
      ) : (
        <div className="flex shrink-0 items-center gap-2 rounded-xl border-2 border-[#123c36] bg-[#eef6f1] px-2.5 py-2">
          <button type="button" onClick={() => setConfigOpen(true)} aria-label="Cài đặt" className="shrink-0 rounded-lg border-2 border-[#8fa99e] bg-white px-2.5 py-1.5 text-base leading-none text-[#24483f]">⚙</button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-[#0f5a4e]">{campaign ? "🏆 Chiến dịch · " : ""}{FIELD_LABEL[field]}{sourceFilter ? ` · ${sourceFilter}` : ""} · còn {remainingMissing}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#dbe7e1]"><div className="h-full bg-[#0c5f4d] transition-all" style={{ width: `${pct}%` }} /></div>
          </div>
          <SurvivalMeters stats={stats} compact />
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
            <div className="mt-2 rounded-lg border border-[#cdddd6] bg-[#f7faf8] px-2.5 py-1.5">
              <button type="button" onClick={inspectSource} className="w-full text-left text-xs font-bold text-[#24483f]">📊 {sourceOpen ? "Ẩn" : "Mở"} số liệu nguồn — chỉ đọc, không chỉnh</button>
              {sourceOpen && <>
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-[11px] sm:grid-cols-6">
                <Fact label="Năng lượng" value={fmt(current.energyKcal, "kcal")} /><Fact label="Đạm" value={fmt(current.proteinG, "g")} /><Fact label="Béo" value={fmt(current.lipidG, "g")} /><Fact label="Bột đường" value={fmt(current.glucidG, "g")} /><Fact label="Xơ" value={fmt(current.fiberG, "g")} /><Fact label="Natri" value={fmt(current.sodiumMg, "mg")} />
                <Fact label="Canxi" value={fmt(current.calciumMg, "mg")} /><Fact label="Sắt" value={fmt(current.ironMg, "mg")} /><Fact label="Purin" value={fmt(current.purinMg, "mg")} /><Fact label="Cholesterol" value={fmt(current.cholesterolMg, "mg")} /><Fact label="Thải bỏ" value={fmt(current.wastePercent, "%")} /><Fact label="Đơn vị" value={current.unit || "—"} />
              </div>
              <p className="mt-2 text-[11px] text-[#637a73]">Mã nguồn: {current.sourceCode || "—"} · Nhóm VDD gốc: {current.vddGroupRaw || "—"}</p>
              </>}
            </div>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#0f5a4e]">Chọn {FIELD_LABEL[field]}</p>
          </div>

          <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
          {campaign ? (hasMoreInField ? <button type="button" onClick={buildQueue} className="mt-3 rounded-lg bg-[#102f59] px-4 py-2.5 text-sm font-bold text-white">Lượt tiếp: {FIELD_LABEL[field]} →</button> : <button type="button" onClick={nextCampaignField} className="mt-3 rounded-lg bg-[#102f59] px-4 py-2.5 text-sm font-bold text-white">{FIELD_ORDER.indexOf(field) < FIELD_ORDER.length - 1 ? <>Trường kế: {FIELD_LABEL[FIELD_ORDER[FIELD_ORDER.indexOf(field) + 1]]} →</> : <>🏆 Hoàn tất chiến dịch</>}</button>) : <button type="button" onClick={buildQueue} className="mt-3 rounded-lg bg-[#123c36] px-4 py-2.5 text-sm font-bold text-white">Tải lượt tiếp</button>}
        </div>
      )}
      {eventOpen && !gameOver && <ShiftEvent round={eventRound} onChoose={(impact) => { applyImpact(impact); setEventRound((value) => value + 1); setEventOpen(false); }} />}
      {gameOver && <GameOver stats={stats} turns={shiftTurns} best={bestRun} onRestart={startNewShift} />}
    </div>
  );
}

function fmt(value: number | null, unit: string) {
  return value === null ? "—" : `${Math.round(value * 10) / 10} ${unit}`;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-[#d7e4de] bg-white px-1 py-1.5"><span className="block text-[#637a73]">{label}</span><b className="mt-0.5 block text-[#122f2a]">{value}</b></div>;
}

const STAT_META = {
  focus: { label: "Tập trung", icon: "◉", color: "#2878a5" },
  integrity: { label: "Thận trọng", icon: "◆", color: "#0c7a5c" },
  momentum: { label: "Nhịp độ", icon: "»", color: "#b56b17" },
  morale: { label: "Tinh thần", icon: "♥", color: "#a13c67" },
} satisfies Record<keyof SurvivalStats, { label: string; icon: string; color: string }>;

function SurvivalMeters({ stats, compact = false }: { stats: SurvivalStats; compact?: boolean }) {
  if (compact) return <div className="hidden w-36 shrink-0 grid-cols-2 gap-x-2 gap-y-1 sm:grid">
    {(Object.keys(STAT_META) as (keyof SurvivalStats)[]).map((key) => <div key={key} title={`${STAT_META[key].label}: ${stats[key]}`} className="flex items-center gap-1 text-[9px] font-black" style={{ color: STAT_META[key].color }}><span>{STAT_META[key].icon}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white"><div className="h-full transition-all duration-500" style={{ width: `${stats[key]}%`, backgroundColor: STAT_META[key].color }} /></div><span>{stats[key]}</span></div>)}
  </div>;
  return <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-[#c5d9d1] bg-white/70 p-2 sm:grid-cols-4">
    {(Object.keys(STAT_META) as (keyof SurvivalStats)[]).map((key) => <div key={key}><div className="flex items-center justify-between text-[11px] font-black" style={{ color: STAT_META[key].color }}><span>{STAT_META[key].icon} {STAT_META[key].label}</span><span>{stats[key]}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-[#e5ede9]"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${stats[key]}%`, backgroundColor: STAT_META[key].color }} /></div></div>)}
  </div>;
}

function GameOver({ stats, turns, best, onRestart }: { stats: SurvivalStats; turns: number; best: number; onRestart: () => void }) {
  const failed = (Object.keys(stats) as (keyof SurvivalStats)[]).find((key) => stats[key] <= 0);
  return <div className="fixed inset-0 z-[110] grid place-items-center bg-[#071b17]/85 p-4 backdrop-blur-sm"><section className="w-full max-w-md rounded-3xl border-4 border-[#9bb9ad] bg-[#f7faf8] p-6 text-center shadow-2xl"><div className="text-5xl">🕯️</div><p className="mt-3 text-xs font-black tracking-[.16em] text-[#6b7f78]">CA TRỰC KẾT THÚC</p><h2 className="mt-2 text-2xl font-black text-[#102f2b]">{failed ? `${STAT_META[failed].label} đã cạn` : "Đã đến lúc nghỉ ca"}</h2><p className="mt-2 text-sm leading-6 text-[#4f6b62]">Bạn trụ được <b>{turns} lượt</b>. Kỷ lục trên thiết bị này là <b>{best} lượt</b>. Các chỉnh sửa đã lưu vẫn giữ nguyên và có nhật ký.</p><SurvivalMeters stats={stats} /><button type="button" onClick={onRestart} className="mt-5 w-full rounded-xl bg-[#123c36] px-4 py-3 font-black text-white">Bắt đầu ca mới</button></section></div>;
}
