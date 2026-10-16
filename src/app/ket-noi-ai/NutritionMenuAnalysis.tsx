import type { NutrientField } from "@/lib/nutrient-fields";
import type { ResolvedMenu } from "@/lib/nutrition-chat/contracts";
import { aiFilled, AI_NUMBER_LEGEND, displayNumber, wholeVddDish } from "@/lib/nutrition-chat/presentation";
import NutritionSurvey from "./NutritionSurvey";
import NutritionClinicalComparison from "./NutritionClinicalComparison";

type Metric = { value: number | null; incomplete: boolean; estimated?: boolean };
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c36]";
const labels = [
  { key: "energyKcal", label: "Năng lượng", unit: "kcal" },
  { key: "proteinG", label: "Chất đạm", unit: "g" },
  { key: "lipidG", label: "Chất béo", unit: "g" },
  { key: "glucidG", label: "Bột đường", unit: "g" },
];
function numeric(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "Chưa tính được" : value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}
function MetricGrid({ fields, metrics }: { fields: NutrientField[]; metrics: Record<string, Metric> }) {
  return <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{fields.map(field => {
    const metric = metrics[field.key];
    return <div key={field.key} className="rounded-lg bg-[#f1f6f4] p-3"><dt className="text-sm text-neutral-700">{field.label}</dt><dd className="mt-1 font-semibold">{numeric(metric?.value ?? null)}{metric?.value != null ? ` ${field.unit}` : ""}</dd>{metric?.incomplete ? <p className="mt-1 text-sm text-amber-800">Tổng chưa đầy đủ</p> : null}{metric?.estimated ? <p className="mt-1 text-sm text-neutral-700">Có phần ước tính</p> : null}</div>;
  })}</dl>;
}
function sourceUrl(value: string | undefined): string | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; }
}

