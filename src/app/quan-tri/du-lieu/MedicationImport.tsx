"use client";

import { useEffect, useState } from "react";
import MedicationCatalogPreview from "./MedicationCatalogPreview";

type MedicationRefItem = {
  id: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  sourceUrl: string;
  sourceLabel: string | null;
  createdAt?: string;
};

type RowResult = { url: string; status: "ok" | "failed"; item?: MedicationRefItem; error?: string };

export default function MedicationImport() {
  const [urlsText, setUrlsText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<RowResult[]>([]);
  const [items, setItems] = useState<MedicationRefItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listQuery, setListQuery] = useState("");
  const [categoryUrl, setCategoryUrl] = useState("");
  const [scanningCategory, setScanningCategory] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState("");
  const [sourceQuery, setSourceQuery] = useState("");
  const [searchingSource, setSearchingSource] = useState(false);
  const [sourceSearchMessage, setSourceSearchMessage] = useState("");

  async function loadList() {
    setLoadingList(true);
    try {
      const res = await fetch("/api/admin/medications");
      const data = await res.json();
      setItems(res.ok ? (data.items ?? []) : []);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadList();
  }, []);

  async function importOne(url: string): Promise<RowResult> {
    try {
      const res = await fetch("/api/admin/medications/import-one", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { url, status: "failed", error: data.error ?? `HTTP ${res.status}` };
      return { url, status: "ok", item: data.item };
    } catch {
      return { url, status: "failed", error: "Lỗi kết nối." };
    }
  }

  // Xử lý từng link một (không gửi song song) — mỗi link là 1 lần tải trang
  // nguồn + 1 lần ghi CSDL riêng, tránh 1 request phải ôm cả danh sách dài
  // rồi bị timeout, giống cách nhập ảnh VDD/RNI.
  async function runImport() {
    const urls = [...new Set(urlsText.split("\n").map((line) => line.trim()).filter(Boolean))];
    if (!urls.length) return;
    setBusy(true);
    setResults([]);
    setProgress({ done: 0, total: urls.length });
    // Keep the page responsive for a catalogue import with thousands of URLs.
    // Progress still counts every URL; the screen only retains the latest rows.
    const recentResults: RowResult[] = [];
    for (const [index, url] of urls.entries()) {
      const result = await importOne(url);
      if (recentResults.length === 100) recentResults.shift();
      recentResults.push(result);
      setResults([...recentResults]);
      setProgress({ done: index + 1, total: urls.length });
      // Keep a modest gap between public source-page requests. This matters
      // when an Admin intentionally imports an entire allowed catalogue.
      if (index + 1 < urls.length) await new Promise((resolve) => setTimeout(resolve, 450));
    }
    setBusy(false);
    setUrlsText("");
    await loadList();
  }

  async function scanCategory() {
    const url = categoryUrl.trim();
    if (!url) return;
    setScanningCategory(true);
    setCategoryMessage("");
    try {
      const res = await fetch("/api/admin/medications/discover-category", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setCategoryMessage(data.error ?? "Chưa quét được danh mục này."); return; }
      const found: string[] = data.links ?? [];
      if (!found.length) { setCategoryMessage("Không tìm thấy link sản phẩm nào trên trang danh mục này."); return; }
      setUrlsText((previous) => {
        const existing = new Set(previous.split("\n").map((line) => line.trim()).filter(Boolean));
        for (const link of found) existing.add(link);
        return [...existing].join("\n");
      });
      setCategoryMessage(`Đã thêm ${found.length} link sản phẩm vào ô dán bên dưới — xem lại rồi bấm "Nhập từ Long Châu".`);
    } finally {
      setScanningCategory(false);
    }
  }

  function appendProductLinks(found: string[]) {
    setUrlsText((previous) => {
      const existing = new Set(previous.split("\n").map((line) => line.trim()).filter(Boolean));
      for (const link of found) existing.add(link);
      return [...existing].join("\n");
    });
  }

  async function searchLongChau() {
    const query = sourceQuery.trim();
    if (query.length < 2) return;
    setSearchingSource(true);
    setSourceSearchMessage("");
    try {
      const res = await fetch("/api/admin/medications/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setSourceSearchMessage(data.error ?? "Chưa tìm được sản phẩm từ Long Châu."); return; }
      const found: string[] = data.links ?? [];
      if (!found.length) { setSourceSearchMessage("Không thấy sản phẩm hiển thị sẵn từ từ khóa này. Thử tên hoạt chất, thương hiệu hoặc nhóm TPBS khác."); return; }
      appendProductLinks(found);
      setSourceSearchMessage(`Đã tìm thấy và thêm ${found.length} link sản phẩm vào danh sách chờ nhập bên dưới.`);
    } finally {
      setSearchingSource(false);
    }
  }

  async function removeItem(id: string) {
    if (!window.confirm("Xoá thuốc này khỏi danh sách tham khảo?")) return;
    await fetch(`/api/admin/medications/${id}`, { method: "DELETE" });
    setItems((previous) => previous.filter((item) => item.id !== id));
  }

  const normalizedListQuery = listQuery.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filteredItems = items.filter((item) => {
    if (!normalizedListQuery) return true;
    return `${item.name} ${item.category ?? ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalizedListQuery);
  });

  return (
    <section className="rounded-xl border-2 border-violet-700 bg-violet-50 p-5">
      <h2 className="text-xl font-semibold text-neutral-900">💊 Nhập thuốc/TPBS từ Long Châu</h2>
      <p className="mt-1 text-sm text-neutral-900">
        Dán link 1 hoặc nhiều trang sản phẩm trên nhathuoclongchau.com.vn (mỗi link 1 dòng). Hệ thống chỉ lấy{" "}
        <b>tên, phân loại, ảnh</b> — không sao chép mô tả/hướng dẫn dùng nguyên văn của nguồn. Xử lý tuần tự từng link.
      </p>

      <details className="mt-2 rounded-md border border-violet-300 bg-white p-3 text-sm text-neutral-900" open>
        <summary className="cursor-pointer font-semibold text-violet-900">Cách làm (bấm để thu gọn)</summary>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>Mở nhathuoclongchau.com.vn, tìm danh mục thuốc/TPBS phù hợp (VD: tiểu đường, tim mạch huyết áp, tiêu hoá...). Copy URL danh mục trên thanh địa chỉ — dạng <code className="rounded bg-violet-50 px-1">nhathuoclongchau.com.vn/thuoc/ten-danh-muc</code> (không có <code className="rounded bg-violet-50 px-1">.html</code>, khác với link 1 sản phẩm).</li>
          <li>Dán URL đó vào ô <b>&quot;Quét nhanh 1 trang danh mục&quot;</b> rồi bấm <b>&quot;Tìm sản phẩm trong danh mục&quot;</b> — hệ thống tự thêm các link sản phẩm tìm được vào ô dán bên dưới. Lưu ý: chỉ lấy được số sản phẩm hiển thị sẵn ban đầu (thường 10-30 sản phẩm/danh mục), không tự bấm &quot;xem thêm&quot;.</li>
          <li>Xem lại danh sách link trong ô — xoá bớt dòng nào không cần, hoặc dán thêm link sản phẩm lẻ nếu muốn.</li>
          <li>Bấm <b>&quot;Nhập từ Long Châu&quot;</b> — hệ thống xử lý tuần tự từng link, có thanh tiến trình. Đừng đóng tab cho tới khi chạy xong.</li>
          <li>Kiểm tra khối <b>&quot;Danh sách đã nhập&quot;</b> bên dưới — xoá dòng nào sai tên/ảnh nếu có.</li>
          <li>Lặp lại bước 1-5 với danh mục khác để mở rộng dần danh sách thuốc/TPBS dùng chung.</li>
        </ol>
      </details>
      <MedicationCatalogPreview onAddLinks={appendProductLinks} />
      <div className="mt-3 rounded-md border-2 border-violet-500 bg-violet-100 p-3">
        <label className="text-sm font-semibold text-neutral-950">Tìm thuốc / thực phẩm chức năng trên Long Châu
          <div className="mt-1 flex flex-wrap gap-2">
            <input value={sourceQuery} onChange={(event) => setSourceQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchLongChau(); } }} placeholder="Ví dụ: metformin, omega 3, vitamin D, men vi sinh..." disabled={searchingSource} className="min-w-0 flex-1 rounded border border-violet-400 bg-white px-2 py-1.5 text-sm disabled:opacity-60" />
            <button type="button" disabled={searchingSource || sourceQuery.trim().length < 2} onClick={() => void searchLongChau()} className="shrink-0 rounded-md bg-violet-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50">
              {searchingSource ? "Đang tìm..." : "Tìm trên Long Châu"}
            </button>
          </div>
        </label>
        <p className="mt-1 text-xs text-neutral-800">Kết quả chỉ là các link sản phẩm công khai đang hiện theo từ khóa. Hệ thống không quét toàn bộ catalogue, không lấy mô tả/hướng dẫn dùng và chỉ nhập sau khi bạn bấm nút xác nhận ở dưới.</p>
        {sourceSearchMessage && <p className="mt-1 text-xs font-semibold text-violet-950">{sourceSearchMessage}</p>}
      </div>
      <div className="mt-3 rounded-md border border-violet-300 bg-white p-3">
        <label className="text-sm font-semibold text-neutral-900">Quét nhanh 1 trang danh mục (VD: nhathuoclongchau.com.vn/thuoc/thuoc-tri-tieu-duong)
          <div className="mt-1 flex flex-wrap gap-2">
            <input value={categoryUrl} onChange={(event) => setCategoryUrl(event.target.value)} placeholder="Dán link 1 trang danh mục thuốc/TPBS" disabled={scanningCategory} className="min-w-0 flex-1 rounded border border-violet-400 px-2 py-1.5 text-sm disabled:opacity-60" />
            <button type="button" disabled={scanningCategory || !categoryUrl.trim()} onClick={() => void scanCategory()} className="shrink-0 rounded-md border border-violet-700 px-3 py-1.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50">
              {scanningCategory ? "Đang quét..." : "Tìm sản phẩm trong danh mục"}
            </button>
          </div>
        </label>
        <p className="mt-1 text-xs text-neutral-700">Chỉ lấy các link sản phẩm hiển thị sẵn trên trang danh mục đó (không tự bấm &quot;xem thêm&quot;). Quét nhiều danh mục khác nhau để gom được nhiều thuốc/TPBS hơn.</p>
        {categoryMessage && <p className="mt-1 text-xs font-semibold text-violet-900">{categoryMessage}</p>}
      </div>
      <textarea
        value={urlsText}
        onChange={(event) => setUrlsText(event.target.value)}
        placeholder={"https://nhathuoclongchau.com.vn/thuoc/...\nhttps://nhathuoclongchau.com.vn/thuoc/..."}
        disabled={busy}
        className="mt-3 min-h-24 w-full rounded border border-violet-400 bg-white px-3 py-2 text-sm disabled:opacity-60"
      />
      <button type="button" disabled={busy || !urlsText.trim()} onClick={() => void runImport()} className="mt-3 rounded-md bg-violet-700 px-4 py-2 font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50">
        {busy && progress ? `Đang nhập… ${progress.done}/${progress.total}` : "Nhập từ Long Châu"}
      </button>

      {progress && <div className="mt-3 rounded-lg border-2 border-violet-700 bg-white p-3">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-violet-100"><div className="h-full bg-violet-700 transition-[width]" style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }} /></div>
        {busy && <p className="mt-2 text-xs text-neutral-700">Đừng đóng tab cho tới khi chạy xong — mỗi link tải trang nguồn riêng nên có thể mất vài giây/link.</p>}
      </div>}

      {results.length > 0 && <div className="mt-3 divide-y divide-violet-200 rounded-lg border border-violet-300 bg-white">
        {results.map((result) => (
          <div key={result.url} className="flex items-start gap-2 px-3 py-2 text-sm">
            <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${result.status === "ok" ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"}`}>{result.status === "ok" ? "OK" : "Lỗi"}</span>
            <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-neutral-900">{result.status === "ok" ? result.item?.name : result.error}</span>
          </div>
        ))}
      </div>}

      <div className="mt-5 flex flex-wrap items-end justify-between gap-2">
        <div><h3 className="text-lg font-semibold text-neutral-900">Danh sách đã nhập ({items.length})</h3><p className="text-xs text-neutral-700">Tra cứu theo tên sản phẩm hoặc nhóm thuốc/TPBS trước khi xoá hay dùng lại.</p></div>
        <label className="text-sm font-semibold text-neutral-900">Tìm trong danh sách
          <input value={listQuery} onChange={(event) => setListQuery(event.target.value)} placeholder="Tên hoặc nhóm thuốc/TPBS" className="mt-1 block rounded border border-violet-400 bg-white px-2 py-1.5 text-sm font-normal" />
        </label>
      </div>
      {loadingList ? <p className="mt-1 text-sm text-neutral-700">Đang tải...</p> : items.length === 0 ? <p className="mt-1 text-sm text-neutral-700">Chưa có thuốc nào.</p> : (
        <div className="mt-2 divide-y divide-violet-200 rounded-lg border border-violet-300 bg-white">
          {filteredItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded border border-violet-200 object-contain" /> : <span className="h-10 w-10 shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-neutral-950">{item.name}</p>
                <p className="text-xs text-neutral-700">{item.category ?? "Chưa rõ phân loại"}</p>
              </div>
              <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-violet-800 underline underline-offset-2">Nguồn ↗</a>
              <button type="button" onClick={() => void removeItem(item.id)} className="shrink-0 rounded px-2 py-1 text-rose-800 hover:bg-rose-50" title="Xoá">✕</button>
            </div>
          ))}
          {filteredItems.length === 0 && <p className="px-3 py-4 text-sm text-neutral-700">Không có thuốc/TPBS khớp từ kho đã nhập.</p>}
        </div>
      )}
    </section>
  );
}
