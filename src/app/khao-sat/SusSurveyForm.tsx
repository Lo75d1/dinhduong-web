"use client";

import { FormEvent, useState } from "react";
import { SUS_ITEMS, SUS_ROLES, SUS_USE_FREQ } from "@/lib/sus";

const SCALE = [1, 2, 3, 4, 5];
const SCALE_ENDS = ["1 · Rất không đồng ý", "5 · Rất đồng ý"];

export default function SusSurveyForm() {
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    const form = event.currentTarget;
    const fd = new FormData(form);
    const payload: Record<string, unknown> = {
      role: fd.get("role"),
      useFreq: fd.get("useFreq"),
      comment: fd.get("comment"),
    };
    for (let i = 1; i <= 10; i++) {
      const v = fd.get(`q${i}`);
      if (v == null) {
        setMessage(`Vui lòng trả lời câu ${i}.`);
        setSending(false);
        return;
      }
      payload[`q${i}`] = Number(v);
    }
    const response = await fetch("/api/sus", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (response?.ok) {
      form.reset();
      setOk(true);
      setMessage("Cảm ơn bạn đã đánh giá! Phản hồi đã được ghi nhận (ẩn danh).");
    } else {
      setMessage(result?.error ?? "Chưa thể gửi. Vui lòng thử lại sau.");
    }
    setSending(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="clinical-page-heading">
        <p className="text-xs font-semibold tracking-[.16em] text-[#123c36]">KHẢO SÁT NGƯỜI DÙNG</p>
        <h1 className="mt-1 text-3xl font-semibold">Đánh giá mức độ dễ sử dụng của hệ thống</h1>
        <p className="mt-2 max-w-3xl">
          Phiếu khảo sát ngắn (thang SUS, 10 câu) dùng cho nghiên cứu đánh giá và cải tiến website Dinh dưỡng 2598.
          Khảo sát <b>ẩn danh</b>: không thu thập họ tên, thông tin định danh hay dữ liệu sức khỏe. Vui lòng đánh giá sau khi đã dùng thử hệ thống.
        </p>
      </section>

      <form onSubmit={submit} className="rounded-xl border-2 border-[#123c36] bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="font-semibold">Vai trò của bạn
            <select name="role" className="mt-1 w-full rounded border-2 border-[#8fa99e] px-3 py-2 font-normal">
              {SUS_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="font-semibold">Số lần đã dùng hệ thống
            <select name="useFreq" className="mt-1 w-full rounded border-2 border-[#8fa99e] px-3 py-2 font-normal">
              {SUS_USE_FREQ.map((f) => <option key={f} value={f}>{f} lần</option>)}
            </select>
          </label>
        </div>

        <fieldset className="mt-5">
          <legend className="font-semibold text-[#123c36]">Mỗi câu chọn một mức (1 = rất không đồng ý … 5 = rất đồng ý)</legend>
          <div className="mt-3 flex flex-col gap-3">
            {SUS_ITEMS.map((item, idx) => {
              const i = idx + 1;
              return (
                <div key={i} className="rounded-lg border border-[#cddbd4] bg-[#f8fbf9] p-3">
                  <p className="font-medium text-[#1e342f]"><span className="font-bold">{i}.</span> {item}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-xs text-[#5b736b]">{SCALE_ENDS[0]}</span>
                    {SCALE.map((v) => (
                      <label key={v} className="inline-flex items-center gap-1 text-sm font-semibold">
                        <input type="radio" name={`q${i}`} value={v} required className="h-4 w-4 accent-[#123c36]" />
                        {v}
                      </label>
                    ))}
                    <span className="text-xs text-[#5b736b]">{SCALE_ENDS[1]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>

        <label className="mt-5 block font-semibold">Góp ý thêm (tùy chọn)
          <textarea name="comment" rows={4} className="mt-1 w-full rounded border-2 border-[#8fa99e] px-3 py-2 font-normal" placeholder="Điểm hữu ích nhất / điểm cần cải thiện. Không nhập dữ liệu sức khỏe định danh." />
        </label>

        <button disabled={sending || ok} className="mt-4 rounded bg-[#123c36] px-5 py-2.5 font-semibold text-white disabled:bg-[#66847b]">
          {sending ? "Đang gửi…" : ok ? "Đã gửi" : "Gửi đánh giá"}
        </button>
        {message && <p className="mt-3 rounded border border-[#8fa99e] bg-[#f1f6f4] p-3 font-semibold">{message}</p>}
      </form>
    </div>
  );
}
