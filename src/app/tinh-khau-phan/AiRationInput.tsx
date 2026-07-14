"use client";

import { useState } from "react";
type Food = { id: string; name: string; source: string; wastePercent: number | null } & Record<string, number | null | string>;
export type AiRationItem = { meal: string; dishName: string; foodName: string; edibleGrams: number; note: string; food: Food | null; matchType?: "exact" | "suggested" | "none"; candidates?: Food[] };

const AI_INPUT_SAMPLES = [
  { title: "Mẫu 24h cơ bản", note: "Dùng cho người lớn, ghi rõ món và phần ăn.", text: "Sáng: 1 tô phở bò 350g (bánh phở 150g, thịt bò nạc 60g, hành lá 5g, nước dùng 130g).\n\nPhụ sáng: 1 quả chuối phần ăn được 100g. 1 hũ sữa chua 100g.\n\nTrưa: Cơm chín 200g. Thịt lợn kho 80g. Canh rau ngót thịt 250g (rau ngót 60g, thịt nạc 30g). Đậu phụ rán 50g. Bưởi 80g.\n\nTối: Cơm chín 100g. Cá chép sốt cà chua 120g (cá 80g, cà chua 30g). Rau muống luộc 100g. Trứng gà luộc 55g." },
  { title: "Mẫu điều tra 24h", note: "Dùng khi ghi lời kể của người bệnh/người chăm sóc.", text: "Bữa sáng lúc 7 giờ: 1 bát phở bò, chỉ ăn cái không uống nước. Bánh phở tươi 150g, thịt bò nạc thăn 50g, hành lá 5g.\n\nBữa phụ sáng lúc 9 giờ 30: 1 hộp sữa tươi không đường tiệt trùng 180ml.\n\nBữa trưa lúc 12 giờ: cơm chín 200g, ức gà luộc 100g, súp lơ xanh hấp 150g.\n\nBữa phụ chiều lúc 15 giờ 30: chuối phần ăn được khoảng 120g.\n\nBữa tối lúc 19 giờ: cơm trắng 150g, cá chép rán 80g, canh rau ngót thịt gồm rau ngót 50g và thịt lợn nạc băm 10g." },
  { title: "Mẫu trẻ em", note: "Ghi lượng phần trẻ thực ăn được, không ghi tên trẻ.", text: "Sáng: bún bò 300g (bún 150g, thịt bò 40g, giá 15g). Sữa 150ml.\n\nPhụ sáng: sữa chua 100g. Chuối phần ăn được 50g.\n\nTrưa: cơm chín 100g. Trứng chiên 55g. Thịt lợn rim 50g. Canh cải nấu tôm 200g. Quýt phần ăn được 80g.\n\nPhụ chiều: sữa 180ml. Bánh quy 20g.\n\nTối: cơm chín 80g. Cá quả kho 60g. Bí đỏ luộc 100g. Táo phần ăn được 80g." },
  { title: "Mẫu nuôi ăn lỏng / sonde", note: "Chỉ ghi công thức và lượng đã dùng; không tự suy đoán phần thiếu.", text: "6h: súp xay 250g (gạo 20g, thịt nạc 30g, cà rốt 30g, khoai tây 40g, dầu ăn 3g).\n\n9h: sữa Ensure 200g (bột 45g pha với 180ml nước).\n\n12h: cháo xay 300g (gạo 30g, cá lóc 50g, bí đỏ 60g, rau ngót 30g, dầu ăn 5g).\n\n15h: sữa Ensure 200g (bột 45g pha với 180ml nước).\n\n18h: súp xay 300g (gạo 30g, ức gà 50g, cà rốt 40g, su su 40g, dầu ăn 5g)." },
] as const;

