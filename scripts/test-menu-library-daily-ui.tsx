import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { PRIMARY_SCHOOL_DRAFT } from "../src/lib/menu-library/contracts";

async function main() {
  const dir=await mkdtemp(join(process.cwd(),".daily-ui-"));
  const dom=new JSDOM('<div id="root"></div>',{url:"https://example.test/quan-tri/kho-thuc-don"});
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,HTMLInputElement:dom.window.HTMLInputElement,IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:(f:()=>void)=>f()});
  dom.window.scrollTo=()=>{};
  const {createRoot}=await import("react-dom/client"),root=createRoot(document.getElementById("root")!);
  try {
    const outfile=join(dir,"ui.cjs");
    await build({stdin:{contents:`export {default as Sheet, NutritionSummary as Summary} from ${JSON.stringify(resolve("src/app/quan-tri/kho-thuc-don/MealSheet.tsx"))};export {default as Editor} from ${JSON.stringify(resolve("src/app/quan-tri/kho-thuc-don/TemplateEditor.tsx"))};`,resolveDir:process.cwd(),loader:"tsx"},outfile,bundle:true,platform:"node",format:"cjs",packages:"external",jsx:"automatic"});
    const {Sheet,Editor,Summary}=createRequire(import.meta.url)(outfile);
    const draft=structuredClone(PRIMARY_SCHOOL_DRAFT);draft.groups=[draft.groups[0],{...draft.groups[0],id:"high",designEnergyKcal:2100}];
    const portion=(id:string)=>({groupId:id,headcount:null,mealRuleIds:[],dishes:[{id:"salt-dish",label:"Canh bầu",recipeId:null,sourceKind:"ai" as const,ingredients:[{foodId:"salt",quantityPerPortion:.25,unit:"g" as const,basis:"edible_raw" as const,edibleFraction:null,cookingYield:null}]}]});
    draft.days=[1,2].map(dayIndex=>({id:`day-${dayIndex}`,dayIndex,date:null,meals:[{id:`lunch-${dayIndex}`,code:"lunch",label:"Trưa",groupPortions:draft.groups.map(group=>portion(group.id))}]}));
    const foods=[{id:"salt",name:"Muối",unit:"g"}];
    async function choose(element:HTMLSelectElement,value:string){await act(async()=>{element.value=value;element.dispatchEvent(new dom.window.Event("change",{bubbles:true}))})}
    async function input(element:HTMLInputElement,value:string){await act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,"value")!.set!.call(element,value);element.dispatchEvent(new dom.window.Event("input",{bubbles:true}))})}
    await act(async()=>root.render(<Sheet key="batch" content={draft} day={draft.days[0]} groupId="high" foods={foods}/>));
    assert.ok(document.body.textContent!.includes("0,25"),"Do not format 0.25 as 0.3 or 0");
    await choose(document.querySelector("select")!,"batch");
    assert.ok(document.body.textContent!.includes("Nhập số suất"));assert.ok(document.querySelector('td:last-child')!.textContent!.includes("—"));
    await input(document.querySelector('input[aria-label="Số suất nấu"]')!,"100");assert.ok(document.querySelector('td:last-child')!.textContent!.includes("25"));
    assert.equal(draft.days[0].meals[0].groupPortions[0].dishes[0].ingredients[0].quantityPerPortion,.25);
    await input(document.querySelector('input[aria-label="Số suất nấu"]')!,"1");assert.ok(document.querySelector('td:last-child')!.textContent!.includes("Dưới 1"),"Never turn an unweighable positive dose into zero");
    // Preparation and care notes must be visible with the daily meal, not only in an attachment.
    const prepared=structuredClone(draft);prepared.groups[0].guidance={notes:["Lưu ý người chăm sóc kiểm thử"],recommendations:["Khuyến nghị dùng kiểm thử"]};
    prepared.days[0].meals[0].groupPortions[0].dishes[0].preparation={method:"steam",texture:"soft",steps:["Bước chuẩn bị kiểm thử","Bước nấu kiểm thử"],notes:["Lưu ý phục vụ kiểm thử"]};
    await act(async()=>root.render(<Sheet key="instructions" content={prepared} day={prepared.days[0]} groupId={prepared.groups[0].id} foods={foods}/>));
    assert.ok(document.body.textContent!.includes("Bước nấu kiểm thử"));assert.ok(document.body.textContent!.includes("Lưu ý người chăm sóc kiểm thử"));assert.ok(document.body.textContent!.includes("Khuyến nghị dùng kiểm thử"));assert.ok(document.body.textContent!.includes("Mềm"));
    const section={targetEnergyKcal:null,totals:{},macroPercent:{},missingInputs:[],recommendationCoverage:[{nutrient:"calciumMg",label:"Canxi",unit:"mg",total:250,target:1000,partial:true,percent:25,isUpperLimit:false,source:"KhuyenNghi fixture"}]};
    await act(async()=>root.render(<Summary section={section} pending={false} editing={false}/>));
    const row=document.querySelector("tbody tr")!;assert.match(row.textContent!,/250 \*/);assert.match(row.textContent!,/1000|1\.000/);assert.match(row.textContent!,/25% \*/);
    assert.ok(document.body.textContent!.includes("KhuyenNghi fixture"));
    let writes=0;let saved:typeof draft|null=null;globalThis.fetch=async(_url,init)=>{writes++;saved=JSON.parse(String(init?.body)).content;return Response.json({revision:2})};
    await act(async()=>root.render(<Editor key="editor" content={draft} csrf="test" foods={foods} onSaved={()=>{}} onDirty={()=>{}} onCancel={()=>{}}/>));
    const amount=[...document.querySelectorAll('input[type="number"]')].find(i=>i.getAttribute("max")==="100000")! as HTMLInputElement;
    await input(amount,"0.4");await act(async()=>document.querySelector("form")!.dispatchEvent(new dom.window.Event("submit",{bubbles:true,cancelable:true})));
    assert.equal(writes,0);assert.ok(document.querySelector('[role="alert"]')?.textContent?.includes("bước 1"));
    await input(amount,"1");await act(async()=>document.querySelector("form")!.dispatchEvent(new dom.window.Event("submit",{bubbles:true,cancelable:true})));assert.equal(writes,1);
    const instructions=[...document.querySelectorAll("textarea")].find(element=>element.closest("label")?.textContent?.startsWith("Cách chế biến"))!;
    await act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,"value")!.set!.call(instructions,"Bước 1\n\nBước 2");instructions.dispatchEvent(new dom.window.Event("input",{bubbles:true}))});
    await act(async()=>document.querySelector("form")!.dispatchEvent(new dom.window.Event("submit",{bubbles:true,cancelable:true})));
    assert.deepEqual(saved!.days[0].meals[0].groupPortions[0].dishes[0].preparation!.steps,["Bước 1","Bước 2"],"Recipe steps survive save as clean ordered lines");
    console.log("Daily meal UI: exact source quantities, integer batch weights, preparation, recommendation coverage and fractional-edit guard passed. Catalog management is covered by test-menu-library-manager-ui.");
  } finally {await act(async()=>root.unmount());dom.window.close();await rm(dir,{recursive:true,force:true})}
}
main().catch(error=>{console.error(error);process.exitCode=1});
