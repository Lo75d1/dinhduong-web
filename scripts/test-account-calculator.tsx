import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import Page, { generateMetadata } from "../src/app/tinh-khau-phan/page";
import { AccountMenuWorkspace } from "../src/app/ket-noi-ai/ban-luu/[id]/SavedMenuView";
import { libraryMenuInput } from "../src/lib/nutrition-chat/library-menu-input";
import { savedCalculatorUrl, legacyCalculatorUrl, libraryCalculatorUrl } from "../src/lib/nutrition-chat/calculator-links";
import { workbookFixture } from "./test-nutrition-chat-workbook";
import type { CustomFoodInput } from "../src/lib/nutrition-chat/contracts";

async function main() {
  let checks=0;
  const equal=(a:unknown,b:unknown)=>{assert.deepEqual(a,b);checks++;};
  const has=(a:string,b:string)=>{assert.ok(a.includes(b),b);checks++;};
  const no=()=>undefined;
  const router={back:no,forward:no,push:no,replace:no,refresh:no,prefetch:no,bfcacheId:"account-calculator-fixture"};
  const render=(element:React.ReactNode)=>renderToStaticMarkup(<AppRouterContext.Provider value={router}>{element}</AppRouterContext.Provider>);
  const {menu}=workbookFixture();
  equal(savedCalculatorUrl("saved-a"),"/tinh-khau-phan?banLuu=saved-a");
  equal(legacyCalculatorUrl("legacy-a"),"/tinh-khau-phan?banCu=legacy-a");
  equal(libraryCalculatorUrl("food","food-v1"),"/tinh-khau-phan?thuVien=food&item=food-v1");
  for(const id of ["../foreign","https://evil.test", "a?token=x"]){assert.throws(()=>savedCalculatorUrl(id));checks++;}
  for(const query of [{banLuu:"saved-a"},{banCu:"legacy-a"},{thuVien:"food",item:"food-v1"},{moi:"1"}]){
    const props={searchParams:Promise.resolve(query)};
    const html=render(await Page(props));
    has(html,"Phân tích khẩu phần");
    equal(html.includes(menu.title),false);
    equal((await generateMetadata(props)).robots,{index:false,follow:false});
    equal((await generateMetadata(props)).referrer,"no-referrer");
  }
  const result={input:menu.input,preview:menu,confirmationToken:"isolated-test-ticket",ration:{id:"saved-a",title:menu.title,revision:3}};
  const saved=render(<AccountMenuWorkspace result={result}/>);
  for(const text of ["data-calculator-navigation","Kết quả &amp; phân tích","Lưu thay đổi","Lưu thành bản mới","Tải thêm Excel","Tôi xác nhận đầu vào","Tổng kỳ và biến động từng ngày","Ngày 2"]){has(saved,text);}
  equal(saved.includes("Tổng dinh dưỡng cả đợt"),false);
  const food:CustomFoodInput={id:"personal-milk_v2",name:"Sữa riêng",basis:"portion",portionAmount:200,portionUnit:"ml",source:{kind:"label",label:"Nhãn thử",confirmed:true},nutrients:{energyKcal:100,lipidG:0,vitDMcg:null}};
  const fromFood=libraryMenuInput("food",{content:food});
  const row=fromFood.input.days[0].rows[0];
  equal(row.customFood,food);equal(row.quantity,200);equal(row.unit,"ml");equal(row.servings,1);
  equal(row.customFood?.nutrients.lipidG,0);equal(row.customFood?.nutrients.vitDMcg,null);
  const fromDish=libraryMenuInput("dish",{content:menu.input,preview:menu});
  equal(fromDish.input.days[0].rows,menu.input.days[0].rows);
  fromDish.input.days[0].rows[0].quantity=999;
  equal(menu.input.days[0].rows[0].quantity===999,false);
  const fresh=render(<AccountMenuWorkspace initial={fromFood}/>);
  for(const text of ["data-calculator-meal-workspace","data-calculator-dish-panel","Sữa riêng","Thực phẩm của tôi","Món ăn của tôi","ml"]){has(fresh,text);}
  const empty=libraryMenuInput();equal(empty.input.days[0].rows,[]);
  console.log(`Account calculator: ${checks} link/privacy/source/native-render checks passed; no browser interaction claim.`);
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
