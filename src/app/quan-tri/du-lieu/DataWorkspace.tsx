"use client";

import { useState } from "react";
import BulkClassifyEditor from "./BulkClassifyEditor";
import DataManager from "./DataManager";
import ImageSourceSync from "./ImageSourceSync";
import MedicationImport from "./MedicationImport";

type TabId = "edit" | "classify" | "images" | "medications";

const tabs: Array<{ id: TabId; label: string; description: string }> = [
  { id: "edit", label: "Biên tập chi tiết", description: "Dinh dưỡng VDD + RNI" },
  { id: "classify", label: "Phân loại hàng loạt", description: "Gán nhóm và chỉ số" },
  { id: "images", label: "Ảnh tham chiếu", description: "Đối chiếu VDD + RNI" },
  { id: "medications", label: "Thuốc & TPBS", description: "Long Châu dùng chung" },
];

export default function DataWorkspace() {
  const [tab, setTab] = useState<TabId>("edit");

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border-2 border-[#123c36] bg-white shadow-[0_10px_24px_rgba(18,60,54,.06)]">
        <div className="border-b border-[#c8d7d1] bg-[linear-gradient(110deg,#f8fcfa,#eaf4ef)] px-5 py-5 sm:px-7">
          <p className="text-xs font-bold tracking-[.18em] text-[#0f5a4e]">QUẢN TRỊ DỮ LIỆU</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#102f2b]">Không gian biên tập dữ liệu</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#405b55]">Tách từng công việc thành khu riêng để dễ rà soát. Mọi lần lưu dữ liệu nguồn đều cần lý do và được ghi nhật ký thay đổi.</p>
            </div>
            <span className="rounded-full border border-[#8db3a6] bg-white px-3 py-1.5 text-xs font-semibold text-[#0d5448]">Có kiểm soát thay đổi</span>
          </div>
        </div>

        <nav className="grid border-t border-[#d7e3de] sm:grid-cols-2 lg:grid-cols-4" aria-label="Các công cụ dữ liệu">
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`border-b border-r border-[#d7e3de] px-4 py-4 text-left transition last:border-r-0 hover:bg-[#f4f9f6] ${active ? "bg-[#123c36] text-white hover:bg-[#123c36]" : "bg-white text-[#163f38]"}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="block text-sm font-bold">{item.label}</span>
                <span className={`mt-1 block text-xs ${active ? "text-[#dcefe7]" : "text-[#647a74]"}`}>{item.description}</span>
              </button>
            );
          })}
        </nav>
        <div className="grid border-t border-[#d7e3de] bg-[#f7fbf9] text-xs sm:grid-cols-3">
          <div className="border-b border-r border-[#d7e3de] px-4 py-3"><b className="text-[#123c36]">VDD</b><span className="ml-1 text-[#55736a]">thực phẩm và món ăn có số liệu dinh dưỡng</span></div>
          <div className="border-b border-r border-[#d7e3de] px-4 py-3"><b className="text-[#123c36]">RNI</b><span className="ml-1 text-[#55736a]">công thức, nguyên liệu và ảnh tham chiếu</span></div>
          <div className="border-b border-[#d7e3de] px-4 py-3"><b className="text-violet-800">Long Châu</b><span className="ml-1 text-[#55736a]">thuốc / TPBS tham khảo để đưa vào mốc dùng thuốc</span></div>
        </div>
      </section>

      {tab === "edit" && <DataManager />}
      {tab === "classify" && <BulkClassifyEditor />}
      {tab === "images" && <ImageSourceSync />}
      {tab === "medications" && <MedicationImport />}
    </div>
  );
}
