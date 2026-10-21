import Icon from "./ui/Icon";
import { NUTRITION_DATA_SOURCES, nutritionDataSource } from "@/lib/nutrition-data-sources";

export default function NutritionDataSources() {
  return (
    <details className="admin-help rounded-lg border border-[var(--line)] bg-white">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-2 font-semibold text-[var(--brand)]"><span className="flex items-center gap-2"><Icon name="book-open" />Nguồn dữ liệu &amp; cách đọc</span><span className="admin-help-toggle text-sm font-normal" aria-hidden="true" /></summary><div className="border-t border-[var(--line)] p-4"><h2 className="text-lg font-semibold text-[var(--brand)]">Nguồn dữ liệu dinh dưỡng</h2>
      <ul className="mt-3 grid gap-4 sm:grid-cols-3">
        {NUTRITION_DATA_SOURCES.map((source) => (
          <li key={source.id}>
            <a href={source.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--brand)] underline underline-offset-4">
              {source.title} ↗
            </a>
            <p className="mt-2 text-sm leading-6 text-neutral-800">{source.note}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-neutral-200 pt-3 text-xs leading-5 text-neutral-700">
        Các liên kết mở trang tra cứu chung của từng nguồn. Dùng tên, mã và nhãn nguồn trên bản ghi để đối chiếu; số liệu chưa có được giữ trống.
      </p>
    </div></details>
  );
}

export function NutritionRecordSource({ source, sourceCode, foodType }: {
  source: string;
  sourceCode: string | null;
  foodType?: string | null;
}) {
  const reference = nutritionDataSource(source, foodType);
  return (
    <div className="mt-3 text-sm text-neutral-800">
      <p>Nguồn dữ liệu: {source}{sourceCode ? ` · Mã nguồn: ${sourceCode}` : " · Chưa có mã nguồn"}.</p>
      {reference && <a href={reference.href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[var(--brand)] underline underline-offset-4">{reference.title} (trang tra cứu chung) ↗</a>}
    </div>
  );
}
