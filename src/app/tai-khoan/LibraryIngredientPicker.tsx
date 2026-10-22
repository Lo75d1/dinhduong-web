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
  const [searched, setSearched] = useState(false), [message, setMessage] = useState("");
  const sourceName = kind === "catalog" ? "Thực phẩm trong kho" : kind === "catalog-dish" ? "Công thức món trong kho" : kind === "food" ? "Thực phẩm của tôi" : "Món ăn của tôi";
  const control = "mt-1 block min-h-11 w-full min-w-0 rounded border border-[var(--control-line)] bg-white px-3 py-2 text-base text-[var(--brand)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--line)]";
  const action = "min-h-11 rounded border border-[var(--brand)] bg-white px-4 py-2 text-base font-semibold text-[var(--brand)] hover:bg-[#eaf2ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-wait disabled:opacity-50";
  function resetSearch() { setItems([]); setPage(0); setNextPage(null); setSearched(false); setError(""); setMessage(""); }
  async function search(targetPage = 0) {
    setBusy(true); setError(""); setMessage(""); setSearched(false); setItems([]);
    try {
      const url = kind === "catalog" ? `/api/foods/search?q=${encodeURIComponent(q)}` : kind === "catalog-dish" ? `/api/dishes/search?q=${encodeURIComponent(q)}` : `/api/personal-library/${kind}?q=${encodeURIComponent(q)}&page=${targetPage}`;
      const data = await readNutritionResponse<{ items: Candidate[]; nextPage?: number | null }>(await fetch(url, { cache: "no-store" }));
      setItems(data.items); setPage(targetPage); setNextPage(data.nextPage ?? null); setSearched(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa tìm được nguyên liệu."); }
    finally { setBusy(false); }
  }
  async function pick(item: Candidate) {
    setBusy(true); setError(""); setMessage("");
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
      onPick(rows, names); setItems([]); setPage(0); setNextPage(null); setSearched(false); setMessage(`Đã thêm “${item.name}”${rows.length > 1 ? ` (${rows.length} dòng nguyên liệu)` : ""}. Kiểm tra định lượng trong danh sách nguyên liệu.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa dùng được mục này."); }
    finally { setBusy(false); }
  }
  return <fieldset disabled={busy || disabled} aria-busy={busy} className="min-w-0 rounded border border-[var(--line)] bg-[#f5f8f5] p-4">
    <legend className="px-2 text-lg font-semibold text-[var(--brand)]">{sourceMode === "catalog" ? "Thêm từ kho dữ liệu" : recipes ? "Thêm nguyên liệu hoặc món ăn" : "Thêm nguyên liệu"}</legend>
    <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_auto]">
      <label className="min-w-0 text-sm font-semibold">Tìm trong<select value={kind} onChange={e => { setKind(e.target.value); resetSearch(); }} className={control}>
        {sourceMode === "all" ? <><option value="food">Thực phẩm của tôi</option>{recipes ? <option value="dish">Món ăn của tôi</option> : null}</> : null}
        <option value="catalog">Thực phẩm trong kho</option>{recipes ? <option value="catalog-dish">Công thức món trong kho</option> : null}
      </select></label>
      <label className="min-w-0 text-sm font-semibold">Tên cần tìm<input value={q} maxLength={100} placeholder={kind.includes("dish") ? "Ví dụ: canh bí, thịt kho…" : "Ví dụ: gạo, thịt gà…"} onChange={e => { setQ(e.target.value); resetSearch(); }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void search(); } }} className={control} /></label>
      <button type="button" onClick={() => void search()} className={`${action} self-end`}>{busy ? "Đang xử lý…" : "Tìm kiếm"}</button>
    </div>
    <p className="mt-3 text-sm text-neutral-700">{kind === "catalog-dish" ? "Công thức có đủ thành phần sẽ thêm từng thực phẩm vào bảng. Định lượng lấy theo toàn công thức nguồn." : kind === "dish" ? "Món đã lưu sẽ thêm đầy đủ nguyên liệu, nguồn và định lượng của phiên bản đang dùng." : kind === "food" ? "Thực phẩm riêng giữ nguyên nguồn và cơ sở số liệu bạn đã lưu." : "Chọn thực phẩm có nguồn trong kho, rồi điều chỉnh lượng thực dùng trong bảng."}</p>
    {error ? <p role="alert" className="mt-3 border-l-4 border-red-700 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p> : null}
    {message ? <p role="status" className="mt-3 border-l-4 border-[var(--brand)] bg-[#eaf2ee] px-3 py-2 text-sm text-[var(--brand)]">{message}</p> : null}
    {busy ? <p role="status" className="mt-3 text-sm text-neutral-700">Đang đọc dữ liệu từ {sourceName.toLocaleLowerCase("vi-VN")}…</p> : null}
    {items.length ? <div className="mt-4 overflow-hidden rounded border border-[var(--line)] bg-white">
      <p className="border-b border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold">Kết quả từ {sourceName.toLocaleLowerCase("vi-VN")}</p>
      <ul className="max-h-80 divide-y divide-[#d7e2dc] overflow-y-auto">{items.map(item => <li key={item.id} className="flex min-w-0 items-center justify-between gap-3 px-3 py-3">
        <div className="min-w-0"><p className="break-words font-semibold text-[var(--brand)]">{item.name}</p>{kind === "catalog-dish" ? <p className="mt-1 text-sm text-neutral-600">{item.ingredients?.length ? `${item.ingredients.length} thành phần trong công thức nguồn` : "Chưa có chi tiết thành phần"}</p> : null}</div>
        <button type="button" onClick={() => void pick(item)} className={`${action} shrink-0`} aria-label={`Thêm ${item.name}`}>Thêm</button>
      </li>)}</ul>
    </div> : searched && !busy && !error ? <p role="status" className="mt-4 rounded border border-dashed border-[var(--line)] bg-white p-4 text-sm text-neutral-700">Không tìm thấy {q ? `“${q}”` : "mục phù hợp"} trong {sourceName.toLocaleLowerCase("vi-VN")}. Thử tên ngắn hơn hoặc chọn nguồn khác.</p> : null}
    {page > 0 || nextPage !== null ? <nav aria-label="Trang kết quả tìm nguyên liệu" className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm"><span>Trang {page + 1}</span><div className="flex gap-3">{page > 0 ? <button type="button" onClick={() => void search(page - 1)} className={action}>Trang trước</button> : null}{nextPage !== null ? <button type="button" onClick={() => void search(nextPage)} className={action}>Trang sau</button> : null}</div></nav> : null}
  </fieldset>;
}
