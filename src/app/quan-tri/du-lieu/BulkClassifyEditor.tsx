"use client";

import { useEffect, useMemo, useState } from "react";

type FoodRow = {
  id: string; name: string; source: string;
  foodType: string | null; foodGroup: string | null; proteinOrigin: string | null;
  giLevel: number | null; purinLevel: number | null; cholesterolLevel: number | null;
};

type FieldKey = "foodType" | "foodGroup" | "proteinOrigin" | "giLevel" | "purinLevel" | "cholesterolLevel";
const FIELD_LABEL: Record<FieldKey, string> = {
  foodType: "Loại (foodType)", foodGroup: "Nhóm thực phẩm", proteinOrigin: "Nguồn đạm",
  giLevel: "Mức GI", purinLevel: "Mức Purin", cholesterolLevel: "Mức Cholesterol",
};
const LEVEL_FIELDS = new Set<FieldKey>(["giLevel", "purinLevel", "cholesterolLevel"]);
const LEVEL_OPTIONS = [
  { value: 0, label: "0 — Thấp" }, { value: 1, label: "1 — Trung bình" },
  { value: 2, label: "2 — Cao" }, { value: 3, label: "3 — Rất cao" },
];
const UNSET = "__unset__";

const NOT_SET = "(chưa có)";

