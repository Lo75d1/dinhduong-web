"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Food = Record<string, string | number | null> & {
  id: string;
  name: string;
  source: string;
  sourceCode?: string | null;
};

type Log = {
  id: string;
  actorName: string;
  action: string;
  reason: string;
  createdAt: string;
};

const fields = [
  ["name", "Tên thực phẩm / món ăn"],
  ["foodType", "Loại dữ liệu"],
  ["foodGroup", "Nhóm thực phẩm"],
  ["wastePercent", "Tỷ lệ thải bỏ (%)"],
  ["energyKcal", "Năng lượng (kcal/100g)"],
  ["proteinG", "Chất đạm (g/100g)"],
  ["lipidG", "Chất béo (g/100g)"],
  ["glucidG", "Chất bột đường (g/100g)"],
  ["fiberG", "Chất xơ (g/100g)"],
  ["imageUrl", "URL ảnh tham chiếu"],
  ["imageSourceUrl", "Trang nguồn ảnh"],
  ["sourceNote", "Nguồn / ghi chú"],
] as const;

const numericFields = new Set(["wastePercent", "energyKcal", "proteinG", "lipidG", "glucidG", "fiberG"]);
const wideFields = new Set(["name", "imageUrl", "imageSourceUrl", "sourceNote"]);
const foodTypeOptions = ["TS", "CB", "MA", "SP"];

