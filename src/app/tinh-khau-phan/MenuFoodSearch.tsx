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
  servingUnit: string | null;
  categoryRaw: string | null;
  ageGroup: string | null;
  diseaseDiet: string | null;
  imageSourceId?: string | null;
  ingredients: MenuDishIngredient[];
};

const ACCENT = "#185FA5";
const INK = "#0C447C";

const FOOD_TYPE_META: Record<string, { label: string; className: string }> = {
  TS: { label: "🥬 Tươi sống", className: "bg-emerald-100 text-emerald-900" },
  CB: { label: "🍳 Chế biến", className: "bg-amber-50 text-amber-800" },
  MA: { label: "🍜 Món ăn", className: "bg-sky-50 text-sky-700" },
  SP: { label: "📦 Sản phẩm", className: "bg-violet-50 text-violet-800" },
};

function nutrient(food: MenuFoodResult, key: string) {
  const value = food[key];
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}

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
  const [manualOpen, setManualOpen] = useState(false);
  const [mName, setMName] = useState("");
  const [mType, setMType] = useState<"TS" | "CB" | "MA">("CB");
  const [mKcal, setMKcal] = useState("");
  const [mP, setMP] = useState("");
  const [mL, setML] = useState("");
  const [mG, setMG] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function submitManual() {
    const name = mName.trim();
    if (!name) return;
    const num = (s: string) => { const n = Number(s); return Number.isFinite(n) && n >= 0 ? n : 0; };
    onPickFood?.({ id: `local-${Date.now()}`, name, source: "Tự nhập", foodType: mType, energyKcal: num(mKcal), proteinG: num(mP), lipidG: num(mL), glucidG: num(mG), wastePercent: 0 });
    setMName(""); setMKcal(""); setMP(""); setML(""); setMG(""); setManualOpen(false);
  }

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
    <div className="rounded-lg border bg-white p-2" style={{ borderColor: "#D7E6F5" }}>
      <div className="flex items-center gap-1.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder ?? (kind === "food" ? "Tìm thực phẩm để thêm vào món…" : "Tìm món để thêm vào bữa…")}
          className="min-w-0 flex-1 rounded border px-3 py-2 text-sm"
          style={{ borderColor: "#cdd9e6" }}
        />
        {q && <button type="button" onClick={() => setQ("")} className="shrink-0 rounded border border-neutral-300 px-2 py-2 text-xs font-semibold text-neutral-600" aria-label="Xóa nội dung tìm kiếm">✕</button>}
        <button type="button" onClick={() => setFiltersOpen((o) => !o)} className="shrink-0 rounded border px-2 py-1.5 text-xs font-semibold" style={{ borderColor: ACCENT, color: INK, background: filtersOpen ? "#E6F1FB" : "#fff" }}>Bộ lọc {filtersOpen ? "▾" : "▸"}</button>
        {kind === "food" && <button type="button" onClick={() => setManualOpen((o) => !o)} className="shrink-0 rounded border px-2 py-1.5 text-xs font-semibold" style={{ borderColor: "#0c5f4d", color: "#0c5f4d", background: manualOpen ? "#eafaf2" : "#fff" }}>＋ TP mới</button>}
      </div>
      {manualOpen && kind === "food" && (
        <div className="mt-1.5 rounded-md border p-2" style={{ borderColor: "#0c5f4d", background: "#f4fbf7" }}>
          <div className="grid grid-cols-2 gap-1.5">
            <input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Tên thực phẩm *" className="col-span-2 rounded border px-2 py-1 text-sm" style={{ borderColor: "#cdd9e6" }} />
            <select value={mType} onChange={(e) => setMType(e.target.value as "TS" | "CB" | "MA")} className="rounded border px-1.5 py-1 text-xs" style={{ borderColor: "#cdd9e6" }}><option value="TS">Tươi sống</option><option value="CB">Chế biến</option><option value="MA">Món ăn</option></select>
            <input value={mKcal} onChange={(e) => setMKcal(e.target.value)} inputMode="decimal" placeholder="Kcal/100g" className="rounded border px-2 py-1 text-xs" style={{ borderColor: "#cdd9e6" }} />
            <input value={mP} onChange={(e) => setMP(e.target.value)} inputMode="decimal" placeholder="Đạm g/100g" className="rounded border px-2 py-1 text-xs" style={{ borderColor: "#cdd9e6" }} />
            <input value={mL} onChange={(e) => setML(e.target.value)} inputMode="decimal" placeholder="Béo g/100g" className="rounded border px-2 py-1 text-xs" style={{ borderColor: "#cdd9e6" }} />
            <input value={mG} onChange={(e) => setMG(e.target.value)} inputMode="decimal" placeholder="Bột đường g/100g" className="rounded border px-2 py-1 text-xs" style={{ borderColor: "#cdd9e6" }} />
          </div>
          <button type="button" onClick={submitManual} className="mt-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-white" style={{ background: "#0c5f4d" }}>Thêm vào món (chỉ trong thực đơn này)</button>
        </div>
      )}
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
        <div className="mt-2 max-h-[min(45vh,22rem)] overflow-y-auto rounded-md border border-[#D7E6F5] bg-white shadow-lg">
          {kind === "food" ? (
            foods.length === 0 ? (
              <p className="px-1 py-2 text-[11px]" style={{ color: "#7d8ea3" }}>Không tìm thấy thực phẩm.</p>
            ) : (
              <ul className="divide-y divide-[#E1E9F5]">
                {foods.slice(0, 30).map((food) => (
                  <li key={food.id}>
                    <button
                      type="button"
                      onClick={() => { onPickFood?.(food); setQ(""); }}
                      className="flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm hover:bg-[#E6F1FB]"
                    >
                      {typeof food.imageUrl === "string" && food.imageUrl ? <img src={food.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-md border border-[#D7E6F5] object-cover" loading="lazy" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#F4F9FE] text-xl" aria-hidden>🥗</span>}
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold" style={{ color: INK }}>{food.name}</span>
                        <span className="mt-1 flex flex-wrap gap-1 text-[11px]">
                          {typeof food.foodType === "string" && FOOD_TYPE_META[food.foodType] && <span className={`rounded-full px-2 py-0.5 font-medium ${FOOD_TYPE_META[food.foodType].className}`}>{FOOD_TYPE_META[food.foodType].label}</span>}
                          {typeof food.source === "string" && <span className="rounded bg-neutral-100 px-1.5 py-0.5">Nguồn: {food.source}</span>}
                          {typeof food.foodGroup === "string" && food.foodGroup && <span className="rounded bg-[#F4F9FE] px-1.5 py-0.5 text-[#0C447C]">{food.foodGroup}</span>}
                        </span>
                        <span className="mt-1 block text-xs text-neutral-700">100 g: <b>{nutrient(food, "energyKcal") ?? "—"} kcal</b> · P {nutrient(food, "proteinG") ?? "—"} g · L {nutrient(food, "lipidG") ?? "—"} g · G {nutrient(food, "glucidG") ?? "—"} g{typeof food.wastePercent === "number" ? ` · thải bỏ ${food.wastePercent}%` : ""}</span>
                      </span>
                      <span className="shrink-0 rounded border border-[#185FA5] px-2 py-1 text-xs font-semibold text-[#0C447C]">＋ Thêm</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : dishes.length === 0 ? (
            <p className="px-1 py-2 text-[11px]" style={{ color: "#7d8ea3" }}>Không tìm thấy món.</p>
          ) : (
            <ul className="divide-y divide-[#E1E9F5]">
              {dishes.slice(0, 30).map((dish) => {
                const usable = dish.ingredients.filter((i) => i.food).length;
                return (
                  <li key={dish.id}>
                    <button
                      type="button"
                      onClick={() => { onPickDish?.(dish); setQ(""); }}
                      className="flex w-full items-start gap-3 px-3 py-3 text-left text-sm hover:bg-[#E6F1FB]"
                    >
                      {dish.imageSourceId ? <img src={`/api/dish-images/rni/${dish.imageSourceId}`} alt="" className="h-12 w-12 shrink-0 rounded-md border border-[#D7E6F5] object-cover" loading="lazy" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#F4F9FE] text-xl" aria-hidden>🍲</span>}
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold" style={{ color: INK }}>{dish.name}</span>
                        <span className="mt-1 flex flex-wrap gap-1 text-[11px] text-neutral-700">
                          {dish.categoryRaw && <span className="rounded bg-neutral-100 px-1.5 py-0.5">{dish.categoryRaw}</span>}
                          {dish.ageGroup && <span className="rounded bg-sky-50 px-1.5 py-0.5">{dish.ageGroup}</span>}
                          {dish.diseaseDiet && <span className="rounded bg-rose-50 px-1.5 py-0.5">{dish.diseaseDiet}</span>}
                        </span>
                        <span className="mt-1 block text-xs" style={{ color: usable ? "#5a708c" : "#8a5a1d" }}>{usable ? `${usable}/${dish.ingredients.length} nguyên liệu có dữ liệu` : "Chưa có nguyên liệu liên kết dữ liệu"}{dish.totalWeightG ? ` · ${dish.totalWeightG} g` : ""}{dish.servingUnit ? ` · ${dish.servingUnit}` : ""}</span>
                      </span>
                      <span className="shrink-0 rounded border border-[#185FA5] px-2 py-1 text-xs font-semibold text-[#0C447C]">＋ Thêm món</span>
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
