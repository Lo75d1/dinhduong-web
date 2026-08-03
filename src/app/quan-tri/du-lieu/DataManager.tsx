"use client";

import { useEffect, useMemo, useState } from "react";

type Food = Record<string, string | number | null> & {
  id: string;
  name: string;
  source: string;
  sourceCode?: string | null;
};

type Col = {
  key: string;
  label: string;
  kind: "text" | "num" | "type" | "readonly" | "date";
  width: string;
};

// Cột theo kiểu bảng tính (Excel) — sửa tại chỗ nhiều dòng, lưu theo lô.
const COLS: Col[] = [
  { key: "name", label: "Tên thực phẩm / món ăn", kind: "text", width: "min-w-[240px]" },
  { key: "foodType", label: "Loại", kind: "type", width: "w-[74px]" },
  { key: "foodGroup", label: "Nhóm", kind: "text", width: "min-w-[150px]" },
  { key: "wastePercent", label: "Thải bỏ %", kind: "num", width: "w-[76px]" },
  { key: "energyKcal", label: "kcal", kind: "num", width: "w-[72px]" },
  { key: "proteinG", label: "Đạm", kind: "num", width: "w-[64px]" },
  { key: "lipidG", label: "Béo", kind: "num", width: "w-[64px]" },
  { key: "glucidG", label: "Bột đường", kind: "num", width: "w-[80px]" },
  { key: "fiberG", label: "Xơ", kind: "num", width: "w-[60px]" },
  { key: "source", label: "Nguồn", kind: "readonly", width: "w-[64px]" },
  { key: "sourceNote", label: "Ghi chú / nguồn đối chiếu", kind: "text", width: "min-w-[220px]" },
  { key: "updatedAt", label: "Cập nhật", kind: "date", width: "w-[112px]" },
];

const NUM_KEYS = new Set(["wastePercent", "energyKcal", "proteinG", "lipidG", "glucidG", "fiberG"]);
const foodTypeOptions = ["", "TS", "CB", "MA", "SP"];

