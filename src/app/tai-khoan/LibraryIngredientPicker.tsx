"use client";
import { useState } from "react";
import type { CustomFoodInput, MenuInput, MenuRowInput } from "@/lib/nutrition-chat/contracts";
import { readNutritionResponse } from "@/app/ket-noi-ai/client-api";

type Candidate = { id: string; name: string; unit?: string; ingredients?: { food: { id: string; name: string } | null; quantityG: number | null }[] };
export function personalFoodRow(food: CustomFoodInput): MenuRowInput {
  return { id: crypto.randomUUID(), meal: "Bữa mới", dish: food.name, customFood: structuredClone(food), quantity: food.basis === "portion" ? food.portionAmount ?? null : 100, unit: food.basis === "100ml" ? "ml" : food.basis === "portion" ? food.portionUnit ?? "g" : "g", servings: 1, basis: "edible", recipeSource: { kind: "user", label: "Thực phẩm từ thư viện cá nhân" } };
}
export default function LibraryIngredientPicker({ onPick, recipes = true, disabled = false, sourceMode = "all" }: { onPick: (rows: MenuRowInput[], names: Record<string, string>) => void; recipes?: boolean; disabled?: boolean; sourceMode?: "all"|"catalog" }) {
  const [kind, setKind] = useState(sourceMode==="catalog"&&recipes?"catalog-dish":sourceMode==="catalog"?"catalog":"food"), [q, setQ] = useState("");
  const [items, setItems] = useState<Candidate[]>([]), [page, setPage] = useState(0), [nextPage, setNextPage] = useState<number | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function search(targetPage = 0) {
    setBusy(true); setError(""); setItems([]);
    try {
      const url = kind === "catalog" ? `/api/foods/search?q=${encodeURIComponent(q)}` : kind === "catalog-dish" ? `/api/dishes/search?q=${encodeURIComponent(q)}` : `/api/personal-library/${kind}?q=${encodeURIComponent(q)}&page=${targetPage}`;
      const data = await readNutritionResponse<{ items: Candidate[]; nextPage?: number | null }>(await fetch(url, { cache: "no-store" }));
      setItems(data.items); setPage(targetPage); setNextPage(data.nextPage ?? null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa tìm được nguyên liệu."); }
    finally { setBusy(false); }
  }
  async function pick(item: Candidate) {
    setBusy(true); setError("");
    try {
      let rows: MenuRowInput[];
      const names: Record<string, string> = {};
      if (kind === "catalog") {
        const id = crypto.randomUUID(); names[id] = item.name;
        rows = [{ id, meal: "Bữa mới", dish: item.name, foodId: item.id, quantity: 100, unit: item.unit === "ml" ? "ml" : "g", servings: 1, basis: "edible", recipeSource: { kind: "user", label: "Công thức người dùng chọn nguyên liệu trong kho" } }];
      } else if (kind === "catalog-dish") {
        if (!item.ingredients?.length || item.ingredients.some(i => !i.food || i.quantityG === null)) throw new Error("Công thức này còn nguyên liệu chưa liên kết hoặc thiếu lượng. Chọn nguyên liệu có nguồn trước khi dùng.");
        rows = item.ingredients.map(i => { const id = crypto.randomUUID(); names[id] = i.food!.name; return { id, meal: "Bữa mới", dish: item.name, foodId: i.food!.id, quantity: i.quantityG, unit: "g", servings: 1, basis: "edible", recipeSource: { kind: "catalog", label: `RNI: ${item.name}`, dishId: item.id }, note: "Định lượng toàn công thức nguồn; kiểm tra số phần trước khi dùng." }; });
      } else {
        const data = await readNutritionResponse<{ content: CustomFoodInput | MenuInput; preview?: { days: { rows: { id: string; food: { name: string } }[] }[] } }>(await fetch(`/api/personal-library/${kind}?id=${encodeURIComponent(item.id)}`, { cache: "no-store" }));
        if (kind === "food") rows = [personalFoodRow(data.content as CustomFoodInput)];
        else rows = (data.content as MenuInput).days[0].rows.map(row => { const id = crypto.randomUUID(); names[id] = data.preview?.days[0].rows.find(r => r.id === row.id)?.food.name ?? row.customFood?.name ?? row.dish; return { ...structuredClone(row), id }; });
      }
      onPick(rows, names); setItems([]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa dùng được mục này."); }
    finally { setBusy(false); }
  }
  return <fieldset disabled={busy || disabled} className="rounded border border-[#b1c8bd] bg-[#f5f8f5] p-3"><legend className="px-1 text-sm font-semibold">{sourceMode==="catalog"?"Chọn món hoặc thực phẩm trong kho":"Chọn từ thư viện hoặc kho dữ liệu"}</legend><div className="flex flex-wrap gap-2"><label className="text-sm">Nguồn<select value={kind} onChange={e => { setKind(e.target.value); setItems([]); setPage(0); setNextPage(null); }} className="mt-1 block rounded border bg-white px-2 py-2">{sourceMode==="all"?<><option value="food">Thực phẩm của tôi</option>{recipes ? <option value="dish">Món ăn của tôi</option> : null}</>:null}<option value="catalog">Thực phẩm trong kho</option>{recipes ? <option value="catalog-dish">Công thức món trong kho</option> : null}</select></label><label className="min-w-0 flex-1 text-sm">Tên cần tìm<input value={q} maxLength={100} onChange={e => { setQ(e.target.value); setItems([]); }} className="mt-1 w-full rounded border bg-white px-3 py-2" /></label><button type="button" onClick={() => void search()} className="self-end rounded border border-[#123c36] bg-white px-3 py-2 text-sm">{busy ? "Đang tải…" : "Tìm trong nguồn"}</button></div>{error ? <p role="alert" className="mt-2 text-sm text-red-800">{error}</p> : null}<ul className="mt-2 max-h-64 overflow-y-auto">{items.map(item => <li key={item.id} className="flex items-center justify-between gap-3 border-t py-2 text-sm"><span>{item.name}</span><button type="button" onClick={() => void pick(item)} className="shrink-0 rounded border border-[#123c36] bg-white px-3 py-1">Chọn</button></li>)}</ul>{page > 0 || nextPage !== null ? <div className="flex gap-4 text-sm">{page > 0 ? <button type="button" onClick={() => void search(page - 1)}>Trang trước</button> : null}{nextPage !== null ? <button type="button" onClick={() => void search(nextPage)}>Trang sau</button> : null}</div> : null}</fieldset>;
}
