import assert from "node:assert/strict";
import { EMPTY_CLASSIFY } from "../src/lib/food-classify";
import { dayMealsOrdered, reorderMealsInRows, type MenuDay } from "../src/app/tinh-khau-phan/multi-day";
import { analyzeMenuPeriod, buildPeriodShoppingList, strictNutrientTotal } from "../src/app/tinh-khau-phan/multi-day-analysis";
import { buildMultiDayExcelXml, buildMultiDayWordHtml } from "../src/app/tinh-khau-phan/multi-day-export";
import type { Profile } from "../src/app/tinh-khau-phan/PersonalProfile";
import type { RecommendationRow } from "../src/app/tinh-khau-phan/matchRecommendation";
import type { Row } from "../src/app/tinh-khau-phan/types";

function row(uid: string, meal: string, dish: string, foodId: string, kcal: number | null, group: string | null, waste: number | null): Row {
  return {
    uid, meal, dish, foodId, foodName: foodId, grams: 100, inputGrams: 100,
    inputBasis: "edible", conversionFactor: 1, wastePercent: waste, note: "",
    nutrients: { energyKcal: kcal, proteinG: 10, lipidG: 5, glucidG: 20, fiberG: 5, sodiumMg: 100 },
    classify: { ...EMPTY_CLASSIFY, foodGroup: group },
  };
}

const rows = [
  row("1", "Tối", "Canh", "rau", 50, "Rau", 10),
  row("2", "Sáng", "Cơm", "gao", 350, "Ngũ cốc", 0),
  row("3", "Trưa", "Cá", "ca", 200, "Thịt cá trứng", 20),
];
const day: MenuDay = { id: "d1", label: "Ngày 1", date: "2026-08-08", rows };

assert.deepEqual(dayMealsOrdered(day).map((meal) => meal.meal), ["Tối", "Sáng", "Trưa"]);
assert.deepEqual(reorderMealsInRows(rows, "Tối", "Trưa").map((item) => item.meal), ["Sáng", "Trưa", "Tối"]);
assert.equal(strictNutrientTotal(rows, "energyKcal").value, 600);
assert.equal(strictNutrientTotal([...rows, row("4", "Tối", "Canh", "unknown", null, null, null)], "energyKcal").value, null);

const profile: Profile = {
  age: "30", ageUnit: "tuoi", gender: "Nam", height: "170", weight: "65",
  activityLevel: "light", physiology: "normal", pregnancyWeek: "", prePregnancyWeight: "", pregnancyNote: "",
};
const recommendation = { id: "r1", stt: 1, ageGroup: "30-49 tuổi", gender: "Nam", energyKcal: 600, referenceWeightKg: 65, physicalActivity: "Nhẹ", proteinMinPct: 13, proteinMaxPct: 20, lipidMinPct: 20, lipidMaxPct: 30, glucidMinPct: 55, glucidMaxPct: 65 } satisfies RecommendationRow;
const emptyDay: MenuDay = { id: "d2", label: "Ngày trống", date: "", rows: [] };
const secondDay: MenuDay = {
  id: "d3",
  label: "Ngày 2",
  date: "2026-08-09",
  rows: [row("5", "Sáng", "Cơm", "gao", 300, "Ngũ cốc", 0)],
};
const recommendationWithMicros = { ...recommendation, fiber: 25, sodium: 2000 } satisfies RecommendationRow;
const analysis = analyzeMenuPeriod([day, secondDay, emptyDay], profile, [recommendationWithMicros], { Tối: 30, Sáng: 30, Trưa: 40 });
assert.equal(analysis.days[0].status, "dat");
assert.equal(analysis.days[0].meals.find((meal) => meal.meal === "Trưa")?.targetKcal, 240);
assert.equal(analysis.days[0].foodGroupCount, 3);
assert.equal(analysis.calendarDayCount, 3);
assert.equal(analysis.dataDayCount, 2);
assert.equal(analysis.emptyDayCount, 1);
assert.equal(analysis.totalEnergy.value, 900);
assert.equal(analysis.targetPeriodKcal, 1200);
assert.equal(analysis.periodGapKcal, -300);
assert.equal(analysis.averageGapKcal, -150);
assert.equal(analysis.lowDays, 1);
assert.equal(analysis.achievedDays, 1);
assert.equal(analysis.mealAggregates.find((meal) => meal.meal === "Trưa")?.energy.value, 200);
assert.equal(analysis.mealAggregates.find((meal) => meal.meal === "Trưa")?.targetPeriodKcal, 480);
assert.equal(analysis.dishes.length, 3);
assert.equal(analysis.dishes.find((item) => item.dish === "Cơm")?.appearances, 2);
assert.equal(analysis.nutrients.find((item) => item.key === "fiberG")?.total.value, 20);
assert.equal(analysis.nutrients.find((item) => item.key === "fiberG")?.percentOfTarget, 40);
assert.equal(analysis.macros.find((item) => item.key === "proteinG")?.grams.value, 40);
assert.ok(analysis.recommendations.length > 0);

const shopping = buildPeriodShoppingList([day]);
assert.equal(shopping.find((item) => item.foodId === "rau")?.rawGrams, 100 / 0.9);
const unknownShopping = buildPeriodShoppingList([{ ...day, rows: [row("4", "Tối", "Canh", "unknown", 10, "Rau", null)] }]);
assert.equal(unknownShopping[0].rawGrams, null);

const excel = buildMultiDayExcelXml([day, secondDay, emptyDay], analysis, shopping, profile);
assert.match(excel, /Worksheet ss:Name="Tổng quan kỳ"/);
assert.match(excel, /Worksheet ss:Name="Theo ngày"/);
assert.match(excel, /Worksheet ss:Name="Theo bữa"/);
assert.match(excel, /Worksheet ss:Name="Theo món"/);
assert.match(excel, /Worksheet ss:Name="Vi chất - nhóm TP"/);
assert.match(excel, /Worksheet ss:Name="Chi tiết thực đơn"/);
assert.match(excel, /Worksheet ss:Name="Đi chợ gộp"/);
assert.match(excel, /Worksheet ss:Name="Khuyến nghị"/);
assert.doesNotMatch(excel, /NaN|undefined/);
const word = buildMultiDayWordHtml([day, secondDay, emptyDay], analysis, shopping, profile);
assert.match(word, /KHUYẾN NGHỊ TOÀN KỲ/);
assert.match(word, /VI CHẤT &amp; KHOÁNG CHẤT/);
assert.match(word, /BẢNG ĐI CHỢ GỘP TOÀN KỲ/);
assert.doesNotMatch(word, /NaN|undefined/);

console.log("multi-day analysis tests passed");
