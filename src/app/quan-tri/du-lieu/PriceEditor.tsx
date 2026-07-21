"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  PRICE_BASES,
  PRICE_BASIS_LABEL,
  PRICE_REGIONS,
  PRICE_REGION_LABEL,
  basisNeedsPackWeight,
  formatVnd,
  type PriceBasis,
} from "@/lib/food-price";

type Price = {
  id: string;
  region: string | null;
  amountVnd: number;
  basis: string;
  packG: number | null;
  source: string | null;
  sourceUrl: string | null;
  note: string | null;
  asOfDate: string | null;
  createdAt: string;
};

type Draft = {
  region: string;
  amountVnd: string;
  basis: PriceBasis;
  packG: string;
  source: string;
  sourceUrl: string;
  asOfDate: string;
  note: string;
};

const EMPTY_DRAFT: Draft = {
  region: "",
  amountVnd: "",
  basis: "per_kg",
  packG: "",
  source: "",
  sourceUrl: "",
  asOfDate: "",
  note: "",
};

function toDraft(price: Price): Draft {
  return {
    region: price.region ?? "",
    amountVnd: String(price.amountVnd ?? ""),
    basis: (PRICE_BASES as readonly string[]).includes(price.basis) ? (price.basis as PriceBasis) : "per_kg",
    packG: price.packG == null ? "" : String(price.packG),
    source: price.source ?? "",
    sourceUrl: price.sourceUrl ?? "",
    asOfDate: price.asOfDate ? price.asOfDate.slice(0, 10) : "",
    note: price.note ?? "",
  };
}