export default function AiRationInput({ onConfirm }: { onConfirm: (items: AiRationItem[]) => void }) {
  const [text, setText] = useState("");
  const [usePersonalKey, setUsePersonalKey] = useState(false);
  const [personalApiKey, setPersonalApiKey] = useState("");
  const [externalProcessingConsent, setExternalProcessingConsent] = useState(false);
  const [items, setItems] = useState<AiRationItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function parse() {
    setBusy(true); setMessage(""); setItems([]); setSelected([]);
    try {
      const response = await fetch("/api/ai/parse-ration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, personalApiKey: usePersonalKey ? personalApiKey : "", externalProcessingConsent }) });
      const data = await response.json() as { error?: string; items?: AiRationItem[]; keyMode?: string };
      if (!response.ok) { setMessage(data.error ?? "Không thể xử lý yêu cầu AI."); return; }
      const result = data.items ?? [];
      setItems(result); setSelected(result.map((item, index) => item.food ? index : -1).filter((index) => index >= 0));
      setMessage(`${result.length} dòng được AI bóc tách (${data.keyMode === "personal" ? "key riêng" : "key hệ thống"}). Chỉ các dòng khớp dữ liệu mới được chọn sẵn.`);
    } catch { setMessage("Không thể gọi AI. Vui lòng thử lại."); } finally { setBusy(false); }
  }

  function toggle(index: number) { setSelected((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index]); }
  function selectCandidate(index: number, foodId: string) {
    const candidate = items[index]?.candidates?.find((food) => food.id === foodId) ?? null;
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, food: candidate, matchType: candidate ? "suggested" : "none" } : item));
    setSelected((current) => candidate ? (current.includes(index) ? current : [...current, index]) : current.filter((value) => value !== index));
  }
  const confirmed = items.filter((item, index) => selected.includes(index) && item.food);
  return <section className="rounded-lg border-2 border-[#73540d] bg-[#fffdf6] p-4" data-no-print>
    <div className="border-b-2 border-[#a77b10] pb-3"><p className="text-xs font-semibold tracking-[0.14em] text-[#694d00]">AI HỖ TRỢ NHẬP LIỆU</p><h2 className="mt-1 text-xl font-semibold">Dán mô tả khẩu phần</h2><p className="mt-1 text-sm text-neutral-900">AI chỉ bóc tách văn bản thành dòng nhập. Bạn phải kiểm tra bản xem trước trước khi thêm vào khẩu phần; AI không chẩn đoán, không tự sửa dữ liệu nguồn.</p></div>
    <details className="mt-3 rounded-md border-2 border-[#b2c8bd] bg-white" data-no-print><summary className="cursor-pointer px-3 py-2 font-semibold text-[#123c36]">Mẫu nhập AI và cách ghi đúng</summary><div className="border-t border-[#b2c8bd] p-3"><div className="grid gap-3 md:grid-cols-2">{AI_INPUT_SAMPLES.map((sample) => <article key={sample.title} className="rounded-md border border-[#a9beb4] bg-[#f7fbf9] p-3"><h3 className="font-semibold text-neutral-950">{sample.title}</h3><p className="mt-1 text-xs text-neutral-900">{sample.note}</p><button type="button" onClick={() => { setText(sample.text); setMessage(`Đã chèn ${sample.title.toLowerCase()}. Hãy rà lại lượng trước khi gửi AI.`); }} className="mt-3 rounded-md border border-[#123c36] bg-white px-3 py-1.5 text-sm font-semibold text-[#123c36] hover:bg-[#eaf4ef]">Dùng mẫu này</button></article>)}</div><div className="mt-3 rounded-md border-l-4 border-[#a77b10] bg-[#fff9e8] p-3 text-sm text-neutral-950"><b>Quy tắc để AI tách đúng:</b> ghi bữa → tên món → từng nguyên liệu → lượng g/ml; dùng tên cụ thể (ví dụ “cá chép”, “thịt lợn nạc”); nêu dầu, đường, muối nếu có lượng; lượng chưa rõ thì ghi “chưa rõ”, không tự ước tính. Với khẩu phần 24h, ưu tiên g phần ăn được/đã chín/đã bỏ vỏ xương.</div></div></details>
    <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={'Ghi theo bữa → món → nguyên liệu → lượng g/ml.\nVí dụ: Sáng: phở bò 350g (bánh phở 150g, thịt bò nạc 60g).'} className="mt-3 min-h-36 w-full rounded-md border-2 border-[#8fa99e] px-3 py-2 text-sm" />
    <label className="mt-3 flex items-start gap-2 text-sm font-semibold text-neutral-950"><input type="checkbox" checked={usePersonalKey} onChange={(event) => setUsePersonalKey(event.target.checked)} className="mt-1" />Dùng API key Gemini riêng cho phiên này</label>
    {usePersonalKey && <input value={personalApiKey} onChange={(event) => setPersonalApiKey(event.target.value)} type="password" autoComplete="off" placeholder="AIza... (không được lưu)" className="mt-2 w-full rounded-md border border-neutral-500 px-3 py-2 text-sm" />}
    <label className="mt-3 flex items-start gap-2 rounded-md border border-amber-700 bg-amber-50 p-3 text-sm text-neutral-950"><input type="checkbox" checked={externalProcessingConsent} onChange={(event) => setExternalProcessingConsent(event.target.checked)} className="mt-1" /> <span>Tôi hiểu mô tả khẩu phần sẽ được gửi đến Gemini để bóc tách. Tôi không nhập tên, số điện thoại, địa chỉ, mã bệnh án hoặc thông tin định danh của bệnh nhân.</span></label>
    <div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" onClick={parse} disabled={busy || !externalProcessingConsent || text.trim().length < 8 || (usePersonalKey && !personalApiKey.trim())} className="rounded-md bg-[#73540d] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "AI đang bóc tách..." : "Bóc tách bằng AI"}</button><p className="max-w-3xl text-xs text-neutral-900">Không chọn key riêng: dùng key chung sau khi đăng nhập. Key riêng chỉ chuyển đến server cho lần gọi hiện tại, không được lưu.</p></div>
    {message && <p className="mt-3 text-sm font-semibold text-neutral-950">{message}</p>}
    {items.length > 0 && <div className="mt-4 overflow-x-auto border-2 border-[#a77b10]"><table className="min-w-[900px] w-full text-sm"><thead><tr><th className="px-3 py-2">Thêm</th><th className="px-3 py-2">Bữa / món</th><th className="px-3 py-2">AI nhận diện</th><th className="px-3 py-2">Khớp CSDL / chọn lại</th><th className="px-3 py-2 text-right">Lượng AI ghi</th><th className="px-3 py-2">Ghi chú</th></tr></thead><tbody>{items.map((item, index) => <tr key={`${item.foodName}-${index}`} className={item.food ? "bg-white" : "bg-[#fff0f0]"}><td className="px-3 py-2 text-center"><input type="checkbox" disabled={!item.food} checked={selected.includes(index)} onChange={() => toggle(index)} /></td><td className="px-3 py-2">{item.meal || "(chưa rõ bữa)"}<br /><span className="text-xs">{item.dishName || "(chưa rõ món)"}</span></td><td className="px-3 py-2 font-semibold">{item.foodName}</td><td className="px-3 py-2">{item.food ? <><b>{item.food.name}</b><br /><span className="text-xs font-semibold text-[#123c36]">{item.matchType === "exact" ? "Khớp chính xác" : "Bạn đã chọn gợi ý"} · {item.food.source}</span></> : <span className="font-semibold text-[#8a2323]">Chưa khớp tự động</span>}{(item.candidates?.length ?? 0) > 0 && <select aria-label={`Chọn thực phẩm thay cho ${item.foodName}`} value={item.food?.id ?? ""} onChange={(event) => selectCandidate(index, event.target.value)} className="mt-1 w-full rounded border border-neutral-500 bg-white px-2 py-1 text-xs"><option value="">— Chọn thực phẩm phù hợp —</option>{item.candidates?.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.source}</option>)}</select>}{!item.food && !(item.candidates?.length) && <p className="mt-1 text-xs text-[#8a2323]">Thêm thực phẩm mới hoặc tìm thủ công.</p>}</td><td className="px-3 py-2 text-right">{item.edibleGrams ? `${item.edibleGrams} g` : "Chưa rõ"}</td><td className="px-3 py-2">{item.note || "—"}</td></tr>)}</tbody></table></div>}
    {confirmed.length > 0 && <button type="button" onClick={() => { onConfirm(confirmed); setItems([]); setSelected([]); setMessage(`${confirmed.length} dòng đã được thêm vào khẩu phần.`); }} className="mt-4 rounded-md bg-[#123c36] px-4 py-2 font-semibold text-white">Thêm {confirmed.length} dòng đã kiểm tra vào khẩu phần</button>}
  </section>;
}
