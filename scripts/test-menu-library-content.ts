import assert from "node:assert/strict";
import { PRIMARY_SCHOOL_DRAFT } from "../src/lib/menu-library/contracts";
import { validateMenuLibraryDraft } from "../src/lib/menu-library/validation";
import { contentReadiness, hasReferenceProfileInputs, librarySection, tidyInstructions } from "../src/lib/menu-library/content-policy";
import { analyzeLibraryDraft } from "../src/lib/menu-library/analysis";
import type { RecommendationRow } from "../src/app/tinh-khau-phan/matchRecommendation";
import type { NutritionFood } from "../src/lib/nutrition-chat/contracts";

const draft = structuredClone(PRIMARY_SCHOOL_DRAFT);
draft.schemaVersion = "1.2.0";
draft.groups = [{ ...draft.groups[0], schoolLevel: null, lifeStage: "adult", guidance: { notes: ["Lưu ý kiểm thử"], recommendations: ["Khuyến nghị kiểm thử"] },
  recommendationProfile: { age: "30", ageUnit: "tuoi", gender: "Nữ", activityLevel: "moderate", physiology: "normal", weight: "50", height: "160", pregnancyWeek: "", prePregnancyWeight: "", pregnancyNote: "" } }];
draft.direction = "individual"; draft.unit = null; draft.librarySection = "individual";
draft.days[0].meals = [{ id: "lunch", code: "lunch", label: "Trưa", groupPortions: [{ groupId: draft.groups[0].id, headcount: null, mealRuleIds: [], dishes: [{
  id: "dish", label: "Món kiểm thử", sourceKind: "manual", recipeId: null,
  preparation: { method: "steam", texture: "soft", steps: ["Bước kiểm thử"], notes: ["Lưu ý kiểm thử"] },
  ingredients: [{ foodId: "a", quantityPerPortion: 100, unit: "g", basis: "edible_raw", edibleFraction: null, cookingYield: null }, { foodId: "b", quantityPerPortion: 100, unit: "g", basis: "edible_raw", edibleFraction: null, cookingYield: null }],
}] }] }];
const rec = (id: string, gender: string, activity: string, calcium: number): RecommendationRow => ({ id, stt: 1, ageGroup: "19-30 tuổi", gender, physicalActivity: activity, referenceWeightKg: null, energyKcal: 2000, proteinMinPct: .15, proteinMaxPct: .2, lipidMinPct: .2, lipidMaxPct: .3, glucidMinPct: .5, glucidMaxPct: .65, calcium, sodium: 2000 });
const recommendations = [rec("wrong-sex", "Nam", "Trung bình", 700), rec("wrong-activity", "Nữ", "Nhẹ", 800), rec("matched", "Nữ", "Trung bình", 1000)];
const food = (id: string, calciumMg: number | null): NutritionFood => ({ id, name: id, unit: "g", source: { kind: "catalog", label: "RNI", confirmed: true }, wastePercent: null, foodGroup: null, nutrients: { energyKcal: 200, proteinG: 10, lipidG: 5, glucidG: 30, calciumMg, sodiumMg: 100 } });
assert.deepEqual(validateMenuLibraryDraft(draft), draft);
assert.deepEqual(contentReadiness(draft), []);
assert.equal(hasReferenceProfileInputs(draft.groups[0].recommendationProfile), true);
assert.equal(hasReferenceProfileInputs({ ...draft.groups[0].recommendationProfile!, ageUnit: "" as "tuoi" }), false);
const analysis = analyzeLibraryDraft(draft, [food("a", 250), food("b", null)], recommendations);
const section = analysis.sections[0];
assert.equal(section.recommendationSnapshot.recommendation?.id, "matched");
const calcium = section.recommendationCoverage.find(row => row.nutrient === "calciumMg")!;
assert.equal(calcium.total, 250); assert.equal(calcium.target, 1000); assert.equal(calcium.percent, 25); assert.equal(calcium.partial, true);
assert.match(calcium.source!, /matched/);
assert.equal(section.recommendationCoverage.find(row => row.nutrient === "energyKcal")!.percent, 20, "Lunch-only coverage uses the daily denominator, without scaling to 100%");
assert.equal(section.recommendationCoverage.find(row => row.nutrient === "sodiumMg")!.isUpperLimit, true);
assert.equal(section.recommendationCoverage.find(row => row.nutrient === "ironMg")!.percent, null, "No target or food data is not zero");
assert.equal(analysis.canApprove, true, "Under 100% and partial micronutrients are not failed menu criteria");
const changed = structuredClone(recommendations); changed[2].calcium = 1200;
assert.notEqual(analyzeLibraryDraft(draft, [food("a", 250), food("b", null)], changed).digest, analysis.digest, "Recommendation changes invalidate review preview");
const legacy = structuredClone(draft); delete legacy.groups[0].guidance; delete legacy.days[0].meals[0].groupPortions[0].dishes[0].preparation;
assert.ok(validateMenuLibraryDraft(legacy)); assert.equal(analyzeLibraryDraft(legacy, [food("a", 250), food("b", null)]).canApprove, false);
const archived = structuredClone(draft); archived.availability = { state: "archived", reason: "Rà soát nội dung" };
assert.ok(validateMenuLibraryDraft(archived)); assert.equal(analyzeLibraryDraft(archived, [food("a", 250), food("b", null)], recommendations).canApprove, false);
archived.availability.reason = null; assert.throws(() => validateMenuLibraryDraft(archived));
const infant = structuredClone(draft); infant.groups[0].lifeStage = "complementary_feeding";
assert.ok(contentReadiness(infant).some(issue => issue.includes("tháng")));
infant.groups[0].ageMonths = { min: 8, max: 6 }; assert.throws(() => validateMenuLibraryDraft(infant));
const badProfile = structuredClone(draft); badProfile.groups[0].recommendationProfile!.weight = "-1"; assert.throws(() => validateMenuLibraryDraft(badProfile));
const lines = structuredClone(draft); lines.groups[0].guidance!.notes = [" ", " Một ý "]; assert.deepEqual(tidyInstructions(lines).groups[0].guidance!.notes, ["Một ý"]);
const hospital = { ...draft, id: "hospital-patient-bt01-1600-7d-v1" }; delete hospital.librarySection;
assert.equal(librarySection(hospital), "hospital");
assert.equal(librarySection({ ...draft, title: "Bệnh viện chỉ là chữ trong tên" }), "individual", "Titles never guess category");
console.log("Content: schema roundtrip, readiness, reversible archive, shared age labels and existing RNI profile matching / partial coverage passed (synthetic data).");
