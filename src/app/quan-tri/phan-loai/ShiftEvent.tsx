"use client";

export type StatImpact = Partial<Record<"focus" | "integrity" | "momentum" | "morale", number>>;

const LABEL = { focus: "Tập trung", integrity: "Thận trọng", momentum: "Nhịp độ", morale: "Tinh thần" };

const EVENTS = [
  {
    icon: "🌙", title: "Cuối dãy dữ liệu dài", text: "Mắt bắt đầu mỏi, nhưng hàng đợi vẫn còn. Bạn xử lý thế nào?",
    choices: [
      { label: "Nghỉ mắt 5 phút", note: "Chậm lại để hồi phục", impact: { focus: 18, morale: 7, momentum: -7 } },
      { label: "Kiểm tra chéo 3 thẻ", note: "Tăng độ chắc chắn", impact: { integrity: 15, focus: -7, momentum: -4 } },
      { label: "Cố làm tiếp", note: "Nhanh nhưng dễ hụt hơi", impact: { momentum: 15, focus: -15, morale: -5 } },
    ],
  },
  {
    icon: "🧩", title: "Một món khó phân loại", text: "Tên món chưa đủ rõ, trong khi nguồn gốc vẫn có thể truy lại.",
    choices: [
      { label: "Đánh dấu xem sau", note: "Không đoán khi chưa chắc", impact: { integrity: 12, momentum: -8, morale: -1 } },
      { label: "Mở nguồn đối chiếu", note: "Tốn sức nhưng đáng tin", impact: { integrity: 10, focus: -9, momentum: 3 } },
      { label: "Chọn nhanh theo tên", note: "Có nguy cơ phân loại sai", impact: { momentum: 14, integrity: -14, morale: -4 } },
    ],
  },
  {
    icon: "⏰", title: "Áp lực hoàn thành lượt", text: "Bạn muốn giữ nhịp rà dữ liệu mà không đánh đổi chất lượng.",
    choices: [
      { label: "Giảm số thẻ lượt sau", note: "Bền sức hơn", impact: { focus: 13, morale: 9, momentum: -9 } },
      { label: "Giữ nhịp đều", note: "An toàn và cân bằng", impact: { focus: 4, integrity: 4, momentum: 4, morale: 4 } },
      { label: "Chạy nước rút", note: "Tiến độ tăng, rủi ro cũng tăng", impact: { momentum: 18, focus: -14, integrity: -8 } },
    ],
  },
  {
    icon: "🖼️", title: "Thẻ thiếu hình minh họa", text: "Số liệu nguồn vẫn còn, nhưng nhận diện bằng mắt khó hơn bình thường.",
    choices: [
      { label: "Đọc kỹ tên và nguồn", note: "Chậm nhưng chắc", impact: { integrity: 10, focus: -7, momentum: 2 } },
      { label: "Tạm bỏ qua", note: "Giữ an toàn dữ liệu", impact: { focus: 5, integrity: 5, momentum: -7 } },
      { label: "Phân loại theo cảm giác", note: "Nhanh nhưng thiếu căn cứ", impact: { momentum: 12, integrity: -16, morale: -2 } },
    ],
  },
] as const;

export default function ShiftEvent({ round, onChoose }: { round: number; onChoose: (impact: StatImpact) => void }) {
  const event = EVENTS[(round - 1) % EVENTS.length];
  return <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[#071b17]/80 p-3 backdrop-blur-sm">
    <section className="w-full max-w-lg rounded-3xl border-4 border-[#89b7a7] bg-[#f7faf8] p-5 text-[#102f2b] shadow-2xl sm:p-7">
      <p className="text-xs font-black tracking-[.16em] text-[#52786d]">SỰ KIỆN CA TRỰC · LƯỢT {round}</p>
      <div className="mt-3 text-5xl" aria-hidden>{event.icon}</div>
      <h2 className="mt-3 text-2xl font-black">{event.title}</h2>
      <p className="mt-2 leading-7 text-[#36574f]">{event.text}</p>
      <div className="mt-5 grid gap-3">
        {event.choices.map((choice) => <button key={choice.label} type="button" onClick={() => onChoose(choice.impact)} className="rounded-2xl border-2 border-[#9bb9ad] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#123c36] hover:shadow-md active:scale-[.99]"><span className="font-black text-[#123c36]">{choice.label}</span><span className="mt-1 block text-sm text-[#567168]">{choice.note}</span><span className="mt-2 flex flex-wrap gap-1.5 text-xs font-bold">{Object.entries(choice.impact).map(([key, value]) => <span key={key} className={`rounded-full px-2 py-0.5 ${Number(value) >= 0 ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-800"}`}>{LABEL[key as keyof typeof LABEL]} {Number(value) >= 0 ? "+" : ""}{value}</span>)}</span></button>)}
      </div>
    </section>
  </div>;
}
