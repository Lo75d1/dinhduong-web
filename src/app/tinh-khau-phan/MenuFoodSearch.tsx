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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const url = kind === "food" ? `/api/foods/search?q=${encodeURIComponent(q)}` : `/api/dishes/search?q=${encodeURIComponent(q)}`;
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
  }, [q, kind]);

  return (
    <div className="rounded-lg border bg-white p-2" style={{ borderColor: "#d5e3f2" }}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder ?? (kind === "food" ? "Tìm thực phẩm để thêm vào món…" : "Tìm món để thêm vào bữa…")}
        className="w-full rounded border px-2 py-1.5 text-sm"
        style={{ borderColor: "#cdd9e6" }}
      />
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