export default function BulkClassifyEditor() {
  const [items, setItems] = useState<FoodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Partial<Record<keyof FoodRow, string>>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [field, setField] = useState<FieldKey>("foodGroup");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("Sửa phân loại hàng loạt theo đối chiếu thủ công giữa nguồn VDD và RNI.");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/admin/data/classify-list");
      const data = await res.json();
      setLoading(false);
      if (res.ok) setItems(data.items);
      else setMessage(data.error ?? "Không tải được danh sách.");
    })();
  }, []);

  const distinct = useMemo(() => {
    const cols: (keyof FoodRow)[] = ["source", "foodType", "foodGroup", "proteinOrigin", "giLevel", "purinLevel", "cholesterolLevel"];
    const out: Partial<Record<keyof FoodRow, string[]>> = {};
    for (const col of cols) {
      const set = new Set<string>();
      for (const item of items) { const v = item[col]; set.add(v === null || v === undefined || v === "" ? NOT_SET : String(v)); }
      out[col] = [...set].sort((a, b) => (a === NOT_SET ? 1 : b === NOT_SET ? -1 : a.localeCompare(b, "vi")));
    }
    return out;
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (q && !item.name.toLowerCase().includes(q)) return false;
      for (const [col, want] of Object.entries(filters)) {
        if (!want) continue;
        const v = item[col as keyof FoodRow];
        const actual = v === null || v === undefined || v === "" ? NOT_SET : String(v);
        if (actual !== want) return false;
      }
      return true;
    });
  }, [items, search, filters]);

  const visible = filtered.slice(0, 300);
  const allVisibleSelected = filtered.length > 0 && filtered.every((item) => selected.has(item.id));

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => { const next = new Set(prev); if (checked) next.add(id); else next.delete(id); return next; });
  }
  function toggleAllFiltered(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const item of filtered) { if (checked) next.add(item.id); else next.delete(item.id); }
      return next;
    });
  }

  const valueOptions: string[] = field === "foodType" ? ["TS", "CB", "MA", "SP"] : (distinct[field] ?? []).filter((v) => v !== NOT_SET);

  async function applyBulk() {
    if (!selected.size) { setMessage("Chưa chọn dòng nào."); return; }
    if (!reason.trim()) { setMessage("Cần ghi lý do trước khi cập nhật."); return; }
    setBusy(true); setMessage("");
    const payloadValue: string | number | null = value === UNSET || value === "" ? null : (LEVEL_FIELDS.has(field) ? Number(value) : value);
    const res = await fetch("/api/admin/data/bulk-classify", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: [...selected], field, value: payloadValue, reason: reason.trim() }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setMessage(data.error ?? "Chưa thể cập nhật."); return; }
    setItems((prev) => prev.map((item) => (selected.has(item.id) ? { ...item, [field]: payloadValue } : item)));
    setMessage(`Đã cập nhật ${data.updated} dòng, bỏ qua ${data.skipped} dòng (đã đúng giá trị/không hợp lệ).${data.warning ? ` ${data.warning}` : ""}`);
    setSelected(new Set());
  }

  return <section className="rounded-xl border-2 border-[#123c36] bg-white p-5">
    <h2 className="text-xl font-semibold">Sửa phân loại hàng loạt</h2>
    <p className="mt-1 text-sm">Lọc, tích chọn nhiều dòng, rồi gán 1 giá trị cho 1 trường phân loại cùng lúc — dùng cho việc đối chiếu thủ công nhóm/nguồn đạm giữa VDD và RNI. Không dùng để sửa số liệu dinh dưỡng.</p>
    {loading && <p className="mt-3 text-sm">Đang tải {items.length ? `(${items.length})` : ""}…</p>}
    {message && <p className="mt-3 rounded border-2 border-[#8fa99e] bg-[#f7faf8] p-3 text-sm">{message}</p>}

    <div className="mt-4 flex flex-wrap gap-2">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên…" className="min-w-56 flex-1 rounded border-2 border-[#8fa99e] px-3 py-2 text-sm" />
      {(["source", "foodType", "foodGroup", "proteinOrigin", "giLevel", "purinLevel", "cholesterolLevel"] as (keyof FoodRow)[]).map((col) => (
        <select key={col} value={filters[col] ?? ""} onChange={(e) => setFilters((prev) => ({ ...prev, [col]: e.target.value }))} className="rounded border-2 border-[#8fa99e] px-2 py-2 text-sm">
          <option value="">{FIELD_LABEL[col as FieldKey] ?? col}: tất cả</option>
          {(distinct[col] ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      ))}
      {Object.values(filters).some(Boolean) && <button type="button" onClick={() => setFilters({})} className="rounded border-2 border-neutral-400 px-3 py-2 text-sm font-semibold">Xóa lọc</button>}
    </div>

    <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
      <input type="checkbox" checked={allVisibleSelected} onChange={(e) => toggleAllFiltered(e.target.checked)} />
      Chọn tất cả đang lọc ({filtered.length}){selected.size > 0 && <span className="ml-2 rounded-full bg-[#123c36] px-2 py-0.5 text-xs font-semibold text-white">Đã chọn {selected.size}</span>}
    </label>

    <div className="mt-2 max-h-80 overflow-auto rounded border-2 border-[#8fa99e]">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-[#edf4f0]"><tr>
          <th className="p-2"></th><th className="p-2 text-left">Tên</th><th className="p-2 text-left">Nguồn</th>
          <th className="p-2 text-left">Loại</th><th className="p-2 text-left">Nhóm</th><th className="p-2 text-left">Nguồn đạm</th>
          <th className="p-2 text-left">GI</th><th className="p-2 text-left">Purin</th><th className="p-2 text-left">Cholesterol</th>
        </tr></thead>
        <tbody>{visible.map((item) => <tr key={item.id} className="border-t">
          <td className="p-2"><input type="checkbox" checked={selected.has(item.id)} onChange={(e) => toggleOne(item.id, e.target.checked)} /></td>
          <td className="p-2 font-semibold">{item.name}</td>
          <td className="p-2">{item.source}</td>
          <td className="p-2">{item.foodType ?? "—"}</td>
          <td className="p-2">{item.foodGroup ?? "—"}</td>
          <td className="p-2">{item.proteinOrigin ?? "—"}</td>
          <td className="p-2">{item.giLevel ?? "—"}</td>
          <td className="p-2">{item.purinLevel ?? "—"}</td>
          <td className="p-2">{item.cholesterolLevel ?? "—"}</td>
        </tr>)}</tbody>
      </table>
      {filtered.length > visible.length && <p className="p-2 text-xs text-neutral-600">Hiển thị {visible.length}/{filtered.length} dòng (đã lọc) — chọn tất cả vẫn áp dụng cho toàn bộ {filtered.length} dòng.</p>}
      {!filtered.length && !loading && <p className="p-3 text-sm">Không có dòng nào khớp bộ lọc.</p>}
    </div>

    {selected.size > 0 && <div className="mt-4 rounded-xl border-2 border-[#73540d] bg-[#fffdf6] p-4">
      <h3 className="font-semibold">Sửa hàng loạt cho {selected.size} dòng đã chọn</h3>
      <label className="mt-3 block text-sm font-semibold">Trường cần sửa
        <select value={field} onChange={(e) => { setField(e.target.value as FieldKey); setValue(""); }} className="mt-1 block rounded border-2 border-[#8fa99e] px-3 py-2">
          {(Object.keys(FIELD_LABEL) as FieldKey[]).map((key) => <option key={key} value={key}>{FIELD_LABEL[key]}</option>)}
        </select>
      </label>
      <div className="mt-3">
        <p className="text-sm font-semibold">Giá trị mới</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <button type="button" onClick={() => setValue(UNSET)} className={`rounded-full border-2 px-3 py-1 text-sm ${value === UNSET ? "border-[#123c36] bg-[#123c36] text-white" : "border-[#8fa99e]"}`}>Xóa giá trị (để trống)</button>
          {LEVEL_FIELDS.has(field)
            ? LEVEL_OPTIONS.map((opt) => <button key={opt.value} type="button" onClick={() => setValue(String(opt.value))} className={`rounded-full border-2 px-3 py-1 text-sm ${value === String(opt.value) ? "border-[#123c36] bg-[#123c36] text-white" : "border-[#8fa99e]"}`}>{opt.label}</button>)
            : valueOptions.map((opt) => <button key={opt} type="button" onClick={() => setValue(opt)} className={`rounded-full border-2 px-3 py-1 text-sm ${value === opt ? "border-[#123c36] bg-[#123c36] text-white" : "border-[#8fa99e]"}`}>{opt}</button>)}
        </div>
        {!LEVEL_FIELDS.has(field) && <input value={value === UNSET ? "" : value} onChange={(e) => setValue(e.target.value)} placeholder="Hoặc gõ giá trị mới…" className="mt-2 w-full max-w-sm rounded border-2 border-[#8fa99e] px-3 py-2 text-sm" />}
      </div>
      <label className="mt-3 block text-sm font-semibold">Lý do
        <textarea required value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 min-h-16 w-full rounded border-2 border-[#8fa99e] px-3 py-2 text-sm" />
      </label>
      <button type="button" disabled={busy} onClick={() => void applyBulk()} className="mt-3 rounded bg-[#123c36] px-5 py-2.5 font-semibold text-white disabled:opacity-60">{busy ? "Đang cập nhật…" : `Cập nhật ${FIELD_LABEL[field]} cho ${selected.size} dòng`}</button>
    </div>}
  </section>;
}
