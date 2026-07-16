"use client";

import { useState } from "react";
type Food = { id: string; name: string; source: string; wastePercent: number | null } & Record<string, unknown>;
export type AiRationItem = { meal: string; dishName: string; foodName: string; edibleGrams: number; note: string; food: Food | null; matchType?: "exact" | "suggested" | "none"; candidates?: Food[] };

const samples = [
  { title: "Món đơn", text: "Sáng: phở bò 350 g." },
  { title: "Món có thành phần rõ", text: "Trưa: cơm chín 200 g. Canh rau ngót thịt 250 g (rau ngót 60 g, thịt lợn nạc 30 g)." },
  { title: "Thực phẩm trực tiếp", text: "Phụ sáng: chuối phần ăn được 100 g, sữa chua 100 g." },
] as const;

export default function AiRationInput({ onConfirm }: { onConfirm: (items: AiRationItem[]) => void }) {
  const [text, setText] = useState("");
  const [consent, setConsent] = useState(false);
  const [userApiKey, setUserApiKey] = useState("");
  const [lastResult, setLastResult] = useState<AiRationItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // Bay thẳng vào bảng khẩu phần chính ngay khi AI bóc tách xong — không qua
  // bước chọn/xác nhận riêng nữa. Dòng chưa khớp thực phẩm vẫn được thêm với
  // tên AI ghi nhận (chưa tính dinh dưỡng); sửa lại bằng cách xoá dòng đó rồi
  // tìm/thêm đúng thực phẩm ở bảng bên dưới, giống mọi dòng nhập tay khác.
  async function parse() {
    setBusy(true); setMessage(""); setLastResult([]);
    try {
      const response = await fetch("/api/ai/parse-ration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, externalProcessingConsent: consent, apiKey: userApiKey }) });
      const data = await response.json() as { error?: string; items?: AiRationItem[] };
      if (!response.ok) { setMessage(data.error ?? "Không thể xử lý yêu cầu AI."); return; }
      const result = data.items ?? [];
      if (!result.length) { setMessage("AI không tách được dòng nào từ mô tả này."); return; }
      onConfirm(result);
      setLastResult(result);
      const unmatched = result.filter((item) => !item.food).length;
      setMessage(`Đã thêm ${result.length} dòng vào khẩu phần ở bảng bên dưới.${unmatched ? ` ${unmatched} dòng chưa khớp thực phẩm (chưa tính dinh dưỡng) — xoá dòng đó rồi tìm/thêm lại đúng thực phẩm.` : ""}`);
      setText("");
    } catch { setMessage("Không thể gọi AI. Vui lòng thử lại."); } finally { setBusy(false); }
  }

  return <section className="rounded-lg border-2 border-[#73540d] bg-[#fffdf6] p-4" data-no-print>
    <div className="border-b-2 border-[#a77b10] pb-3">
      <p className="text-xs font-semibold tracking-[0.14em] text-[#694d00]">AI HỖ TRỢ NHẬP LIỆU</p>
      <h2 className="mt-1 text-xl font-semibold">Dán mô tả khẩu phần</h2>
      <p className="mt-1 text-sm text-neutral-900">Hệ thống dùng Gemini chung do quản trị viên cấu hình; người dùng không cần API key. AI chỉ bóc tách rồi thêm thẳng vào bảng khẩu phần bên dưới; không tự sửa dữ liệu gốc hoặc chẩn đoán.</p>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">{samples.map((sample) => <button key={sample.title} type="button" onClick={() => setText(sample.text)} className="rounded border border-[#73540d] bg-white px-3 py-1.5 text-sm font-semibold text-[#694d00]">Dùng mẫu: {sample.title}</button>)}</div>
    <p className="mt-3 rounded-md border-l-4 border-[#a77b10] bg-[#fff9e8] p-3 text-sm text-neutral-950"><b>Để khớp tốt:</b> ghi tên món/thực phẩm và lượng g/ml. Chỉ ghi nguyên liệu trong ngoặc khi bạn biết rõ; nếu không, cứ ghi tên món để hệ thống ưu tiên khớp món ăn có sẵn. Không nhập thông tin định danh bệnh nhân.</p>
    <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={"Ví dụ: Sáng: phở bò 350 g.\nTrưa: cơm chín 200 g, cá chép kho 80 g."} className="mt-3 min-h-32 w-full rounded-md border-2 border-[#8fa99e] px-3 py-2 text-sm" />
    <label className="mt-3 flex items-start gap-2 rounded-md border border-amber-700 bg-amber-50 p-3 text-sm text-neutral-950"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" /><span>Tôi hiểu mô tả khẩu phần sẽ được gửi đến Gemini để bóc tách và không nhập tên, số điện thoại, địa chỉ, mã bệnh án hay thông tin định danh người bệnh.</span></label>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button type="button" onClick={parse} disabled={busy || !consent || text.trim().length < 8} className="rounded-md bg-[#73540d] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "AI đang bóc tách..." : "Bóc tách bằng AI và thêm vào khẩu phần"}</button>
      <p className="text-xs text-neutral-900">Chỉ người quản trị cấu hình Gemini một lần trên máy chủ; key không hiển thị hay lưu trên trình duyệt.</p>
    </div>
    {message && <p className="mt-3 text-sm font-semibold text-neutral-950">{message}</p>}
    {lastResult.length > 0 && <div className="mt-4 overflow-x-auto border-2 border-[#a77b10]">
      <table className="min-w-[800px] w-full text-sm">
        <thead><tr><th className="px-3 py-2">Bữa / món</th><th className="px-3 py-2">AI nhận diện</th><th className="px-3 py-2">Kết quả khớp CSDL</th><th className="px-3 py-2 text-right">Lượng AI ghi</th></tr></thead>
        <tbody>{lastResult.map((item, index) => <tr key={`${item.foodName}-${index}`} className={item.food ? "bg-white" : "bg-[#fff0f0]"}>
          <td className="px-3 py-2">{item.meal || "(chưa rõ bữa)"}<br /><span className="text-xs">{item.dishName || "(thực phẩm trực tiếp)"}</span></td>
          <td className="px-3 py-2 font-semibold">{item.foodName}</td>
          <td className="px-3 py-2">{item.food ? <><b>{item.food.name}</b><br /><span className="text-xs font-semibold text-[#123c36]">{item.matchType === "exact" ? "Khớp chính xác" : "Gợi ý, đã thêm — kiểm tra lại"} · {item.food.source}</span></> : <span className="font-semibold text-[#8a2323]">Chưa khớp — đã thêm với tên gốc, chưa tính dinh dưỡng</span>}</td>
          <td className="px-3 py-2 text-right">{item.edibleGrams ? `${item.edibleGrams} g` : "Chưa rõ"}</td>
        </tr>)}</tbody>
      </table>
    </div>}
  </section>;
}
