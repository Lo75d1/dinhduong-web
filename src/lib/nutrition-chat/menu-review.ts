import type { ResolvedMenu } from "./contracts";
import { aiFilled, AI_NUMBER_LEGEND, displayNumber, wholeVddDish } from "./presentation";
import { CLINICAL_TARGET_LABELS } from "./clinical";

const plain = (value: string) => value.replace(/[\r\n\t]+/g, " ").replace(/[\\`*_{}\[\]()<>#!|]/g, "\\$&");
/** Compact approval view of the exact normalized input signed by prepare_menu. */
export function nutritionMenuReview(menu: ResolvedMenu) {
  const rows = menu.days.flatMap(day => day.rows.map(row => ({ day, row })));
  const shown = rows.slice(0, 100);
  const lines = [`**Bản để duyệt: ${plain(menu.title)}**`, "", "| Ngày | Giờ / bữa | Món ăn | Thành phần | Lượng / suất | Số suất | Cơ sở | Nguồn |", "| --- | --- | --- | --- | ---: | ---: | --- | --- |"];
  if (menu.clinicalAssessment) {
    const { context, diet } = menu.clinicalAssessment;
    lines.splice(1, 0, ...(context.conditions?.length ? [`- Tình trạng đã cung cấp: ${context.conditions.map(plain).join("; ")}.`] : []), ...(context.notes ? [`- Thông tin/chỉ định đã cung cấp: ${plain(context.notes)}.`] : []),
      diet ? `- Mã chế độ ăn: **${plain(diet.code)} — ${plain(diet.name)}**; ${plain(CLINICAL_TARGET_LABELS[diet.targetGroup] || diet.targetGroup)} · ${plain(diet.diseaseGroup)}. ${context.selection === "proposed" ? "Mới đề xuất, chưa chốt" : context.selection === "prescribed" ? "Chỉ định do người dùng cung cấp" : "Người dùng chọn/xác nhận"}.` : "- Chưa chọn mã chế độ ăn; chưa đối chiếu bệnh lý.",
      ...(diet ? [`- Khoảng MCDA là tham khảo riêng; không thay mục tiêu cá nhân. Đọc ghi chú nguồn trước khi chốt mã.`] : []));
  }
  shown.forEach(({ day, row }, i) => {
    const previous = shown[i - 1];
    const whole = wholeVddDish(row);
    const dish = whole ? row.actualFoodName || row.food.name : row.dish;
    const previousDish = previous && (wholeVddDish(previous.row) ? previous.row.actualFoodName || previous.row.food.name : previous.row.dish);
    const same = previous?.day.id === day.id && previous.row.meal === row.meal && dish === previousDish && whole === wholeVddDish(previous.row);
    const time = row.mealTime ? `${aiFilled(row, "mealTime") ? "*" : ""}${row.mealTime} / ` : "";
    const basis = row.basis === "raw" ? "Mua vào" : row.basis === "cooked" ? "Chín → nguồn" : row.sourceState === "raw_clean" ? "Sống sạch" : row.sourceState === "cooked" ? "Chín" : "Theo nguồn";
    lines.push(`| ${previous?.day.id === day.id ? "" : plain(day.label)} | ${plain(time + row.meal)} | ${same ? "" : plain(dish)} | ${whole ? "—" : plain(row.actualFoodName || row.food.name)} | ${plain(displayNumber(row.quantity, aiFilled(row, "quantity")))} ${row.unit} | ${plain(displayNumber(row.servings, aiFilled(row, "servings")))} | ${basis} | ${plain(row.food.source.label.slice(0, 80) || "—")} |`);
  });
  lines.push("", AI_NUMBER_LEGEND);
  if (rows.length > shown.length) lines.push(`- Đang hiển thị ${shown.length}/${rows.length} dòng; chia kỳ để duyệt đủ, không coi phần chưa hiện là đã được duyệt.`);
  if (menu.missingInputs.length) lines.push(`- Cần bổ sung: ${[...new Set(menu.missingInputs.map(item => item.message))].slice(0, 5).map(plain).join("; ")}`);
  const critical = [...new Set(menu.warnings)].slice(0, 3);
  if (critical.length) lines.push(`- Cần xác minh: ${critical.map(plain).join("; ")}`);
  lines.push("- Xác nhận món, lượng, số suất và cơ sở tính ở bảng này. Khi đổi đầu vào, cần xem lại bản mới.");
  return { format: "markdown" as const, text: lines.join("\n"), rowCount: rows.length, shownRows: shown.length, truncated: rows.length > shown.length };
}
