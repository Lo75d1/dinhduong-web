"use client";

import { useEffect, useRef, useState } from "react";
import type { MenuDishIngredient, MenuFoodResult } from "./multi-day";

// Ô tìm kiếm theo ngữ cảnh cho board nhiều ngày:
// - kind="food": ở trong một món đang mở → tìm & thêm THỰC PHẨM vào món đó.
// - kind="dish": ở mức bữa → tìm & thêm cả MÓN (công thức RNI) vào bữa.
// Tái dùng đúng API /api/foods/search và /api/dishes/search của chế độ một ngày.

type DishResult = {
  id: string;
  name: string;
  totalWeightG: number | null;
  categoryRaw: string | null;
  ingredients: MenuDishIngredient[];
};

const ACCENT = "#185FA5";
const INK = "#0C447C";

export default function MenuFoodSearch({
  kind,
  onPickFood,
  onPickDish,
  placeholder,
}: {
  kind: "food" | "dish";
  onPickFood?: (food: MenuFoodResult) => void;
  onPickDish?: (dish: DishResult) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [foods, setFoods] = useState<MenuFoodResult[]>([]);
  const [dishes, setDishes] = useState<DishResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [foodType, setFoodType] = useState<"" | "TS" | "CB" | "MA" | "SP">("");
  const [source, setSource] = useState("");
  const [group, setGroup] = useState("");
  const [dishCategory, setDishCategory] = useState("");
  const [dishAge, setDishAge] = useState("");
  const [dishDisease, setDishDisease] = useState("");
  const [foodOpts, setFoodOpts] = useState<{ sources: string[]; groups: string[] }>({ sources: [], groups: [] });
  const [dishOpts, setDishOpts] = useState<{ categories: string[]; ageGroups: string[]; diseaseGroups: string[] }>({ categories: [], ageGroups: [], diseaseGroups: [] });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (kind === "food") fetch("/api/foods/filter-options").then((r) => r.json()).then((d) => setFoodOpts({ sources: d.sources ?? [], groups: d.groups ?? [] })).catch(() => {});
    else fetch("/api/dishes/filter-options").then((r) => r.json()).then((d) => setDishOpts({ categories: d.categories ?? [], ageGroups: d.ageGroups ?? [], diseaseGroups: d.diseaseGroups ?? [] })).catch(() => {});
  }, [kind]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 1) {
      setFoods([]);
      setDishes([]);
      setFailed(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const params = new URLSearchParams({ q });
        if (kind === "food") { if (foodType) params.set("type", foodType); if (source) params.set("source", source); if (group) params.set("group", group); }
        else { if (dishCategory) params.set("category", dishCategory); if (dishAge) params.set("age", dishAge); if (dishDisease) params.set("disease", dishDisease); }
        const url = kind === "food" ? `/api/foods/search?${params}` : `/api/dishes/search?${params}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (kind === "food") setFoods(data.items ?? []);
        else setDishes(data.items ?? []);
      } catch {
        setFailed(true);
        setFoods([]);
        setDishes([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, kind, foodType, source, group, dishCategory, dishAge, dishDisease]);

  return (
    <div className="rounded-lg border bg-white p-2" style={{ borderColor: "#d5e3f2" }}>
      <div className="flex items-center gap-1.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder ?? (kind === "food" ? "Tìm thực phẩm để thêm vào món…" : "Tìm món để thêm vào bữa…")}
          className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm"
          style={{ borderColor: "#cdd9e6" }}
        />
        <button type="button" onClick={() => setFiltersOpen((o) => !o)} className="shrink-0 rounded border px-2 py-1.5 text-xs font-semibold" style={{ borderColor: ACCENT, color: INK, background: filtersOpen ? "#E6F1FB" : "#fff" }}>Bộ lọc {filtersOpen ? "▾" : "▸"}</button>
      </div>
      {filtersOpen && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {kind === "food" ? (
            <>
              {(["", "TS", "CB", "MA", "SP"] as const).map((v) => (
                <button key={v || "all"} type="button" onClick={() => setFoodType(v)} className="rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: foodType === v ? ACCENT : "#cdd9e6", background: foodType === v ? "#E6F1FB" : "#fff", color: foodType === v ? INK : "#5a708c" }}>{v === "" ? "Tất cả" : v === "TS" ? "Tươi sống" : v === "CB" ? "Chế biến" : v === "MA" ? "Món ăn" : "Sản phẩm"}</button>
              ))}
              <select value={source} onChange={(e) => setSource(e.target.value)} className="rounded border px-1.5 py-1 text-xs" style={{ borderColor: "#cdd9e6" }}><option value="">Mọi nguồn</option>{foodOpts.sources.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              <select value={group} onChange={(e) => setGroup(e.target.value)} className="max-w-40 rounded border px-1.5 py-1 text-xs" style={{ borderColor: "#cdd9e6" }}><option value="">Mọi nhóm</option>{foodOpts.groups.map((g) => <option key={g} value={g}>{g}</option>)}</select>
            </>
          ) : (
            <>
              <select value={dishCategory} onChange={(e) => setDishCategory(e.target.value)} className="max-w-40 rounded border px-1.5 py-1 text-xs" style={{ borderColor: "#cdd9e6" }}><option value="">Mọi loại</option>{dishOpts.categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <select value={dishAge} onChange={(e) => setDishAge(e.target.value)} className="max-w-36 rounded border px-1.5 py-1 text-xs" style={{ borderColor: "#cdd9e6" }}><option value="">Mọi nhóm tuổi</option>{dishOpts.ageGroups.map((a) => <option key={a} value={a}>{a}</option>)}</select>
              <select value={dishDisease} onChange={(e) => setDishDisease(e.target.value)} className="max-w-40 rounded border px-1.5 py-1 text-xs" style={{ borderColor: "#cdd9e6" }}><option value="">Mọi bệnh lý</option>{dishOpts.diseaseGroups.map((d) => <option key={d} value={d}>{d}</option>)}</select>
            </>
          )}
        </div>
      )}
      {loading && <p className="mt-1 text-[11px]" style={{ color: "#7d8ea3" }}>Đang tìm…</p>}
      {failed && (
        <p className="mt-1 text-[11px]" style={{ color: "#8a5a1d" }}>
          Không kết nối được cơ sở dữ liệu tra cứu (thử lại khi có mạng/CSDL).
        </p>
      )}
      {q.trim() && !loading && !failed && (
        <div className="mt-1 max-h-56 overflow-y-auto">
          {kind === "food" ? (
            foods.length === 0 ? (
              <p className="px-1 py-2 text-[11px]" style={{ color: "#7d8ea3" }}>Không tìm thấy thực phẩm.</p>
            ) : (
              <ul className="flex flex-col">
                {foods.slice(0, 30).map((food) => (
                  <li key={food.id}>
                    <button
                      type="button"
                      onClick={() => { onPickFood?.(food); setQ(""); }}
                      className="flex w-full items-baseline justify-between gap-2 rounded px-2 py-1 text-left text-[12px] hover:bg-[#E6F1FB]"
                    >
                      <span className="min-w-0 truncate" style={{ color: INK }}>{food.name}</span>
                      <span className="shrink-0 text-[10px]" style={{ color: "#7d8ea3" }}>
                        {typeof food.energyKcal === "number" ? `${Math.round(food.energyKcal)} kcal/100g` : "—"}
                        {typeof food.source === "string" ? ` · ${food.source}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : dishes.length === 0 ? (
            <p className="px-1 py-2 text-[11px]" style={{ color: "#7d8ea3" }}>Không tìm thấy món.</p>
          ) : (
            <ul className="flex flex-col">
              {dishes.slice(0, 30).map((dish) => {
                const usable = dish.ingredients.filter((i) => i.food).length;
                return (
                  <li key={dish.id}>
                    <button
                      type="button"
                      onClick={() => { onPickDish?.(dish); setQ(""); }}
                      className="flex w-full items-baseline justify-between gap-2 rounded px-2 py-1 text-left text-[12px] hover:bg-[#E6F1FB]"
                    >
                      <span className="min-w-0 truncate" style={{ color: INK }}>{dish.name}</span>
                      <span className="shrink-0 text-[10px]" style={{ color: usable ? "#7d8ea3" : "#8a5a1d" }}>
                        {usable ? `${usable} nguyên liệu` : "chưa có dữ liệu nguyên liệu"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      <p className="mt-1 text-[10px]" style={{ color: ACCENT }}>
        {kind === "food" ? "Đang ở trong món — chọn để thêm thực phẩm." : "Đang ở mức bữa — chọn để thêm cả món."}
      </p>
    </div>
  );
}
