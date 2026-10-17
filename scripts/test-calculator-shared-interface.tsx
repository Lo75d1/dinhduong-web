import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import LinkedCalculatorResults from "../src/app/tinh-khau-phan/LinkedCalculatorResults";
import PersonalProfile, { DEFAULT_PROFILE } from "../src/app/tinh-khau-phan/PersonalProfile";
import { DailyMealCards, DailyTotalCard } from "../src/app/tinh-khau-phan/DailyNutritionSummary";
import { resolveMenu } from "../src/lib/nutrition-chat/core";
import { ALL_NUTRIENT_FIELDS } from "../src/lib/nutrient-fields";
import type { MenuInput, NutritionFood } from "../src/lib/nutrition-chat/contracts";

let checks = 0;
const has = (html: string, value: string) => { assert.ok(html.includes(value), value); checks++; };
const absent = (html: string, value: string) => { assert.ok(!html.includes(value), value); checks++; };
const source = {kind:"catalog" as const,label:"Nguồn kiểm thử 100 ml",confirmed:true};
const foods: NutritionFood[] = [{id:"drink",name:"Đồ uống kiểm thử",unit:"ml",source,wastePercent:null,foodGroup:"Sữa",nutrients:{energyKcal:50,proteinG:0,lipidG:null,glucidG:10}}];
const input: MenuInput = {title:"Khẩu phần một ngày",mode:"menu",profile:{...DEFAULT_PROFILE,age:"60",weight:"60",height:"160"},comparison:{mode:"none"},days:[{id:"day",label:"Ngày 1",date:"",rows:[{id:"row",meal:"Phụ",dish:"Sữa",foodId:"drink",quantity:150,unit:"ml",servings:2,basis:"edible",recipeSource:{kind:"catalog",label:"Nguồn kiểm thử"}}]}]};
const menu = resolveMenu(input,foods);
const daily = renderToStaticMarkup(<LinkedCalculatorResults menu={menu} draft onEdit={()=>undefined}/>);
for (const text of ["BẢN TÍNH NHÁP","1 · Hồ sơ &amp; khuyến nghị dinh dưỡng","2 · Khẩu phần &amp; phân tích","3 · Dinh dưỡng khẩu phần chi tiết","data-calculator-daily-results","data-calculator-day-total","Thực đơn cả ngày","300 ml","150","Sửa hồ sơ","Đồ uống kiểm thử","Nguồn kiểm thử 100 ml","160 chỉ tiêu","Chỉ tính thành phần."]) has(daily,text);
for (const text of ["Tổng kỳ và biến động từng ngày","300 g sống sạch","Ngày đạt / thiếu / vượt","NaN","Infinity"]) absent(daily,text);

// The shared card reads canonical snapshot totals; it must not derive them from grams.
const sentinel = structuredClone(menu); sentinel.totals.energyKcal.value=12345.6;
has(renderToStaticMarkup(<LinkedCalculatorResults menu={sentinel} draft={false}/>),"12.345,6");
const summary = renderToStaticMarkup(<DailyTotalCard totals={menu.totals} fields={ALL_NUTRIENT_FIELDS} foodCount={1} amount="300 ml" mode="menu"/>);
has(summary,"150"); has(summary,"Đạm <b class=\"text-neutral-950\">0 g"); has(summary,"Béo <b class=\"text-neutral-950\">— g");
absent(summary,"Tỷ lệ năng lượng");
const partial = renderToStaticMarkup(<DailyMealCards dailyEnergy={{value:150,incomplete:true}} meals={[{name:"Phụ",totals:{energyKcal:{value:150,incomplete:true},proteinG:{value:0,incomplete:false}}}]}/>);
has(partial,"≥ 150"); absent(partial,"100%");
const profile = renderToStaticMarkup(<PersonalProfile value={menu.input.profile} inline/>);
has(profile,'value="60"'); has(profile,'value="160"');
const blank = renderToStaticMarkup(<PersonalProfile value={null} inline/>); absent(blank,'value="60"');
const recall = structuredClone(menu); recall.mode="recall24h";
has(renderToStaticMarkup(<LinkedCalculatorResults menu={recall} draft={false}/>),"Đã ăn cả ngày");
const multi = resolveMenu({...input,days:[...input.days,{...input.days[0],id:"second",label:"Ngày 2",rows:input.days[0].rows.map(row=>({...row,id:"second-row"}))}]},foods);
has(renderToStaticMarkup(<LinkedCalculatorResults menu={multi} draft={false}/>),"Tổng kỳ và biến động từng ngày");
console.log(`Shared calculator: ${checks} daily layout, source/units, null/zero/partial and controlled profile checks passed.`);
