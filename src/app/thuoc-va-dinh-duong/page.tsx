import Link from "next/link";
import { MEDICATION_REFS } from "./data";

export const metadata = { title: "Thuốc & dinh dưỡng (demo) | Dinh dưỡng 2598" };

export default function MedicationNutritionPage() {
  return (
    <div className="flex flex-col gap-5">
      <section className="border-b-2 border-[#123c36] pb-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#123c36]">DEMO — CHƯA PHÁT HÀNH CHÍNH THỨC</p>
        <h1 className="mt-1 text-3xl font-semibold">Tham khảo thuốc &amp; lưu ý dinh dưỡng</h1>
        <p className="mt-2 max-w-4xl text-neutral-900">
          Hỗ trợ lập thực đơn cho bệnh nhân đang dùng thuốc/TPBVSK — <b>chỉ tham khảo</b>, không thay thế Dược thư
          Quốc gia hay chỉ định của bác sĩ điều trị.
        </p>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        {MEDICATION_REFS.map((med) => (
          <article key={med.id} className="rounded-xl border-2 border-[#7f948d] bg-white p-5">
            <div className="flex flex-wrap items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={med.imageUrl}
                alt={`Hộp thuốc ${med.name}`}
                className="h-24 w-24 flex-none rounded-lg border border-[#d8e3df] bg-white object-contain p-1"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-xl font-semibold text-neutral-950">{med.name}</h2>
                  <div className="flex flex-wrap gap-1">
                    {med.diseaseGroups.map((g) => (
                      <span key={g} className="rounded-full border border-[#52786d] bg-[#edf4f0] px-2 py-0.5 text-xs font-semibold text-[#123c36]">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-sm text-neutral-700">{med.activeIngredient}</p>
                <p className="mt-1 text-xs font-semibold text-[#694d00]">Phân loại: {med.category}</p>
              </div>
            </div>

            <div className="mt-3 rounded-md border-l-4 border-[#123c36] bg-[#f7faf8] p-3">
              <p className="text-xs font-semibold tracking-wide text-[#123c36]">GIỜ UỐNG SO VỚI BỮA ĂN</p>
              <p className="mt-1 text-sm text-neutral-900">{med.dosingNote}</p>
            </div>

            <div className="mt-3 rounded-md border-l-4 border-[#a77b10] bg-[#fff9e8] p-3">
              <p className="text-xs font-semibold tracking-wide text-[#694d00]">LƯU Ý DINH DƯỠNG</p>
              <p className="mt-1 text-sm text-neutral-900">{med.nutritionCaution}</p>
            </div>

            <div className="mt-3 rounded-md border-l-4 border-[#9f3f3f] bg-[#fff0f0] p-3">
              <p className="text-xs font-semibold tracking-wide text-[#6b1d1d]">THẬN TRỌNG / CHỐNG CHỈ ĐỊNH CHÍNH</p>
              <p className="mt-1 text-sm text-neutral-900">{med.otherCaution}</p>
            </div>

            <a href={med.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-[#123c36] underline underline-offset-2">
              Nguồn: {med.sourceLabel} ↗
            </a>
          </article>
        ))}
      </div>

      <section className="rounded-lg border-2 border-dashed border-[#7f948d] bg-[#f7faf8] p-5 text-sm text-neutral-900">
        <Link href="/tinh-khau-phan" className="inline-block rounded-md border-2 border-[#123c36] px-4 py-2 font-semibold text-[#123c36] hover:bg-white">
          ← Về phiếu tính khẩu phần
        </Link>
      </section>
    </div>
  );
}