export default function PriceEditor({ foodId }: { foodId: string }) {
  const [prices, setPrices] = useState<Price[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/data/foods/${foodId}/prices`);
      const data = await response.json().catch(() => ({}));
      if (response.ok) setPrices(data.items ?? []);
      else setMessage(data.error ?? "Không thể tải giá tham khảo.");
    } catch {
      setMessage("Không thể kết nối để tải giá.");
    }
  }, [foodId]);

  useEffect(() => {
    // Component được mount lại theo key={foodId} nên state đã ở giá trị đầu; chỉ cần tải.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const resetForm = () => {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setReason("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) return;
    setBusy(true);
    setMessage("");
    const values = {
      region: draft.region || null,
      amountVnd: draft.amountVnd === "" ? "" : Number(draft.amountVnd),
      basis: draft.basis,
      packG: draft.packG === "" ? "" : Number(draft.packG),
      source: draft.source,
      sourceUrl: draft.sourceUrl,
      asOfDate: draft.asOfDate,
      note: draft.note,
    };
    try {
      const url = editingId
        ? `/api/admin/data/foods/${foodId}/prices/${editingId}`
        : `/api/admin/data/foods/${foodId}/prices`;
      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ values, reason: reason.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setMessage(editingId ? "Đã cập nhật giá tham khảo." : "Đã thêm giá tham khảo.");
        resetForm();
        await load();
      } else {
        setMessage(data.error ?? "Không thể lưu giá.");
      }
    } catch {
      setMessage("Không thể kết nối để lưu giá.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (price: Price) => {
    const why = window.prompt("Lý do xoá giá tham khảo này?");
    if (!why || !why.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/data/foods/${foodId}/prices/${price.id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: why.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setMessage("Đã xoá giá tham khảo.");
        if (editingId === price.id) resetForm();
        await load();
      } else {
        setMessage(data.error ?? "Không thể xoá giá.");
      }
    } catch {
      setMessage("Không thể kết nối để xoá giá.");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (price: Price) => {
    setEditingId(price.id);
    setDraft(toDraft(price));
    setReason("");
    setMessage("");
  };

  const field = "mt-1.5 w-full rounded-lg border border-[#9fb7ae] bg-white px-3 py-2 text-sm font-normal text-[#1e342f] outline-none focus:border-[#0b6957] focus:ring-2 focus:ring-[#b9ddd0]";

  return (
    <section className="rounded-2xl border-2 border-[#123c36] bg-white p-5 shadow-[0_8px_20px_rgba(18,60,54,.04)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#c8d7d1] pb-4">
        <div>
          <p className="text-xs font-bold tracking-[.16em] text-[#0f5a4e]">GIÁ THAM KHẢO</p>
          <h3 className="mt-1 text-xl font-semibold text-[#122f2a]">Giá bán lẻ (chỉ tham khảo)</h3>
        </div>
      </div>

      <p className="mt-3 rounded-lg border border-[#d3b86a] bg-[#fffdf5] px-3 py-2 text-xs leading-5 text-[#5f5326]">
        Giá <b>chỉ mang tính tham khảo</b>, không phải số liệu chính thống như dinh dưỡng. Mỗi dòng nên ghi rõ nguồn
        (chuỗi bán lẻ), vùng miền và ngày cập nhật. Có thể thêm nhiều giá cho một thực phẩm (theo vùng / theo nguồn).
      </p>

      {message && <p role="status" className="mt-3 rounded-lg border border-[#9bb9ad] bg-[#f5faf7] px-3 py-2 text-sm font-medium text-[#193e35]">{message}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-[#507068]">
            <tr>
              <th className="px-2 py-2 text-left font-semibold">Vùng</th>
              <th className="px-2 py-2 text-left font-semibold">Giá</th>
              <th className="px-2 py-2 text-left font-semibold">Nguồn</th>
              <th className="px-2 py-2 text-left font-semibold">Ngày</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {prices.map((price) => (
              <tr key={price.id} className="border-t border-[#e1ebe6] align-top">
                <td className="px-2 py-2 text-[#2e4b43]">{price.region ? PRICE_REGION_LABEL[price.region as keyof typeof PRICE_REGION_LABEL] ?? price.region : "Toàn quốc"}</td>
                <td className="px-2 py-2 text-[#163d35]">
                  <b>{formatVnd(price.amountVnd)}</b> <span className="text-xs text-[#637a73]">{PRICE_BASIS_LABEL[price.basis as PriceBasis] ?? price.basis}{price.packG ? ` (${price.packG} g)` : ""}</span>
                </td>
                <td className="px-2 py-2 text-xs text-[#4b655e]">{price.source || "—"}{price.note ? <span className="block text-[#8a7a3f]">{price.note}</span> : null}</td>
                <td className="px-2 py-2 text-xs text-[#4b655e]">{price.asOfDate ? new Date(price.asOfDate).toLocaleDateString("vi-VN") : "—"}</td>
                <td className="px-2 py-2 text-right whitespace-nowrap">
                  <button type="button" onClick={() => startEdit(price)} className="rounded border border-[#9fb7ae] px-2 py-1 text-xs font-semibold text-[#0b5549] hover:bg-[#eef6f1]">Sửa</button>
                  <button type="button" onClick={() => void remove(price)} disabled={busy} className="ml-1 rounded border border-[#d1a3a3] px-2 py-1 text-xs font-semibold text-[#a23b3b] hover:bg-[#fbf2f2] disabled:opacity-50">Xoá</button>
                </td>
              </tr>
            ))}
            {!prices.length && <tr><td colSpan={5} className="px-2 py-4 text-center text-sm text-[#5b706a]">Chưa có giá tham khảo nào.</td></tr>}
          </tbody>
        </table>
      </div>

      <form onSubmit={submit} className="mt-5 rounded-xl border border-[#c8d7d1] bg-[#f8fbf9] p-4">
        <p className="text-sm font-bold text-[#24483f]">{editingId ? "Sửa giá" : "Thêm giá mới"}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-[#24483f]">Vùng miền
            <select value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })} className={field}>
              <option value="">Toàn quốc / không rõ</option>
              {PRICE_REGIONS.map((r) => <option key={r} value={r}>{PRICE_REGION_LABEL[r]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-[#24483f]">Đơn vị tính
            <select value={draft.basis} onChange={(e) => setDraft({ ...draft, basis: e.target.value as PriceBasis })} className={field}>
              {PRICE_BASES.map((b) => <option key={b} value={b}>{PRICE_BASIS_LABEL[b]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-[#24483f]">Giá (VND)
            <input type="number" step="any" min="0" value={draft.amountVnd} onChange={(e) => setDraft({ ...draft, amountVnd: e.target.value })} className={field} />
          </label>
          {basisNeedsPackWeight(draft.basis) && (
            <label className="block text-sm font-semibold text-[#24483f]">Khối lượng 1 đơn vị (g)
              <input type="number" step="any" min="0" value={draft.packG} onChange={(e) => setDraft({ ...draft, packG: e.target.value })} className={field} />
            </label>
          )}
          <label className="block text-sm font-semibold text-[#24483f]">Nguồn (chuỗi bán lẻ)
            <input value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} placeholder="VD: Bách Hóa Xanh, WinMart…" className={field} />
          </label>
          <label className="block text-sm font-semibold text-[#24483f]">Ngày cập nhật
            <input type="date" value={draft.asOfDate} onChange={(e) => setDraft({ ...draft, asOfDate: e.target.value })} className={field} />
          </label>
          <label className="block text-sm font-semibold text-[#24483f] sm:col-span-2">Link nguồn (tuỳ chọn)
            <input value={draft.sourceUrl} onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value })} className={field} />
          </label>
          <label className="block text-sm font-semibold text-[#24483f] sm:col-span-2">Ghi chú (tuỳ chọn)
            <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="VD: giá khuyến mãi, đóng gói…" className={field} />
          </label>
        </div>
        <label className="mt-3 block text-sm font-bold text-[#4f4217]">Lý do / nguồn đối chiếu (bắt buộc)
          <input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Ghi theo giá niêm yết trên web nguồn ngày …" className="mt-1.5 w-full rounded-lg border border-[#cdb56d] bg-white px-3 py-2 text-sm font-normal text-[#2e2a1a] outline-none focus:border-[#9a7615] focus:ring-2 focus:ring-[#eadcaa]" />
        </label>
        <div className="mt-3 flex gap-2">
          <button disabled={busy || !reason.trim()} className="rounded-lg bg-[#123c36] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b5549] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Đang lưu…" : editingId ? "Lưu thay đổi" : "Thêm giá"}</button>
          {editingId && <button type="button" onClick={resetForm} className="rounded-lg border border-[#9fb7ae] px-4 py-2 text-sm font-semibold text-[#0b5549] hover:bg-[#eef6f1]">Huỷ</button>}
        </div>
      </form>
    </section>
  );
}