function normalise(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
function orig(item: Food, key: string) {
  const v = item[key];
  return v == null ? "" : String(v);
}
function csvCell(value: string) {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export default function DataManager() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Food[]>([]);
  // edits[id][field] = giá trị đang gõ (chuỗi). Chỉ chứa ô KHÁC bản gốc.
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const response = await fetch(`/api/admin/data/foods?q=${encodeURIComponent(q)}`);
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setItems(data.items ?? []);
        setEdits({});
      } else setMessage(data.error ?? "Không thể tải dữ liệu.");
    } catch {
      setMessage("Không thể kết nối để tải dữ liệu.");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const foodGroupOptions = useMemo(() => {
    const groups = new Set(items.map((item) => String(item.foodGroup ?? "").trim()).filter(Boolean));
    return [...groups].sort((a, b) => a.localeCompare(b, "vi"));
  }, [items]);

  const visibleItems = useMemo(() => {
    const query = normalise(q.trim());
    if (!query) return items;
    return [...items].sort((a, b) => {
      const aStarts = normalise(a.name).startsWith(query) ? 0 : 1;
      const bStarts = normalise(b.name).startsWith(query) ? 0 : 1;
      return aStarts - bStarts || normalise(a.name).localeCompare(normalise(b.name), "vi");
    });
  }, [items, q]);

  const dirtyIds = Object.keys(edits);
  const dirtyCount = dirtyIds.length;

  function cellValue(item: Food, key: string) {
    const e = edits[item.id];
    if (e && key in e) return e[key];
    if (key === "updatedAt") return orig(item, key) ? new Date(String(item[key])).toLocaleDateString("vi-VN") : "";
    return orig(item, key);
  }

  function setCell(item: Food, key: string, value: string) {
    setEdits((prev) => {
      const next = { ...prev };
      const row = { ...(next[item.id] ?? {}) };
      if (value === orig(item, key)) delete row[key];
      else row[key] = value;
      if (Object.keys(row).length === 0) delete next[item.id];
      else next[item.id] = row;
      return next;
    });
  }

  const saveAll = async () => {
    if (!dirtyCount || !reason.trim()) return;
    setBusy(true);
    setMessage("");
    let ok = 0;
    const failed: string[] = [];
    for (const id of dirtyIds) {
      const row = edits[id];
      const values: Record<string, string | number | null> = {};
      for (const [key, raw] of Object.entries(row)) {
        if (NUM_KEYS.has(key)) {
          const t = raw.trim();
          values[key] = t === "" ? null : Number.isFinite(Number(t.replace(",", "."))) ? Number(t.replace(",", ".")) : null;
        } else {
          values[key] = raw;
        }
      }
      try {
        const response = await fetch(`/api/admin/data/foods/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ values, reason: reason.trim() }),
        });
        if (response.ok) ok += 1;
        else {
          const data = await response.json().catch(() => ({}));
          failed.push(`${items.find((i) => i.id === id)?.name ?? id}: ${data.error ?? response.status}`);
        }
      } catch {
        failed.push(`${items.find((i) => i.id === id)?.name ?? id}: lỗi kết nối`);
      }
    }
    setBusy(false);
    setMessage(failed.length ? `Đã lưu ${ok} dòng. ${failed.length} dòng lỗi — ${failed.slice(0, 3).join("; ")}${failed.length > 3 ? "…" : ""}` : `Đã lưu ${ok} dòng và ghi nhật ký thay đổi.`);
    if (ok > 0) await load();
  };

  const exportCsv = () => {
    const header = COLS.map((c) => c.label);
    const lines = [header.map(csvCell).join(",")];
    for (const item of visibleItems) {
      const cells = COLS.map((c) => {
        if (c.key === "updatedAt") return cellValue(item, "updatedAt");
        if (c.key === "source") return `${orig(item, "source")}${item.sourceCode ? ` (${item.sourceCode})` : ""}`;
        return cellValue(item, c.key);
      });
      lines.push(cells.map(csvCell).join(","));
    }
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `du-lieu-thuc-pham_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <section className="rounded-xl border-2 border-[#123c36] bg-white p-4 shadow-[0_8px_20px_rgba(18,60,54,.04)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[.16em] text-[#0f5a4e]">BẢNG TÍNH DỮ LIỆU</p>
            <h2 className="mt-0.5 text-xl font-semibold text-[#122f2a]">Thực phẩm và món ăn</h2>
            <p className="mt-0.5 text-sm text-[#506761]">Sửa trực tiếp trong ô như Excel; ghi lý do rồi bấm lưu tất cả. Mọi thay đổi đều được ghi nhật ký.</p>
          </div>
          <div className="rounded-lg border border-[#bed2c9] bg-[#f5faf7] px-3 py-1.5 text-sm text-[#284c43]">Đang hiển thị <b>{visibleItems.length}</b> · Sửa <b className={dirtyCount ? "text-[#b45309]" : ""}>{dirtyCount}</b></div>
        </div>

        <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center">
          <form onSubmit={(event) => { event.preventDefault(); void load(); }} className="flex min-w-0 flex-1 gap-2">
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Tìm tên thực phẩm, món ăn hoặc mã nguồn… (tối đa 100 dòng)" className="min-w-0 flex-1 rounded-lg border-2 border-[#8fa99e] bg-white px-3 py-2 text-sm outline-none focus:border-[#0b6957] focus:ring-2 focus:ring-[#b9ddd0]" />
            <button type="submit" className="rounded-lg bg-[#123c36] px-4 py-2 text-sm font-bold text-white hover:bg-[#0b5549]">Tìm</button>
          </form>
          <button type="button" onClick={exportCsv} className="rounded-lg border-2 border-[#0b6957] bg-white px-4 py-2 text-sm font-bold text-[#0b6957] hover:bg-[#eef6f1]">⬇ Xuất CSV (Excel)</button>
        </div>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Lý do thay đổi & nguồn đối chiếu (bắt buộc để lưu)" className="min-w-0 flex-1 rounded-lg border border-[#cdb56d] bg-[#fffdf5] px-3 py-2 text-sm outline-none focus:border-[#9a7615] focus:ring-2 focus:ring-[#eadcaa]" />
          <button type="button" disabled={busy || !dirtyCount || !reason.trim()} onClick={() => void saveAll()} className="rounded-lg bg-[#123c36] px-4 py-2 text-sm font-bold text-white hover:bg-[#0b5549] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Đang lưu…" : `Lưu ${dirtyCount || ""} thay đổi`}</button>
        </div>

        {message && <p role="status" className="mt-3 rounded-lg border border-[#9bb9ad] bg-[#f5faf7] px-3 py-2 text-sm font-medium text-[#193e35]">{message}</p>}
      </section>

      <datalist id="food-group-options">{foodGroupOptions.map((option) => <option key={option} value={option} />)}</datalist>

      <section className="overflow-hidden rounded-xl border-2 border-[#123c36] bg-white shadow-[0_8px_20px_rgba(18,60,54,.04)]">
        <div className="max-h-[74vh] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-20 bg-[#eef6f1] text-xs uppercase tracking-wide text-[#3f5b53]">
              <tr>
                {COLS.map((c, i) => (
                  <th key={c.key} className={`border border-[#cdddd6] px-2 py-2 text-left font-semibold ${c.width} ${i === 0 ? "sticky left-0 z-30 bg-[#eef6f1]" : ""}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const rowDirty = !!edits[item.id];
                return (
                  <tr key={item.id} className={rowDirty ? "bg-[#fff8e8]" : "even:bg-[#fafcfb]"}>
                    {COLS.map((c, i) => {
                      const dirtyCell = !!edits[item.id]?.[c.key];
                      const sticky = i === 0 ? `sticky left-0 z-10 ${rowDirty ? "bg-[#fff8e8]" : "bg-white"}` : "";
                      const base = `border border-[#e1ebe6] p-0 align-middle ${c.width} ${sticky}`;
                      if (c.kind === "readonly") {
                        return <td key={c.key} className={`${base} px-2 py-1 text-xs text-[#4b655e]`} title={item.sourceCode ? `Mã: ${item.sourceCode}` : undefined}>{orig(item, "source") || "—"}</td>;
                      }
                      if (c.kind === "date") {
                        return <td key={c.key} className={`${base} px-2 py-1 text-xs text-[#637a73]`}>{cellValue(item, "updatedAt")}</td>;
                      }
                      if (c.kind === "type") {
                        return <td key={c.key} className={base}>
                          <select value={cellValue(item, c.key)} onChange={(e) => setCell(item, c.key, e.target.value)} className={`w-full bg-transparent px-1.5 py-1.5 text-sm outline-none focus:bg-[#eafaf3] ${dirtyCell ? "bg-[#fdf0d3] font-semibold" : ""}`}>
                            {foodTypeOptions.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                          </select>
                        </td>;
                      }
                      const isNum = c.kind === "num";
                      return <td key={c.key} className={base}>
                        <input
                          list={c.key === "foodGroup" ? "food-group-options" : undefined}
                          inputMode={isNum ? "decimal" : undefined}
                          value={cellValue(item, c.key)}
                          onChange={(e) => setCell(item, c.key, e.target.value)}
                          className={`w-full bg-transparent px-1.5 py-1.5 text-sm outline-none focus:bg-[#eafaf3] ${isNum ? "text-right tabular-nums" : ""} ${dirtyCell ? "bg-[#fdf0d3] font-semibold" : ""}`}
                        />
                      </td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!visibleItems.length && <p className="px-4 py-10 text-center text-sm text-[#5b706a]">Không tìm thấy bản ghi phù hợp.</p>}
        </div>
      </section>
      <p className="px-1 text-xs text-[#5b706a]">Số liệu dinh dưỡng tính trên 100 g phần ăn được. Ô đang sửa được tô vàng; bấm “Lưu … thay đổi” để ghi tất cả kèm lý do vào nhật ký dữ liệu. “Nguồn” và mã nguồn là dữ liệu định danh nên chỉ đọc.</p>
    </div>
  );
}
