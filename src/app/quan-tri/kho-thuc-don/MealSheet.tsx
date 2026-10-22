import type { MenuLibraryDraft } from "@/lib/menu-library/contracts";
import { eatingContextLabel, mealEatingContext } from "@/lib/menu-library/contracts";
import type { LibraryAnalysis } from "@/lib/menu-library/analysis";
import { clinicalNumber, foodDisplayName } from "@/lib/menu-library/presentation";
import styles from "./clinical.module.css";

export type AnalysisSection = LibraryAnalysis["sections"][number];
type Day = MenuLibraryDraft["days"][number];
export default function MealSheet({ content, day, groupId, foods, section, pending, onEdit }: {
  content: MenuLibraryDraft; day?: Day; groupId: string;
  foods: { id: string; name: string; unit: string }[]; section?: AnalysisSection; pending?: boolean;
  onEdit?: (mealId: string) => void;
}) {
  return <div className={styles.mealSheet} aria-label="Bữa ăn, món ăn và thực phẩm">
    <div className={styles.sheetCaption}><h3>Thực đơn trong ngày</h3><span>Lượng sống sạch / suất · Gạo tính theo lượng khô</span></div>
    {!day?.meals.length && <p className={styles.empty}>Chưa có bữa ăn.</p>}
    {day?.meals.map((meal, index) => {
      const portion = meal.groupPortions.find(item => item.groupId === groupId);
      const totals = section?.meals.find(item => item.id === meal.id)?.totals;
      const energy = totals?.energyKcal;
      return <section key={meal.id} className={styles.meal} aria-label={`Bữa ${meal.label}`}>
        <header className={styles.mealHeader}><div><span className={styles.mealIndex}>{String(index + 1).padStart(2, "0")}</span><h4>{meal.label}</h4><span className={styles.mealContext}>{eatingContextLabel(mealEatingContext(content.eatingContext, meal.eatingContext))}</span></div><div><span className={styles.mealEnergy}>{pending ? "Đang tính…" : energy?.value != null ? `${clinicalNumber(energy.value)} kcal${energy.incomplete ? " · chưa đủ dữ liệu" : ""}` : "— kcal"}</span>{onEdit && <button type="button" className={styles.textButton} onClick={() => onEdit(meal.id)}>Chỉnh bữa</button>}</div></header>
        {!portion && <p className={styles.empty}>Bữa này chưa có khẩu phần cho nhóm đã chọn.</p>}
        {portion && !portion.dishes.length && <p className={styles.empty}>Chưa có món.</p>}
        {!!portion?.dishes.length && <table className={styles.foodTable}><caption className="sr-only">Món ăn và nguyên liệu bữa {meal.label}, một suất</caption><colgroup><col className={styles.dishColumn} /><col /><col className={styles.amountColumn} /></colgroup><thead><tr><th scope="col">Món ăn</th><th scope="col">Thực phẩm</th><th scope="col">Lượng</th></tr></thead>{portion.dishes.map(dish => <tbody key={dish.id}>
          {dish.ingredients.length ? dish.ingredients.map((ingredient, ii) => {
            const food = foods.find(item => item.id === ingredient.foodId);
            return <tr key={`${ingredient.foodId}-${ii}`}>
              {ii === 0 && <th scope="rowgroup" rowSpan={dish.ingredients.length} className={styles.dishName}>{dish.label}</th>}
              <td title={food?.name}>{foodDisplayName(food?.name ?? "Chưa đọc được tên thực phẩm")}</td>
              <td className={styles.quantity}>{clinicalNumber(ingredient.quantityPerPortion)} <span>{ingredient.unit}</span></td>
            </tr>;
          }) : <tr><th scope="rowgroup" className={styles.dishName}>{dish.label}</th><td colSpan={2}>Chưa có nguyên liệu.</td></tr>}
        </tbody>)}</table>}
      </section>;
    })}
  </div>;
}

export function NutritionSummary({ section, pending, error, editing }: { section?: AnalysisSection; pending: boolean; error?: string; editing: boolean }) {
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
      {metrics.map(item => <div key={item.key} className={item.className}><span>{item.label}</span><strong>{pending ? "—" : clinicalNumber(section?.macroPercent[item.key])}<small>%</small></strong><span>{pending ? "—" : clinicalNumber(section?.totals[item.key]?.value)} g</span></div>)}
    </div>
    {complete && !pending && <div className={styles.macroBar} aria-hidden="true">{metrics.map(item => <span key={item.key} className={item.className} style={{ flexGrow: section!.macroPercent[item.key]! }} />)}</div>}
    {error ? <p role="alert" className={styles.calculationError}>{error}</p> : !!missing?.length && !pending && <p className={styles.dataNotice}>{missing.length === 3 ? "P–L–G" : missing.map(item => item.label.slice(4)).join(", ")} chưa đủ số liệu. Số gram là phần đã biết; chi tiết ở dưới.</p>}
    {!!section?.missingInputs.length && !pending && <p className={styles.calculationError}>Cần xác minh cơ sở tính của {section.missingInputs.length} mục trước khi duyệt. Xem phân tích chi tiết bên dưới.</p>}
  </section>;
}
