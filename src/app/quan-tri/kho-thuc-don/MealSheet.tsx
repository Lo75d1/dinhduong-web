"use client";
import { useState } from "react";
import type { MenuLibraryDraft } from "@/lib/menu-library/contracts";
import { COOKING_METHOD_OPTIONS, TEXTURE_OPTIONS, eatingContextLabel, mealEatingContext } from "@/lib/menu-library/contracts";
import { contentReadiness } from "@/lib/menu-library/content-policy";
import type { LibraryAnalysis } from "@/lib/menu-library/analysis";
import { clinicalNumber, foodDisplayName } from "@/lib/menu-library/presentation";
import { ingredientQuantity, productionAmount } from "@/lib/menu-library/production";
import styles from "./clinical.module.css";

export type AnalysisSection = LibraryAnalysis["sections"][number];
type Day = MenuLibraryDraft["days"][number];
export default function MealSheet({ content, day, groupId, foods, section, pending, onEdit }: {
  content: MenuLibraryDraft; day?: Day; groupId: string;
  foods: { id: string; name: string; unit: string }[]; section?: AnalysisSection; pending?: boolean;
  onEdit?: (mealId: string) => void;
}) {
  const [mode, setMode] = useState("portion"), [count, setCount] = useState("");
  const n = /^\d+$/.test(count) && Number(count) >= 1 && Number(count) <= 100000 ? Number(count) : null;
  const hasFractions = day?.meals.some(meal => meal.groupPortions.find(portion => portion.groupId === groupId)?.dishes.some(dish => dish.ingredients.some(item => !Number.isInteger(item.quantityPerPortion))));
  const group = content.groups.find(group => group.id === groupId);
  const issues = contentReadiness(content, day?.id, groupId);
  return <div className={styles.mealSheet} aria-label="Bữa ăn, món ăn và thực phẩm">
    <div className={styles.sheetCaption}><h3>Thực đơn trong ngày</h3><span>Lượng sống sạch / suất · Gạo tính theo lượng khô</span></div>
    <section className={styles.instructions} aria-label="Lưu ý và khuyến nghị sử dụng"><h4>Lưu ý & khuyến nghị</h4>
      {group?.ageMonths && <p>Độ tuổi khai báo: {group.ageMonths.min}–{group.ageMonths.max} tháng.</p>}
      {group?.guidance?.notes.length ? <><strong>Lưu ý</strong><ul>{group.guidance.notes.map((text, i) => <li key={i}>{text}</li>)}</ul></> : <p>Chưa bổ sung lưu ý cho người ăn / người chăm sóc.</p>}
      {group?.guidance?.recommendations.length ? <><strong>Khuyến nghị</strong><ul>{group.guidance.recommendations.map((text, i) => <li key={i}>{text}</li>)}</ul></> : <p>Chưa bổ sung khuyến nghị sử dụng.</p>}
      {!!issues.length && <details><summary>Cần bổ sung {issues.length} mục trước khi duyệt</summary><ul>{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul></details>}
    </section>
    <div className={styles.contextBar}><label>Lượng chế biến <select value={mode} onChange={event => setMode(event.target.value)}><option value="portion">Một suất</option><option value="batch">Mẻ nấu</option></select></label>{mode === "batch" && <label>Số suất nấu<input aria-label="Số suất nấu" type="number" min="1" max="100000" step="1" value={count} onChange={event => setCount(event.target.value)} placeholder="Nhập số suất" /></label>}</div>
    {mode === "batch" ? <p className={styles.scopeNote}>Lượng cân mẻ được làm tròn đến 1 g/ml sau khi nhân số suất. Đây là lượng sống sạch, chưa phải lượng mua; số gốc một suất vẫn được giữ để phân tích. Khi chỉnh lượng thực nấu cần kiểm lại dinh dưỡng. {n === null ? "Nhập số suất để hiện lượng mẻ." : `Mẻ ${n} suất.`}</p> : hasFractions ? <p className={styles.dataNotice}>Bản cũ còn lượng lẻ dưới bước 1 g/ml. Cần cân chỉnh công thức một suất hoặc cân cho mẻ nấu; không tự làm tròn từng lượng gia vị lên 1 g.</p> : null}
    {!day?.meals.length && <p className={styles.empty}>Chưa có bữa ăn.</p>}
    {day?.meals.map((meal, index) => {
      const portion = meal.groupPortions.find(item => item.groupId === groupId);
      const totals = section?.meals.find(item => item.id === meal.id)?.totals;
      const energy = totals?.energyKcal;
      return <section key={meal.id} className={styles.meal} aria-label={`Bữa ${meal.label}`}>
        <header className={styles.mealHeader}><div><span className={styles.mealIndex}>{String(index + 1).padStart(2, "0")}</span><h4>{meal.label}</h4><span className={styles.mealContext}>{eatingContextLabel(mealEatingContext(content.eatingContext, meal.eatingContext))}</span></div><div><span className={styles.mealEnergy}>{pending ? "Đang tính…" : energy?.value != null ? `${clinicalNumber(energy.value)} kcal${energy.incomplete ? " · chưa đủ dữ liệu" : ""}` : "— kcal"}</span>{onEdit && <button type="button" className={styles.textButton} onClick={() => onEdit(meal.id)}>Chỉnh bữa</button>}</div></header>
        {!portion && <p className={styles.empty}>Bữa này chưa có khẩu phần cho nhóm đã chọn.</p>}
        {portion && !portion.dishes.length && <p className={styles.empty}>Chưa có món.</p>}
        {!!portion?.dishes.length && <table className={styles.foodTable}><caption className="sr-only">Món ăn và nguyên liệu bữa {meal.label}, {mode === "batch" ? n === null ? "chưa nhập số suất nấu" : `mẻ ${n} suất` : "một suất"}</caption><colgroup><col className={styles.dishColumn} /><col /><col className={styles.amountColumn} /></colgroup><thead><tr><th scope="col">Món ăn</th><th scope="col">Thực phẩm</th><th scope="col">{mode === "batch" ? "Lượng mẻ" : "Lượng / suất"}</th></tr></thead>{portion.dishes.map(dish => <tbody key={dish.id}>
          {dish.ingredients.length ? dish.ingredients.map((ingredient, ii) => {
            const food = foods.find(item => item.id === ingredient.foodId);
            return <tr key={`${ingredient.foodId}-${ii}`}>
              {ii === 0 && <th scope="rowgroup" rowSpan={dish.ingredients.length} className={styles.dishName}>{dish.label}</th>}
              <td title={food?.name}>{foodDisplayName(food?.name ?? "Chưa đọc được tên thực phẩm")}</td>
              <td className={styles.quantity}>{mode === "batch" ? n === null ? "—" : productionAmount(ingredient.quantityPerPortion, n)?.belowScale ? "Dưới 1" : ingredientQuantity(productionAmount(ingredient.quantityPerPortion, n)!.grams) : ingredientQuantity(ingredient.quantityPerPortion)} <span>{ingredient.unit}</span></td>
            </tr>;
          }) : <tr><th scope="rowgroup" className={styles.dishName}>{dish.label}</th><td colSpan={2}>Chưa có nguyên liệu.</td></tr>}
        </tbody>)}</table>}
        {portion?.dishes.map(dish => <section key={dish.id} className={styles.instructions} aria-label={`Chế biến ${dish.label}`}>
          <h5>{dish.label} · Cách chế biến</h5>
          <p>{COOKING_METHOD_OPTIONS.find(option => option.value === dish.preparation?.method)?.label ?? "Chưa có hình thức chế biến"} · Kết cấu: {TEXTURE_OPTIONS.find(option => option.value === dish.preparation?.texture)?.label ?? "Chưa bổ sung"}</p>
          {dish.preparation?.steps.length ? <ol>{dish.preparation.steps.map((step, i) => <li key={i}>{step}</li>)}</ol> : <p>Chưa bổ sung các bước chế biến.</p>}
          {dish.preparation?.notes.length ? <><strong>Lưu ý chế biến / phục vụ</strong><ul>{dish.preparation.notes.map((note, i) => <li key={i}>{note}</li>)}</ul></> : <p>Chưa bổ sung lưu ý chế biến / phục vụ.</p>}
        </section>)}
      </section>;
    })}
  </div>;
}

export function NutritionSummary({ section, pending, error, editing, collective = false }: { section?: AnalysisSection; pending: boolean; error?: string; editing: boolean; collective?: boolean }) {
  const metrics = [
    { key: "proteinG", label: "P · Đạm", className: styles.protein },
    { key: "lipidG", label: "L · Béo", className: styles.lipid },
    { key: "glucidG", label: "G · Bột đường", className: styles.glucid },
  ];
  const missing = section && metrics.filter(item => section.totals[item.key]?.incomplete);
  const complete = section && metrics.every(item => section.macroPercent[item.key] != null);
  const energy = section?.totals.energyKcal;
  return <section className={styles.nutrition} aria-label="Năng lượng và tỷ lệ P L G" aria-busy={pending}>
    <div className={styles.nutritionHeading} data-idle={!pending && !editing}><h3>Năng lượng & tỷ lệ P–L–G</h3><span role="status">{pending ? "Đang tính lại…" : editing ? "Theo lượng đang chỉnh · chưa lưu" : "Theo định lượng một suất"}</span></div>
    <div className={styles.nutritionGrid}>
      <div className={styles.energy}><span>Năng lượng</span><strong>{pending ? "—" : clinicalNumber(energy?.value)} <small>kcal</small></strong><span>{section?.targetEnergyKcal != null ? `Mục tiêu ${clinicalNumber(section.targetEnergyKcal)} kcal · ${pending ? "—" : clinicalNumber(section.energyPercent)}%` : "Chưa đặt mục tiêu thiết kế"}{energy?.incomplete ? " · Số liệu chưa đủ" : ""}</span></div>
      {metrics.map(item => <div key={item.key} className={item.className}><span>{item.label}</span><strong>{pending ? "—" : clinicalNumber(section?.macroPercent[item.key])}<small>%</small></strong><span>{pending ? "—" : clinicalNumber(section?.totals[item.key]?.value)} g</span>{section?.macroRecommendationRanges?.find(range => range.key === item.key)?.min != null && <span>Khuyến nghị {clinicalNumber(section.macroRecommendationRanges.find(range => range.key === item.key)?.min)}–{clinicalNumber(section.macroRecommendationRanges.find(range => range.key === item.key)?.max)}% năng lượng</span>}</div>)}
    </div>
    {complete && !pending && <div className={styles.macroBar} aria-hidden="true">{metrics.map(item => <span key={item.key} className={item.className} style={{ flexGrow: section!.macroPercent[item.key]! }} />)}</div>}
    {error ? <p role="alert" className={styles.calculationError}>{error}</p> : !!missing?.length && !pending && <p className={styles.dataNotice}>{missing.length === 3 ? "P–L–G" : missing.map(item => item.label.slice(4)).join(", ")} chưa đủ số liệu. Số gram là phần đã biết; chi tiết ở dưới.</p>}
    {!!section?.missingInputs.length && !pending && <p className={styles.calculationError}>Cần xác minh cơ sở tính của {section.missingInputs.length} mục trước khi duyệt. Xem phân tích chi tiết bên dưới.</p>}
    <section className={styles.instructions} aria-label="Tổng lượng và phần trăm đáp ứng khuyến nghị"><h4>Tổng lượng & % đáp ứng khuyến nghị ngày</h4>
      <p>{collective ? "Một suất · các bữa phục vụ đã khai báo" : "Một người · các bữa của ngày đang xem"}</p>
      {!section?.recommendationCoverage?.some(ref => ref.target !== null) && <p>Chọn hồ sơ đối chiếu trong phần chỉnh sửa để áp dụng bảng khuyến nghị dinh dưỡng sẵn có; hoặc nhập mốc có nguồn.</p>}
      {!!section?.recommendationCoverage?.length && <div className={styles.tableScroll}><table className={styles.detailTable}><thead><tr><th>Thành phần</th><th>Tổng lượng hiện có</th><th>Khuyến nghị / ngày</th><th>% đáp ứng</th></tr></thead><tbody>{section.recommendationCoverage.map(ref => <tr key={ref.nutrient}><th scope="row">{ref.label} ({ref.unit})</th><td>{pending ? "—" : clinicalNumber(ref.total)}{!pending && ref.partial && ref.total !== null ? " *" : ""}</td><td>{clinicalNumber(ref.target)}{ref.isUpperLimit ? " · tối đa" : ""}</td><td>{pending ? "—" : clinicalNumber(ref.percent)}{ref.percent !== null ? "%" : ""}{!pending && ref.partial && ref.percent !== null ? " *" : ""}{ref.isUpperLimit ? " giới hạn" : ""}</td></tr>)}</tbody></table></div>}
      <p className={styles.scopeNote}>* Tính trên phần thực phẩm đã có số liệu; tổng và % thực tế có thể cao hơn. Dưới 100% vẫn hiển thị. Chưa có lượng hoặc mốc áp dụng thì hiện —.</p>
      {!!section?.recommendationCoverage?.some(ref => ref.source) && <details><summary>Mốc khuyến nghị đang áp dụng</summary><ul>{section.recommendationCoverage.filter(ref => ref.source).map(ref => <li key={ref.nutrient}>{ref.label}: {ref.source}</li>)}</ul></details>}
    </section>
  </section>;
}
