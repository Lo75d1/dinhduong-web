import { ALL_NUTRIENT_FIELDS, CORE_CALC_FIELDS } from "@/lib/nutrient-fields";
import type { NutrientTotal, ResolvedMenu } from "./contracts";

const macroKeys = ["proteinG", "lipidG", "glucidG"] as const;
const basicKeys = ["fiberG", "sodiumMg", "calciumMg", "ironMg"];
const number = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "—" : value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const plain = (value: string) => value.replace(/[\r\n\t]+/g, " ").replace(/[\\`*_{}\[\]()<>#!|]/g, "\\$&");
const metric = (value: NutrientTotal | undefined) => `${number(value?.value)}${value?.incomplete ? " (chưa đầy đủ)" : ""}${value?.estimated ? " (ước tính)" : ""}`;

/** Presentation of existing server results; never replaces the nutrient engine. */
export function nutritionChatReport(menu: ResolvedMenu) {
  const { analysis } = menu;
  const lines = [
    `**Báo cáo dinh dưỡng: ${plain(menu.title)}**`,
    `- Phạm vi: ${menu.mode === "recall24h" ? "Ghi lại ăn 24 giờ" : "Thực đơn"}; ${analysis.dataDayCount}/${analysis.calendarDayCount} ngày có đầu vào, ${analysis.emptyDayCount} ngày chưa nhập. Ngày chưa nhập không tính là ăn 0 kcal.`,
    `- Tổng năng lượng cả kỳ: **${metric(menu.totals.energyKcal)} kcal**. Trung bình/ngày có đầu vào: **${number(analysis.averageEnergyKcal)} kcal**${menu.totals.energyKcal?.incomplete ? " (chưa đầy đủ)" : ""}.`,
    "",
    "| Chất chính | Tổng cả kỳ (g) | Trung bình/ngày (g) | Tỷ lệ năng lượng P–L–G (%) |",
    "| --- | ---: | ---: | ---: |",
  ];
  for (const key of macroKeys) {
    const macro = analysis.macros.find(item => item.key === key);
    const label = CORE_CALC_FIELDS.find(field => field.key === key)!.label;
    lines.push(`| ${label} | ${metric(menu.totals[key])} | ${number(macro?.averageGramsPerDay)}${menu.totals[key]?.incomplete ? " (chưa đầy đủ)" : ""} | ${number(macro?.energySharePct)} |`);
  }
  lines.push("", "- Tỷ lệ P–L–G là phân bố năng lượng của ba chất theo 4P + 9L + 4G, không phải tỷ lệ khối lượng. Năng lượng từ bảng nguồn có thể khác tổng quy đổi này; không thay số năng lượng của nguồn. Thiếu một trong ba chất hoặc tổng quy đổi bằng 0 thì tỷ lệ để —.");
  if (macroKeys.some(key => menu.totals[key]?.estimated)) lines.push("- Tỷ lệ P–L–G có thành phần ước tính đã được người dùng chấp nhận.");
  const fields = ALL_NUTRIENT_FIELDS.filter(field => basicKeys.includes(field.key) || menu.fields.some(selected => selected.key === field.key) && !["energyKcal", ...macroKeys].includes(field.key));
  lines.push("", "| Chỉ số bổ sung | Tổng cả kỳ | Đơn vị |", "| --- | ---: | --- |");
  for (const field of fields) lines.push(`| ${field.label} | ${metric(menu.totals[field.key])} | ${field.unit} |`);
  lines.push("", "| Ngày | Năng lượng (kcal) | Đạm (g) | Béo (g) | Bột đường (g) | P–L–G (%) |", "| --- | ---: | ---: | ---: | ---: | --- |");
  for (const day of menu.dayTotals) {
    const dayAnalysis = analysis.days.find(item => item.dayId === day.id);
    const completeMacros = day.hasData && macroKeys.every(key => day.totals[key]?.value != null && !day.totals[key].incomplete);
    const shares = macroKeys.map(key => number(completeMacros ? dayAnalysis?.macroEnergyShare[key] : null)).join(" / ");
    lines.push(`| ${plain(day.label)}${day.date ? ` (${plain(day.date)})` : ""}${!day.hasData ? " · Chưa nhập" : ""} | ${metric(day.totals.energyKcal)} | ${macroKeys.map(key => metric(day.totals[key])).join(" | ")} | ${shares}${macroKeys.some(key => day.totals[key]?.estimated) ? " (ước tính)" : ""} |`);
  }
  const targets = menu.targets.filter(target => target.value != null);
  if (!targets.length) lines.push("", "- Chỉ tính thành phần. Chưa có mục tiêu nhu cầu nên không kết luận đạt/thiếu/vượt.");
  else {
    lines.push("", "| Đối chiếu | Trung bình/ngày có đầu vào | Mốc/ngày | So với mốc (%) | Nguồn mốc |", "| --- | ---: | ---: | ---: | --- |");
    for (const target of targets) {
      const field = ALL_NUTRIENT_FIELDS.find(item => item.key === target.key);
      const total = menu.totals[target.key];
      const average = total?.value != null && analysis.dataDayCount ? total.value / analysis.dataDayCount : null;
      const percent = !total?.incomplete && average != null && target.value! > 0 ? average / target.value! * 100 : null;
      lines.push(`| ${field?.label ?? plain(target.key)}${target.isUpperLimit ? " · Giới hạn trên" : ""} | ${number(average)} ${field?.unit ?? ""}${total?.incomplete ? " (chưa đầy đủ)" : ""}${total?.estimated ? " (ước tính)" : ""} | ${number(target.value)} ${field?.unit ?? ""} | ${number(percent)} | ${plain(target.source || "Chưa có nguồn")} |`);
    }
    lines.push("", "- Chỉ đối chiếu tỷ lệ khi số liệu đủ và mốc lớn hơn 0. Mốc giới hạn trên không phải lượng cần ăn cho đủ; không diễn giải % đó thành mức đáp ứng nhu cầu.");
  }
  const sources = [...new Set(menu.days.flatMap(day => day.rows.map(row => `${row.food.source.label || "Chưa có nguồn"}${!row.food.source.confirmed ? " (chưa xác nhận)" : ""}`)))];
  const missing = Object.values(menu.totals).filter(total => total.incomplete).length;
  lines.push("", `- Dữ liệu: ${missing} chỉ số có tổng chưa đầy đủ; ${menu.missingInputs.length} thông tin đầu vào còn thiếu. — là chưa tính được, khác với số 0 có nguồn.`, `- Nguồn số liệu: ${sources.slice(0, 5).map(plain).join("; ") || "Chưa có đầu vào"}${sources.length > 5 ? `; còn ${sources.length - 5} nguồn trong dữ liệu/Excel chi tiết` : ""}.`);
  for (const warning of menu.warnings.slice(0, 5)) lines.push(`- Lưu ý: ${plain(warning)}`);
  if (menu.warnings.length > 5) lines.push(`- Còn ${menu.warnings.length - 5} lưu ý trong dữ liệu/Excel chi tiết.`);
  return { format: "markdown" as const, text: lines.join("\n") };
}
