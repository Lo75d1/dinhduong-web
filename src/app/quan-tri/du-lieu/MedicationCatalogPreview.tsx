"use client";

import { useState } from "react";

type CatalogSource = "drug" | "supplement";

type CatalogPreview = {
  links: string[];
  sourceCounts: Array<{ source: CatalogSource; label: string; count: number }>;
  total: number;
  alreadyImported: number;
  pending: number;
};

export default function MedicationCatalogPreview({ onAddLinks }: { onAddLinks: (links: string[]) => void }) {
  const [sources, setSources] = useState<CatalogSource[]>(["drug", "supplement"]);
  const [preview, setPreview] = useState<CatalogPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function toggleSource(source: CatalogSource) {
    setPreview(null);
    setMessage("");
    setSources((current) => current.includes(source) ? current.filter((item) => item !== source) : [...current, source]);
  }

  async function makePreview() {
    if (!sources.length) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/medications/catalog-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sources }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPreview(null);
        setMessage(data.error ?? "Chưa thể lập danh sách từ sitemap Long Châu.");
        return;
      }
      setPreview(data as CatalogPreview);
    } catch {
      setPreview(null);
      setMessage("Không kết nối được máy chủ để lập danh sách.");
    } finally {
      setBusy(false);
    }
  }

  function addPreviewToQueue() {
    if (!preview) return;
    const confirmed = window.confirm(
      `Đưa ${preview.total.toLocaleString("vi-VN")} link Thuốc/TPBS vào danh sách chờ nhập?\n\nHệ thống chưa tải hay ghi từng sản phẩm cho đến khi bạn bấm nút “Nhập từ Long Châu” bên dưới.`,
    );
    if (!confirmed) return;
    onAddLinks(preview.links);
    setMessage(`Đã đưa ${preview.total.toLocaleString("vi-VN")} link vào danh sách chờ. Xem lại số lượng, rồi bấm “Nhập từ Long Châu” để bắt đầu.`);
  }

  return (
    <div className="mt-3 rounded-md border-2 border-amber-600 bg-amber-50 p-3 text-neutral-950">
      <h3 className="font-semibold">Lập danh sách toàn bộ Thuốc / Thực phẩm chức năng</h3>
      <p className="mt-1 text-xs">
        Danh sách được đọc từ sitemap công khai của Long Châu, chỉ gồm hai danh mục bạn chọn. Không lấy mỹ phẩm, chăm sóc cá nhân, mô tả hay hướng dẫn dùng. Bước này chỉ xem trước URL và không ghi dữ liệu.
      </p>
      <div className="mt-2 flex flex-wrap gap-3 text-sm font-semibold">
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={sources.includes("drug")} onChange={() => toggleSource("drug")} /> Thuốc</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={sources.includes("supplement")} onChange={() => toggleSource("supplement")} /> Thực phẩm chức năng</label>
      </div>
      <button type="button" onClick={() => void makePreview()} disabled={busy || sources.length === 0} className="mt-3 rounded-md border border-amber-800 bg-white px-3 py-1.5 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? "Đang đọc sitemap..." : "Xem trước số lượng"}
      </button>
      {preview && (
        <div className="mt-3 rounded border border-amber-400 bg-white p-3 text-sm">
          <p className="font-semibold">Đã tìm thấy {preview.total.toLocaleString("vi-VN")} URL sản phẩm.</p>
          <ul className="mt-1 list-disc pl-5 text-xs">
            {preview.sourceCounts.map((source) => <li key={source.source}>{source.label}: {source.count.toLocaleString("vi-VN")}</li>)}
            <li>Đã có trong kho tham khảo: {preview.alreadyImported.toLocaleString("vi-VN")}</li>
            <li>Sẽ cần tải chi tiết để bổ sung/cập nhật: {preview.pending.toLocaleString("vi-VN")}</li>
          </ul>
          <p className="mt-2 text-xs">Khi nhập, hệ thống xử lý tuần tự từng trang để giảm tải nguồn. Danh sách lớn sẽ mất thời gian; chỉ bắt đầu sau bước xác nhận tiếp theo.</p>
          <button type="button" onClick={addPreviewToQueue} className="mt-2 rounded-md bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-800">
            Đưa {preview.total.toLocaleString("vi-VN")} link vào danh sách chờ
          </button>
        </div>
      )}
      {message && <p className="mt-2 text-xs font-semibold text-amber-950">{message}</p>}
    </div>
  );
}
