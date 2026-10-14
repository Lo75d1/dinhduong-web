import assert from "node:assert/strict";
import { resolveMenu } from "../src/lib/nutrition-chat/core";
import { parseMenuInput } from "../src/lib/nutrition-chat/validation";
import { nutritionChatReport } from "../src/lib/nutrition-chat/chat-report";
import type { NutritionFood } from "../src/lib/nutrition-chat/contracts";

let checks = 0;
const contains = (text: string, expected: string) => { assert.ok(text.includes(expected), expected); checks++; };
const excludes = (text: string, unexpected: string) => { assert.ok(!text.includes(unexpected), unexpected); checks++; };
const equal = (actual: unknown, expected: unknown) => { assert.deepEqual(actual, expected); checks++; };
const food: NutritionFood = { id: "report-food", name: "Fixture", unit: "g", source: { kind: "catalog", label: "Fixture source", confirmed: true }, wastePercent: 0, foodGroup: "Rau", nutrients: { energyKcal: 100, proteinG: 10, lipidG: 2, glucidG: 20, fiberG: 0, sodiumMg: 30, calciumMg: 50, ironMg: 1, vitCMg: 5 } };
const row = { id: "r1", foodId: food.id, meal: "Sáng", dish: "Món fixture", quantity: 100, unit: "g", servings: 1, basis: "edible", recipeSource: { kind: "user", label: "Fixture" } };
const base = { title: "Báo cáo fixture", mode: "menu", comparison: { mode: "none" }, fields: ["energyKcal", "proteinG", "vitCMg"], days: [{ id: "d1", label: "Ngày 1", date: "2026-10-15", rows: [row] }] };
const menu = resolveMenu(parseMenuInput(base), [food]);
const before = JSON.stringify(menu), report = nutritionChatReport(menu), text = report.text;
equal(report.format, "markdown");
equal(JSON.stringify(menu), before); // Formatting must not modify the confirmed calculation/digest.
contains(text, "**100 kcal**");
contains(text, "| Đạm | 10 | 10 | 28,99 |"); // Macro denominator is 138, never the catalogue's 100 kcal.
contains(text, "| Béo | 2 | 2 | 13,04 |");
contains(text, "| Đường bột | 20 | 20 | 57,97 |");
contains(text, "4P + 9L + 4G");
contains(text, "| Chất xơ | 0 | g |"); // Source zero stays zero.
contains(text, "| Natri | 30 | mg |");
contains(text, "| Canxi | 50 | mg |");
contains(text, "| Sắt | 1 | mg |");
contains(text, "| Vitamin C | 5 | mg |");
contains(text, "Chưa có mục tiêu nhu cầu nên không kết luận đạt/thiếu/vượt");

const partialFood = { ...food, id: "missing", nutrients: { ...food.nutrients, energyKcal: null, lipidG: null, ironMg: null } };
const partial = nutritionChatReport(resolveMenu(parseMenuInput({ ...base, days: [{ ...base.days[0], rows: [row, { ...row, id: "r2", foodId: partialFood.id }] }] }), [food, partialFood])).text;
contains(partial, "100 (chưa đầy đủ)");
contains(partial, "| Đạm | 20 | 20 | — |");
contains(partial, "| Béo | 2 (chưa đầy đủ) | 2 (chưa đầy đủ) | — |");
contains(partial, "| Sắt | 1 (chưa đầy đủ) | mg |");
contains(partial, "| Ngày 1 (2026-10-15) | 100 (chưa đầy đủ) | 20 | 2 (chưa đầy đủ) | 40 | — / — / — |");

const zero = nutritionChatReport(resolveMenu(parseMenuInput({ ...base, days: [{ ...base.days[0], rows: [{ ...row, quantity: 0 }] }] }), [partialFood, food])).text;
contains(zero, "**0 kcal**");
contains(zero, "| Đạm | 0 | 0 | — |");
contains(zero, "| Ngày 1 (2026-10-15) | 0 | 0 | 0 | 0 | — / — / — |");
const empty = nutritionChatReport(resolveMenu(parseMenuInput({ ...base, days: [...base.days, { id: "d2", label: "Chưa nhập", date: "", rows: [] }] }), [food])).text;
contains(empty, "1/2 ngày có đầu vào, 1 ngày chưa nhập");
contains(empty, "Trung bình/ngày có đầu vào: **100 kcal**");
contains(empty, "| Chưa nhập · Chưa nhập | — | — | — | — | — / — / — |");

const targets = { mode: "manual", targets: [{ key: "energyKcal", value: 200, source: "Mục tiêu fixture" }, { key: "sodiumMg", value: 100, source: "Giới hạn fixture", isUpperLimit: true }, { key: "ironMg", value: 0, source: "Mốc 0" }] };
const compared = nutritionChatReport(resolveMenu(parseMenuInput({ ...base, comparison: targets, days: [...base.days, { ...base.days[0], id: "d2", label: "Ngày 2", rows: [{ ...row, id: "r2" }] }, { id: "d3", label: "Trống", date: "", rows: [] }] }), [food])).text;
contains(compared, "Tổng năng lượng cả kỳ: **200 kcal**");
contains(compared, "| Năng lượng | 100 kcal | 200 kcal | 50 | Mục tiêu fixture |");
contains(compared, "| Natri · Giới hạn trên | 30 mg | 100 mg | 30 | Giới hạn fixture |");
contains(compared, "| Sắt | 1 mg | 0 mg | — | Mốc 0 |");
contains(compared, "Mốc giới hạn trên không phải lượng cần ăn cho đủ");
const partialTarget = nutritionChatReport(resolveMenu(parseMenuInput({ ...base, comparison: targets, days: [{ ...base.days[0], rows: [row, { ...row, id: "r2", foodId: partialFood.id }] }] }), [food, partialFood])).text;
contains(partialTarget, "| Năng lượng | 100 kcal (chưa đầy đủ) | 200 kcal | — |");

const estimate = nutritionChatReport(resolveMenu(parseMenuInput({ ...base, days: [{ ...base.days[0], rows: [{ ...row, actualFoodName: "Tên thực tế", estimateAccepted: true }] }] }), [food])).text;
contains(estimate, "10 (ước tính)");
contains(estimate, "Tỷ lệ P–L–G có thành phần ước tính");
contains(estimate, "28,99 / 13,04 / 57,97 (ước tính)");
const unsafe = nutritionChatReport(resolveMenu(parseMenuInput({ ...base, title: "Tên | [lệnh](https://example.test)\n<h1>" }), [{ ...food, source: { ...food.source, label: "Nguồn | [lệnh](https://example.test)" } }])).text;
excludes(unsafe, "[lệnh](https://example.test)");
contains(unsafe, "\\| ");
contains(unsafe, "\\<h1\\>");
const sources = Array.from({ length: 7 }, (_, i) => ({ ...food, id: `f${i}`, source: { ...food.source, label: `Nguồn ${i}` } }));
const manySources = nutritionChatReport(resolveMenu(parseMenuInput({ ...base, days: [{ ...base.days[0], rows: sources.map((item, i) => ({ ...row, id: `r${i}`, foodId: item.id })) }] }), sources)).text;
contains(manySources, "còn 2 nguồn trong dữ liệu/Excel chi tiết");
console.log(`Nutrition chat report: ${checks} checks passed (pure fixture, no database).`);
