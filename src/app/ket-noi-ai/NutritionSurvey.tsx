import type { ResolvedMenu } from "@/lib/nutrition-chat/contracts";
import { aiFilled, AI_NUMBER_LEGEND, displayNumber, recallAmounts, RECALL_HEADERS, RECALL_ENERGY_HEADERS, standaloneVddDish } from "@/lib/nutrition-chat/presentation";

const cell = "border border-neutral-400 px-2 py-2 align-top";
/** The two appendix layouts share the resolved input and calculator used by chat. */
export default function NutritionSurvey({ menu }: { menu: ResolvedMenu }) {
  return <div className="space-y-6 text-neutral-950">{menu.days.map(day => {
    const rawRows = day.rows.filter(row => recallAmounts(row).rawCleanGrams !== null);
    const rows = day.rows.map((row, i) => {
      const amount = recallAmounts(row), previous = day.rows[i - 1];
      const whole = standaloneVddDish(row), dish = whole ? row.actualFoodName || row.food.name : row.dish;
      const previousDish = previous && (standaloneVddDish(previous) ? previous.actualFoodName || previous.food.name : previous.dish);
      const same = previous && previous.meal === row.meal && previousDish === dish && whole === standaloneVddDish(previous);
      const markAmount = aiFilled(row, "quantity") || aiFilled(row, "servings") || aiFilled(row, "densityGPerMl");
      const values = [row.mealTime ? `${aiFilled(row, "mealTime") ? "*" : ""}${row.mealTime}` : "—", row.meal, same ? "" : dish, whole ? "—" : row.actualFoodName || row.food.name, row.householdMeasure ? `${aiFilled(row, "householdMeasure") ? "*" : ""}${row.householdMeasure}` : "—", displayNumber(amount.cookedGrams, markAmount), displayNumber(amount.conversionFactor, aiFilled(row, "conversionFactor")), displayNumber(amount.rawCleanGrams, markAmount || aiFilled(row, "conversionFactor")), whole ? "Cả món · VDD" : row.food.source.label || "—"];
      return { row, dish, values };
    });
    return <section key={day.id} className="space-y-4">
      <h3 className="text-xl font-semibold">Phiếu điều tra hỏi ghi khẩu phần 24h</h3>
      <p>{day.label}{day.date ? ` · Ngày ăn: ${day.date}` : ""}</p>
      <p className="text-sm">Họ và tên: ____________________ · Giới tính: {menu.input.profile?.gender || "____"}<br />Ngày sinh: ____ / ____ / ______ · Ngày điều tra: ____ / ____ / ______</p>
      <div className="hidden overflow-x-auto md:block print:block"><table className="w-full border-collapse text-sm"><thead><tr>{RECALL_HEADERS.map(header => <th key={header} className={`${cell} whitespace-pre-line text-center`}>{header}</th>)}</tr></thead><tbody>{rows.map(({ row, values }) => <tr key={row.id}>{values.map((value, i) => <td key={i} className={`${cell} ${i >= 5 && i <= 7 ? "text-right tabular-nums" : ""}`}>{value}</td>)}</tr>)}</tbody></table></div>
      <div className="space-y-3 md:hidden print:hidden">{rows.map(({ row, dish, values }) => <article key={row.id} className="border border-neutral-400 p-3"><h4 className="font-semibold">{row.meal} · {dish}</h4><dl className="mt-2 space-y-1 text-sm">{values.map((value, i) => i !== 1 && i !== 2 && value !== "" ? <div key={i}><dt className="inline font-medium">{RECALL_HEADERS[i].replaceAll("\n", " ")}: </dt><dd className="inline">{value}</dd></div> : null)}</dl></article>)}</div>
      <p className="text-sm">{AI_NUMBER_LEGEND}</p>
      <details className="border border-neutral-300 p-3"><summary className="cursor-pointer font-semibold">Bảng quy đổi năng lượng và thành phần dinh dưỡng</summary><p className="mt-2 text-sm">Chỉ các dòng đã xác nhận cơ sở sống sạch. Tổng toàn bộ khẩu phần ở phần phân tích.</p>
        {rawRows.length ? <div className="mt-3 overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr>{RECALL_ENERGY_HEADERS.map(header => <th key={header} className={`${cell} text-center`}>{header}</th>)}</tr></thead><tbody>{rawRows.map((row, i) => <tr key={row.id}><td className={cell}>{i + 1}</td><td className={cell}>{row.actualFoodName || row.food.name}</td><td className={`${cell} text-right`}>{displayNumber(recallAmounts(row).rawCleanGrams, ["quantity", "servings", "conversionFactor", "densityGPerMl"].some(field => aiFilled(row, field)))}</td>{["energyKcal", "proteinG", "lipidG", "glucidG"].map(key => <td key={key} className={`${cell} text-right`}>{displayNumber(row.referenceAmount !== null && row.food.nutrients[key] != null ? row.referenceAmount * row.food.nutrients[key]! / 100 : null)}</td>)}</tr>)}</tbody></table></div> : <p className="mt-2 text-sm">Chưa có dòng xác nhận sống sạch; không tự quy đổi từ món chín.</p>}
      </details>
    </section>;
  })}</div>;
}
