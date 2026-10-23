import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { dailyCatalogQuery } from "../src/lib/menu-library/daily-catalog-query";
import { EMPTY_DAILY_FILTERS, validDailyFilters, type DailyFilters } from "../src/lib/menu-library/daily-catalog";
import { changedFractionalQuantity, productionAmount } from "../src/lib/menu-library/production";
import { PRIMARY_SCHOOL_DRAFT } from "../src/lib/menu-library/contracts";

async function main() {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE menu_library_templates (id text, title text, direction text, revision int, "updatedAt" timestamptz, document jsonb);
      CREATE TABLE menu_library_reviews (id text, "templateId" text, revision int, decision text, "createdAt" timestamptz);
      CREATE TABLE diet_codes (id text, code text, name text); INSERT INTO diet_codes VALUES ('diet-a','DD01-X','Đái tháo đường'),('diet-b','TM01-X','Tăng huyết áp');`);
    const draft = structuredClone(PRIMARY_SCHOOL_DRAFT);
    draft.groups = [draft.groups[0], { ...draft.groups[0], id: "high", designEnergyKcal: 2100, dietCode: "diet-b" }];
    draft.groups[0] = { ...draft.groups[0], designEnergyKcal: 1600, dietCode: "diet-a" };
    const portion = (id: string, label: string) => ({ groupId: id, headcount: null, mealRuleIds: [], dishes: [{ id: "dish", label, sourceKind: "ai" as const, recipeId: null, ingredients: [{ foodId: "salt", quantityPerPortion: .25, unit: "g" as const, basis: "edible_raw" as const, edibleFraction: null, cookingYield: null }] }] });
    draft.coverage = "served_meals";
    draft.days = [1,2].map(dayIndex => ({ id: `day-${dayIndex}`, dayIndex, date: null, meals: [{ id: `lunch-${dayIndex}`, code: "lunch", label: "Trưa", eatingContext: null, groupPortions: [portion(draft.groups[0].id, dayIndex === 2 ? "Cá kho đặc biệt" : "Thịt hấp"), portion("high", "Đậu phụ")] }] }));
    draft.unit = { id: "school", label: "Trường kiểm thử", type: "school" };
    await db.query('INSERT INTO menu_library_templates VALUES ($1,$2,$3,$4,$5,$6)', ["multi", "Bộ tuần", "collective", 2, "2026-10-21T00:00:00Z", JSON.stringify(draft)]);
    // More than a first page of templates: filters must still find the older day above.
    for (let i=0;i<26;i++) {
      const one = { ...draft, unit: null, groups: [draft.groups[0]], days: [{ ...draft.days[0], meals: [{ ...draft.days[0].meals[0], groupPortions: [portion(draft.groups[0].id,"Cháo gà")] }] }] };
      await db.query('INSERT INTO menu_library_templates VALUES ($1,$2,$3,$4,$5,$6)', [`one-${i}`, "Cá nhân", "individual", 1, "2026-10-22T00:00:00Z", JSON.stringify(one)]);
    }
    await db.exec(`INSERT INTO menu_library_reviews VALUES ('old','multi',1,'approved','2026-10-23'),('current','multi',2,'changes_requested','2026-10-22');`);
    async function query(filters: Partial<DailyFilters> = {}, offset = 0) {
      const sql = dailyCatalogQuery({ ...EMPTY_DAILY_FILTERS, ...filters }, offset);
      const result = await db.query<{ total: number; items: { dayId: string; groups: { id: string }[]; meals: { dishes: string[] }[]; reviewState: string }[]; diets: unknown[]; energies: number[] }>(sql.text, sql.values as unknown[]);
      return result.rows[0];
    }
    const all = await query();
    assert.equal(all.total,28); assert.equal(all.items.length,25); assert.deepEqual(all.energies,[1600,2100]); assert.equal(all.diets.length,2);
    assert.equal((await query({},25)).items.length,3); assert.equal((await query({},100)).total,28);
    const found=await query({q:"Cá kho đặc biệt"}); assert.equal(found.total,1); assert.equal(found.items[0].dayId,"day-2");
    assert.equal((await query({direction:"collective",unitType:"school",meal:"lunch",energy:"1600",diet:"diet-a"})).total,2);
    assert.equal((await query({energy:"2100",diet:"diet-a"})).total,0,"Diet and energy must match the same group");
    const high=await query({direction:"collective",energy:"2100.0"}); assert.equal(high.items[0].groups.length,1); assert.equal(high.items[0].groups[0].id,"high"); assert.deepEqual(high.items[0].meals[0].dishes,["Đậu phụ"]);
    assert.equal((await query({q:"DD01-X",direction:"collective"})).total,2); assert.equal((await query({q:"Trường kiểm thử"})).total,2);
    assert.equal((await query({direction:"collective",review:"approved"})).total,0,"A review of revision 1 cannot approve revision 2");
    assert.equal((await query({review:"changes_requested"})).total,2);
    assert.equal((await query({q:"%' OR 1=1 --"})).total,0); assert.equal((await query({q:"%"})).total,0);
    assert.equal((await query({meal:"dinner"})).total,0,"A lunch-only daily menu does not imply all-day coverage");
    // Shared life-stage filters apply to the SAME energy/diet group and its dishes.
    await db.query(`UPDATE menu_library_templates SET document=jsonb_set(document,'{groups,0,lifeStage}','"child"') WHERE id='multi'`);
    assert.equal((await query({section:"collective",lifeStage:"child",energy:"1600"})).total,2);
    assert.equal((await query({section:"collective",lifeStage:"child",energy:"2100"})).total,0);
    assert.equal((await query({lifeStage:"unclassified"})).total,28);
    const hospital = { ...draft, id:"hospital-patient-legacy", direction:"individual", unit:null, groups:[draft.groups[0]], days:[draft.days[0]] };
    const archived = { ...hospital, id:"archived", librarySection:"individual", availability:{state:"archived",reason:"Fixture audit"} };
    for (const doc of [hospital,archived]) await db.query('INSERT INTO menu_library_templates VALUES ($1,$2,$3,$4,$5,$6)',[doc.id,"Fixture","individual",1,"2026-10-23",JSON.stringify(doc)]);
    assert.equal((await query({section:"hospital",hospitalUse:"patient_guidance"})).total,1,"Legacy hospital patient IDs stay in the hospital section");
    assert.equal((await query({availability:"archived"})).total,1);
    assert.equal((await query()).total,29,"Archived source is hidden by default without being deleted");
    assert.equal((await query({availability:"all"})).total,30);
    assert.ok(!validDailyFilters({...EMPTY_DAILY_FILTERS,lifeStage:"guess"},0));
    assert.ok(validDailyFilters(EMPTY_DAILY_FILTERS,0)); assert.ok(!validDailyFilters({...EMPTY_DAILY_FILTERS,energy:"NaN"},0)); assert.ok(!validDailyFilters(EMPTY_DAILY_FILTERS,-1));
    assert.deepEqual(productionAmount(.25,100),{exact:25,grams:25,belowScale:false}); assert.equal(productionAmount(.25,1)?.belowScale,true); assert.equal(productionAmount(1.6,10)?.grams,16); assert.equal(productionAmount(1,0),null);
    assert.equal(changedFractionalQuantity(draft,structuredClone(draft)),false);
    const changed=structuredClone(draft);changed.days[0].meals[0].groupPortions[0].dishes[0].ingredients[0].quantityPerPortion=.4;
    assert.equal(changedFractionalQuantity(draft,changed),true); changed.days[0].meals[0].groupPortions[0].dishes[0].ingredients[0].quantityPerPortion=1;assert.equal(changedFractionalQuantity(draft,changed),false);
    console.log("Daily catalog: PostgreSQL filtering, paging, current-revision reviews, selected-group dishes, partial-day coverage and gram quantities passed.");
  } finally { await db.close(); }
}
main().catch(error => { console.error(error); process.exitCode=1; });
