"use client";
import Link from "next/link";
import { useState } from "react";
import type { ResolvedMenu } from "@/lib/nutrition-chat/contracts";

export default function SavedLibraryLinks({ menu, rationId }: { menu: ResolvedMenu; rationId: string }) {
  const [kind, setKind] = useState<"food" | "dish">("dish"), [selected, setSelected] = useState("");
  const foods = new Set<string>(), dishes = new Set<string>();
  const candidates = menu.days.flatMap(day => day.rows.flatMap(row => {
    const key = kind === "food" ? row.customFood?.id : JSON.stringify([day.id, row.meal, row.dish]), seen = kind === "food" ? foods : dishes;
    if (!key || seen.has(key)) return [];
    seen.add(key);
    return [{ id: row.id, name: kind === "food" ? row.customFood!.name : `${day.label} · ${row.meal} · ${row.dish}` }];
  }));
  const rowId = candidates.some(item => item.id === selected) ? selected : candidates[0]?.id;
  return <details className="mt-5 rounded-lg border border-[#b1c8bd] p-4"><summary className="cursor-pointer font-semibold">Lưu thực phẩm hoặc món này vào thư viện cá nhân</summary><p className="mt-3 text-sm text-neutral-700">Chọn một mục để xem trước, bổ sung nguồn nếu cần rồi lưu riêng. Sau đó có thể dùng mục đó trong nhiều thực đơn.</p><label className="mt-3 block text-sm">Loại cần lưu<select value={kind} onChange={e => { setKind(e.target.value as "food" | "dish"); setSelected(""); }} className="mt-1 w-full rounded border px-3 py-2"><option value="dish">Công thức món ăn</option><option value="food">Thực phẩm tự nhập ngoài kho</option></select></label>{rowId ? <><label className="mt-3 block text-sm">Mục trong thực đơn<select value={rowId} onChange={e => setSelected(e.target.value)} className="mt-1 w-full rounded border px-3 py-2">{candidates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><Link className="mt-4 inline-block font-semibold underline" href={`/tai-khoan/${kind === "food" ? "thuc-pham" : "mon-an"}?fromMenu=${encodeURIComponent(rationId)}&row=${encodeURIComponent(rowId)}`}>Xem trước để lưu vào thư viện →</Link></> : <p className="mt-3 text-sm">Không có thực phẩm tự nhập trong bản này. Thực phẩm trong kho chung được dùng trực tiếp theo Food ID.</p>}</details>;
}
