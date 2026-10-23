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
    await build({stdin:{contents:`export {default as Catalog} from ${JSON.stringify(resolve("src/app/quan-tri/kho-thuc-don/TemplateCatalog.tsx"))};export {default as Sheet, NutritionSummary as Summary} from ${JSON.stringify(resolve("src/app/quan-tri/kho-thuc-don/MealSheet.tsx"))};export {default as Editor} from ${JSON.stringify(resolve("src/app/quan-tri/kho-thuc-don/TemplateEditor.tsx"))};`,resolveDir:process.cwd(),loader:"tsx"},outfile,bundle:true,platform:"node",format:"cjs",packages:"external",jsx:"automatic"});
    const {Catalog,Sheet,Editor,Summary}=createRequire(import.meta.url)(outfile);
    const draft=structuredClone(PRIMARY_SCHOOL_DRAFT);draft.groups=[draft.groups[0],{...draft.groups[0],id:"high",designEnergyKcal:2100}];
    const portion=(id:string)=>({groupId:id,headcount:null,mealRuleIds:[],dishes:[{id:"salt-dish",label:"Canh bầu",recipeId:null,sourceKind:"ai" as const,ingredients:[{foodId:"salt",quantityPerPortion:.25,unit:"g" as const,basis:"edible_raw" as const,edibleFraction:null,cookingYield:null}]}]});
    draft.days=[1,2].map(dayIndex=>({id:`day-${dayIndex}`,dayIndex,date:null,meals:[{id:`lunch-${dayIndex}`,code:"lunch",label:"Trưa",groupPortions:draft.groups.map(group=>portion(group.id))}]}));
    const foods=[{id:"salt",name:"Muối",unit:"g"}],opened={content:draft,foods,warnings:[],history:[],template:{id:draft.id,title:draft.title,direction:"collective",revision:1,updatedAt:"2026-10-23",url:"https://example.test"}};
    const item={...opened.template,dayId:"day-2",dayIndex:2,dayCount:2,coverage:"served_meals",unitLabel:"Bếp kiểm thử",reviewState:"draft",groups:[{id:draft.groups[0].id,label:"1600",energy:1600},{id:"high",label:"2100",energy:2100}],meals:[{id:"lunch-2",label:"Trưa",dishes:["Canh bầu"]}]};
    const requests:string[]=[];
    globalThis.fetch=async(url)=>{requests.push(String(url));return Response.json(String(url).includes("/days?")?{items:[item],total:1,nextOffset:null,diets:[],energies:[1600,2100]}:opened)};
    async function settle(){await act(async()=>{await new Promise(resolve=>setTimeout(resolve,300))})}
    async function choose(element:HTMLSelectElement,value:string){await act(async()=>{element.value=value;element.dispatchEvent(new dom.window.Event("change",{bubbles:true}))})}
    async function input(element:HTMLInputElement,value:string){await act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,"value")!.set!.call(element,value);element.dispatchEvent(new dom.window.Event("input",{bubbles:true}))})}
    const button=(text:string)=>[...document.querySelectorAll("button")].find(b=>b.textContent===text)!;
    await act(async()=>root.render(<Catalog/>));await settle();
    assert.ok(document.body.textContent!.includes("Các bữa phục vụ"));assert.ok(button("Xem ngày").disabled,"Do not silently select one of several energy groups");
    assert.equal(document.querySelector('[aria-label="Kho thực đơn"]')!.querySelectorAll("button").length,3);
    await act(async()=>button("Bệnh viện").click());await settle();
    assert.ok(requests.at(-1)!.includes("section=hospital"));
    const hospitalFilter=[...document.querySelectorAll("label")].find(label=>label.textContent?.startsWith("Mục bệnh viện"))!.querySelector("select")!;
    await choose(hospitalFilter,"patient_guidance");await settle();assert.ok(requests.at(-1)!.includes("hospitalUse=patient_guidance"));
    await act(async()=>button("Tập thể").click());await settle();assert.ok(requests.at(-1)!.includes("section=collective"));assert.ok(requests.at(-1)!.includes("hospitalUse=&"));
    const stage=[...document.querySelectorAll("label")].find(label=>label.textContent?.startsWith("Phân loại người ăn"))!.querySelector("select")!;
    await choose(stage,"child");await settle();assert.ok(requests.at(-1)!.includes("lifeStage=child"));
    const group=document.querySelector('select[aria-label^="Khẩu phần"]')! as HTMLSelectElement;await choose(group,"high");
    await act(async()=>button("Xem ngày").click());
    const workspace=document.querySelector('[aria-label="Biên soạn và duyệt thực đơn"]')!;
    assert.equal((workspace.querySelectorAll("select")[0] as HTMLSelectElement).value,"day-2");
    assert.equal((workspace.querySelectorAll("select")[1] as HTMLSelectElement).value,"high");
    assert.equal(new URL(window.location.href).searchParams.get("day"),"day-2");assert.equal(new URL(window.location.href).searchParams.get("group"),"high");
    await act(async()=>button("← Danh mục thực đơn ngày").click());
    assert.equal(new URL(window.location.href).searchParams.has("template"),false);assert.equal((document.querySelector('select[aria-label^="Khẩu phần"]') as HTMLSelectElement).value,"high");
    const search=document.querySelector('input[type="search"]')! as HTMLInputElement;await input(search,"Cá kho");await settle();
    assert.ok(requests.at(-1)!.includes("q=C%C3%A1+kho"),"Search reaches server rather than filtering a loaded page");
    window.history.replaceState(null,"",`?template=${draft.id}&day=day-2&group=high`);
    await act(async()=>root.render(<Catalog key="reload"/>));await settle();
    assert.equal((document.querySelector('[aria-label="Biên soạn và duyệt thực đơn"]')!.querySelector("select") as HTMLSelectElement).value,"day-2","Reload preserves the linked day");
    window.history.replaceState(null,"",`?template=${draft.id}&day=removed&group=high`);
    await act(async()=>root.render(<Catalog key="invalid-link"/>));await settle();
    assert.ok(document.querySelector('[role="alert"]')?.textContent?.includes("không còn"));assert.equal(document.querySelector('[aria-label="Biên soạn và duyệt thực đơn"]'),null,"An obsolete day link must not silently show a different day");
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
    console.log("Daily UI: explicit energy selection, direct day/group links, return state, server search, exact source quantities, integer batch weights and fractional-edit guard passed.");
  } finally {await act(async()=>root.unmount());dom.window.close();await rm(dir,{recursive:true,force:true})}
}
main().catch(error=>{console.error(error);process.exitCode=1});