/** Render server results only; no parallel browser calculation engine. */
export default function NutritionMenuAnalysis({ menu }: { menu: ResolvedMenu }) {
  const dataDays = menu.dayTotals.filter(day => day.hasData).length;
  const sources = [...new Map(menu.days.flatMap(day => day.rows).map(row => [row.food.id, row.food])).values()];
  const coreFields = labels.filter(field => menu.totals[field.key]);
  const otherFields = menu.fields.filter(field => !coreFields.some(core => core.key === field.key));
  return (
    <div className="mt-6 space-y-6 text-[#123c36]">
      {menu.clinicalAssessment ? <NutritionClinicalComparison assessment={menu.clinicalAssessment} /> : null}
      <section aria-label="Tổng dinh dưỡng khẩu phần">
        <h3 className="text-xl font-semibold">Tổng dinh dưỡng cả đợt</h3>
        <p className="mb-3 mt-1 text-sm text-neutral-700">{dataDays}/{menu.days.length} ngày có đầu vào. “Tổng chưa đầy đủ” chỉ cộng phần xác định được; ngày chưa nhập không tính như ngày ăn 0 kcal.</p>
        <MetricGrid fields={coreFields} metrics={menu.totals} />
        {otherFields.length ? <details className="mt-3 rounded-lg border border-[#dcebe5] p-3"><summary className={`cursor-pointer font-semibold ${focus}`}>Các chất đã chọn</summary><div className="mt-3"><MetricGrid fields={otherFields} metrics={menu.totals} /></div></details> : null}
        <p className="mt-3 text-sm text-neutral-700">Trung bình năng lượng/ngày có đầu vào: {numeric(menu.analysis.averageEnergyKcal)}{menu.analysis.averageEnergyKcal != null ? " kcal" : ""}{menu.totals.energyKcal?.incomplete ? " (chưa đầy đủ)" : ""}.</p>
      </section>

      <section aria-label="Phân tích theo ngày và bữa">
        <h3 className="text-xl font-semibold">Theo ngày và bữa</h3>
        <div className="mt-3 space-y-3">{menu.dayTotals.map(day => {
          const analysis = menu.analysis.days.find(item => item.dayId === day.id);
          return <details key={day.id} className="rounded-lg border border-[#b1c8bd] bg-white p-4"><summary className={`cursor-pointer font-semibold ${focus}`}>{day.label}{day.date ? ` (${day.date})` : ""}{!day.hasData ? " · Chưa có đầu vào" : ""}</summary><div className="mt-4 space-y-4"><MetricGrid fields={coreFields} metrics={day.totals} />{analysis?.meals.map(meal => <div key={meal.meal}><h4 className="mb-2 font-semibold">{meal.meal}</h4><MetricGrid fields={coreFields} metrics={meal.nutrients} /></div>)}</div></details>;
        })}</div>
      </section>

      {menu.analysis.dishes.length ? <section aria-label="Phân tích theo món"><h3 className="text-xl font-semibold">Theo món trong cả đợt</h3><div className="mt-3 space-y-3">{menu.analysis.dishes.map(dish => <details key={dish.dish} className="rounded-lg border border-[#dcebe5] bg-white p-3"><summary className={`cursor-pointer font-semibold ${focus}`}>{dish.dish} · {dish.appearances} lần xuất hiện</summary><div className="mt-3"><MetricGrid fields={coreFields} metrics={{ energyKcal: dish.energy, proteinG: dish.protein, lipidG: dish.lipid, glucidG: dish.glucid }} /></div></details>)}</div><p className="mt-2 text-sm text-neutral-700">Các dòng cùng tên món được gộp trong phần phân tích này; công thức và nguồn vẫn giữ theo từng dòng đầu vào.</p></section> : null}

      <section aria-label="Mục tiêu đối chiếu">
        <h3 className="text-xl font-semibold">Mục tiêu và nguồn</h3>
        {menu.targets.some(target => target.value !== null) ? <ul className="mt-3 space-y-2 text-sm text-neutral-700">{menu.targets.map(target => {
          const field = menu.fields.find(item => item.key === target.key) ?? labels.find(item => item.key === target.key);
          return <li key={target.key}><strong>{field?.label ?? target.key}:</strong> {target.isUpperLimit ? "Giới hạn trên " : "Mục tiêu "}{numeric(target.value)}{target.value !== null ? ` ${field?.unit ?? ""}/ngày` : ""}. Nguồn: {target.source || "Chưa có mục tiêu phù hợp"}.</li>;
        })}</ul> : <p className="mt-2 text-sm text-neutral-700">Chỉ tính thành phần. Chưa có mục tiêu nên không kết luận đạt, thiếu hay vượt nhu cầu.</p>}
      </section>

      <details className="rounded-lg border border-[#dcebe5] bg-white p-4"><summary className={`cursor-pointer font-semibold ${focus}`}>Nguồn của {sources.length} thực phẩm và phiên bản tính</summary><ul className="mt-3 space-y-2 text-sm text-neutral-700">{sources.map(food => {
        const url = sourceUrl(food.source.url);
        return <li key={food.id}><strong>{food.name}:</strong> {food.source.label || "Chưa có nguồn"}{!food.source.confirmed ? " · Nguồn chưa xác nhận" : ""}{url ? <a href={url} target="_blank" rel="noopener noreferrer" className={`ml-2 underline underline-offset-4 ${focus}`}>Xem nguồn</a> : null}</li>;
      })}</ul><dl className="mt-4 space-y-2 break-all text-sm text-neutral-700"><div><dt className="font-semibold">Phiên bản dữ liệu</dt><dd>{menu.dataVersion}</dd></div><div><dt className="font-semibold">Thời điểm tính</dt><dd>{new Date(menu.generatedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</dd></div></dl></details>
      {menu.aiComment ? <section className="rounded-lg border border-amber-300 bg-amber-50 p-4"><h3 className="font-semibold text-amber-900">Nhận xét AI tại thời điểm xuất</h3><p className="mt-2 whitespace-pre-wrap text-sm text-amber-900">{menu.aiComment}</p><p className="mt-2 text-sm text-amber-900">Nhận xét không tự viết lại sau khi sửa Excel; cần phân tích mới để cập nhật.</p></section> : null}
    </div>
  );
}

export function NutritionMenuInput({ menu }: { menu: ResolvedMenu }) {
  if (menu.mode === "recall24h") return <div className="mt-4"><NutritionSurvey menu={menu} /></div>;
  return <div className="mt-4 space-y-4">{menu.days.map(day => <section key={day.id} className="border border-neutral-300 p-3"><h3 className="font-semibold">{day.label}{day.date ? ` · ${day.date}` : ""}</h3><div className="mt-3 space-y-2">{day.rows.map((row, i) => {
    const whole = wholeVddDish(row), previous = day.rows[i - 1];
    const dish = whole ? row.actualFoodName || row.food.name : row.dish;
    const same = previous && previous.meal === row.meal && previous.dish === row.dish && !whole && !wholeVddDish(previous);
    const basis = row.basis === "raw" ? "Mua vào" : row.basis === "cooked" ? "Chín" : row.sourceState === "raw_clean" ? "Sống sạch" : "Ăn được";
    return <div key={row.id} className="border-t border-neutral-200 pt-2 text-sm">{same ? null : <p className="mb-1 font-semibold">{row.meal} · {dish}</p>}<p>{whole ? "Cả món" : row.actualFoodName || row.food.name}: {displayNumber(row.quantity, aiFilled(row, "quantity"))} {row.unit} × {displayNumber(row.servings, aiFilled(row, "servings"))} suất <span className="text-neutral-600">· {basis} · {row.food.source.label || "—"}</span></p></div>;
  })}</div></section>)}<p className="text-sm">{AI_NUMBER_LEGEND}</p></div>;
}