function normalise(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function DataManager() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Food[]>([]);
  const [chosen, setChosen] = useState<Food | null>(null);
  const [reason, setReason] = useState("");
  const [logs, setLogs] = useState<Log[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const response = await fetch(`/api/admin/data/foods?q=${encodeURIComponent(q)}`);
      const data = await response.json().catch(() => ({}));
      if (response.ok) setItems(data.items ?? []);
      else setMessage(data.error ?? "Không thể tải dữ liệu.");
    } catch {
      setMessage("Không thể kết nối để tải dữ liệu.");
    }
  };

  useEffect(() => {
    void load();
    // Chỉ tải lần đầu; thao tác tìm kiếm dùng nút Tìm để tránh gọi API liên tục.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const foodGroupOptions = useMemo(() => {
    const groups = new Set(items.map((item) => String(item.foodGroup ?? "").trim()).filter(Boolean));
    return [...groups].sort((a, b) => a.localeCompare(b, "vi"));
  }, [items]);

  const select = async (id: string) => {
    setMessage("");
    try {
      const response = await fetch(`/api/admin/data/foods/${id}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "Không thể tải chi tiết.");
        return;
      }

      setChosen(data.item);
      setReason("");
      const historyResponse = await fetch(`/api/admin/data/history?entityId=${id}`);
      const history = await historyResponse.json().catch(() => ({}));
      setLogs(history.items ?? []);
    } catch {
      setMessage("Không thể tải chi tiết dữ liệu.");
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!chosen || !reason.trim()) return;

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/data/foods/${chosen.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ values: chosen, reason: reason.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setChosen(data.item);
        setMessage("Đã lưu và ghi nhật ký thay đổi.");
        await select(chosen.id);
        await load();
      } else {
        setMessage(data.error ?? "Không thể lưu.");
      }
    } catch {
      setMessage("Không thể kết nối để lưu thay đổi.");
    } finally {
      setBusy(false);
    }
  };

  const visibleItems = useMemo(() => {
    const query = normalise(q.trim());
    if (!query) return items;
    return [...items].sort((a, b) => {
      const aName = normalise(a.name);
      const bName = normalise(b.name);
      const aStarts = aName.startsWith(query) ? 0 : 1;
      const bStarts = bName.startsWith(query) ? 0 : 1;
      return aStarts - bStarts || aName.localeCompare(bName, "vi");
    });
  }, [items, q]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border-2 border-[#123c36] bg-white p-5 shadow-[0_8px_20px_rgba(18,60,54,.04)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[.16em] text-[#0f5a4e]">BIÊN TẬP TỪNG BẢN GHI</p>
            <h2 className="mt-1 text-2xl font-semibold text-[#122f2a]">Thực phẩm và món ăn</h2>
            <p className="mt-1 text-sm leading-6 text-[#506761]">Chọn một dòng ở danh sách bên trái, chỉnh sửa có căn cứ ở bên phải và ghi rõ lý do trước khi lưu.</p>
          </div>
          <div className="rounded-lg border border-[#bed2c9] bg-[#f5faf7] px-3 py-2 text-sm text-[#284c43]">Đang hiển thị <b>{visibleItems.length}</b> bản ghi</div>
        </div>

        {message && <p role="status" className="mt-4 rounded-lg border border-[#9bb9ad] bg-[#f5faf7] px-4 py-3 text-sm font-medium text-[#193e35]">{message}</p>}

        <form onSubmit={(event) => { event.preventDefault(); void load(); }} className="mt-5 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="data-search">Tìm thực phẩm hoặc món ăn</label>
          <input id="data-search" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Tìm tên thực phẩm, món ăn hoặc mã nguồn…" className="min-w-0 flex-1 rounded-lg border-2 border-[#8fa99e] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#0b6957] focus:ring-2 focus:ring-[#b9ddd0]" />
          <button type="submit" className="rounded-lg bg-[#123c36] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0b5549]">Tìm dữ liệu</button>
        </form>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(21rem,.9fr)_minmax(31rem,1.35fr)]">
        <section className="overflow-hidden rounded-2xl border-2 border-[#123c36] bg-white shadow-[0_8px_20px_rgba(18,60,54,.04)]">
          <div className="flex items-center justify-between border-b border-[#c8d7d1] bg-[#eef6f1] px-4 py-3">
            <h3 className="font-semibold text-[#183d35]">Danh sách kết quả</h3>
            <span className="text-xs text-[#58736b]">Bấm một dòng để mở biểu mẫu</span>
          </div>
          <div className="max-h-[38rem] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[#f8fbf9] text-xs uppercase tracking-wide text-[#507068] shadow-[0_1px_0_#c8d7d1]">
                <tr><th className="px-4 py-3 text-left font-semibold">Tên / loại</th><th className="px-4 py-3 text-left font-semibold">Nguồn</th></tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const active = chosen?.id === item.id;
                  return <tr key={item.id} onClick={() => void select(item.id)} className={`cursor-pointer border-b border-[#e1ebe6] align-top transition ${active ? "bg-[#dceee6]" : "hover:bg-[#f5faf7]"}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold leading-5 text-[#163d35]">{item.name}</p>
                      <p className="mt-1 text-xs text-[#637a73]">{item.foodType || "Chưa phân loại"}{item.foodGroup ? ` · ${item.foodGroup}` : ""}</p>
                    </td>
                    <td className="px-4 py-3 text-xs leading-5 text-[#4b655e]">
                      <span className="block font-semibold">{item.source || "—"}</span>
                      <span>{item.sourceCode || "Chưa có mã"}</span>
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
            {!visibleItems.length && <p className="px-4 py-8 text-center text-sm text-[#5b706a]">Không tìm thấy bản ghi phù hợp.</p>}
          </div>
        </section>

        {chosen ? <form onSubmit={save} className="rounded-2xl border-2 border-[#123c36] bg-white p-5 shadow-[0_8px_20px_rgba(18,60,54,.04)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#c8d7d1] pb-4">
            <div><p className="text-xs font-bold tracking-[.16em] text-[#0f5a4e]">BẢN GHI ĐANG CHỈNH</p><h3 className="mt-1 text-xl font-semibold text-[#122f2a]">Chỉnh sửa có kiểm soát</h3></div>
            <div className="rounded-lg border border-[#bed2c9] bg-[#f5faf7] px-3 py-2 text-xs text-[#35554c]">Mã nguồn: <b>{chosen.sourceCode || "—"}</b></div>
          </div>

          <datalist id="food-type-options">{foodTypeOptions.map((option) => <option key={option} value={option} />)}</datalist>
          <datalist id="food-group-options">{foodGroupOptions.map((option) => <option key={option} value={option} />)}</datalist>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {fields.map(([key, label]) => {
              const isWide = wideFields.has(key);
              const isNote = key === "sourceNote";
              const list = key === "foodType" ? "food-type-options" : key === "foodGroup" ? "food-group-options" : undefined;
              return <label key={key} className={`block text-sm font-semibold text-[#24483f] ${isWide ? "md:col-span-2" : ""}`}>
                {label}
                {isNote ? <textarea value={String(chosen[key] ?? "")} onChange={(event) => setChosen({ ...chosen, [key]: event.target.value })} className="mt-1.5 min-h-24 w-full rounded-lg border border-[#9fb7ae] bg-white px-3 py-2.5 font-normal text-[#1e342f] outline-none focus:border-[#0b6957] focus:ring-2 focus:ring-[#b9ddd0]" /> : <input list={list} type={numericFields.has(key) ? "number" : "text"} step={numericFields.has(key) ? "any" : undefined} value={String(chosen[key] ?? "")} onChange={(event) => setChosen({ ...chosen, [key]: numericFields.has(key) && event.target.value !== "" ? Number(event.target.value) : event.target.value })} className="mt-1.5 w-full rounded-lg border border-[#9fb7ae] bg-white px-3 py-2.5 font-normal text-[#1e342f] outline-none focus:border-[#0b6957] focus:ring-2 focus:ring-[#b9ddd0]" />}
              </label>;
            })}
          </div>

          <section className="mt-5 rounded-xl border border-[#d3b86a] bg-[#fffdf5] p-4">
            <label className="block text-sm font-bold text-[#4f4217]">Lý do thay đổi và nguồn đối chiếu
              <textarea required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ví dụ: Đối chiếu lại với nguồn VDD/RNI ngày …" className="mt-1.5 min-h-24 w-full rounded-lg border border-[#cdb56d] bg-white px-3 py-2.5 font-normal text-[#2e2a1a] outline-none focus:border-[#9a7615] focus:ring-2 focus:ring-[#eadcaa]" />
            </label>
            <p className="mt-2 text-xs leading-5 text-[#665c3a]">Lý do là bắt buộc để lưu người thực hiện, thời gian và giá trị thay đổi trong nhật ký dữ liệu.</p>
            <button disabled={busy || !reason.trim()} className="mt-4 rounded-lg bg-[#123c36] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0b5549] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Đang lưu…" : "Lưu thay đổi"}</button>
          </section>

          <section className="mt-5 border-t border-[#d9e4df] pt-5">
            <h4 className="font-semibold text-[#183d35]">Lịch sử thay đổi gần đây</h4>
            <div className="mt-3 space-y-2">
              {logs.map((log) => <div key={log.id} className="rounded-lg border-l-4 border-[#b08716] bg-[#fffdf6] px-3 py-2.5 text-sm leading-5 text-[#463f26]}" >
                <p><b>{log.actorName}</b> · {new Date(log.createdAt).toLocaleString("vi-VN")}</p><p className="mt-1 text-[#655d42]">{log.reason}</p>
              </div>)}
              {!logs.length && <p className="rounded-lg bg-[#f4f8f6] px-3 py-3 text-sm text-[#5a7169]">Chưa có lần thay đổi nào cho bản ghi này.</p>}
            </div>
          </section>
        </form> : <section className="flex min-h-80 items-center justify-center rounded-2xl border-2 border-dashed border-[#8fa99e] bg-[#f8fbf9] p-8 text-center shadow-[0_8px_20px_rgba(18,60,54,.03)]"><div><p className="font-semibold text-[#23473f]">Chưa chọn bản ghi</p><p className="mt-1 max-w-sm text-sm leading-6 text-[#617871]">Chọn một thực phẩm hoặc món ăn trong danh sách để mở biểu mẫu chỉnh sửa ở đây.</p></div></section>}
      </div>
    </div>
  );
}
