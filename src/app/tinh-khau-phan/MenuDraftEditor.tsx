"use client";

import { useState } from "react";
import type { MenuInput, MenuRowInput, ResolvedMenu } from "@/lib/nutrition-chat/contracts";
import { aiFilled, briefFoodSource } from "@/lib/nutrition-chat/presentation";
import { EMPTY_CLASSIFY } from "@/lib/food-classify";
import MealInput, { type ControlledMealInput, type FoodResult, type DishResult } from "./MealInput";
import { DishInputFrame } from "./MealInputWorkspace";
import type { Row } from "./types";
import { resolvedDisplayTotal } from "./resolved-ration-detail";
import LibraryIngredientPicker from "@/app/tai-khoan/LibraryIngredientPicker";
import { CORE_CALC_FIELDS } from "@/lib/nutrient-fields";
import { webNutritionReportInput, webRowFoodSource } from "./nutrition-excel-download";

type Props = { input: MenuInput; menu?: ResolvedMenu; names: Record<string,string>; disabled: boolean; sourceMode?: "all"|"catalog"; onChange: (next: MenuInput) => void; onNames: (names: Record<string,string>) => void; onAmount: (day:number,row:number,field:"quantity"|"servings",value:string) => void };
type DisplayRow = Row & { sourceRow?: MenuRowInput };
const field = "w-full min-w-0 rounded border border-[#8fa99e] bg-white px-2 py-1.5 text-sm text-neutral-950 focus:outline-2 focus:outline-[#123c36]";
const numberField = field + " text-right tabular-nums";

/** The same MealInput component owns the tree, navigation and pinned catalogue
 * search for manual and linked menus. Its display rows never replace MenuInput:
 * canonical quantities, ml, servings, sources and conversion data stay intact.
 */
export default function MenuDraftEditor({ input, menu, names, disabled, sourceMode="catalog", onChange, onNames, onAmount }: Props) {
  const [selectedDay,setSelectedDay] = useState(input.days[0]?.id ?? "");
  const [emptyRows,setEmptyRows] = useState<Record<string,Row[]>>({});
  const [error,setError] = useState("");
  const dayIndex = Math.max(0,input.days.findIndex(day=>day.id===selectedDay)), day=input.days[dayIndex];
  const resolvedRows = new Map(menu?.days.flatMap(item=>item.rows).map(row=>[row.id,row]));
  if(!day) return <p>Chưa có ngày. Bấm Thêm ngày để nhập khẩu phần.</p>;
  const nameOf = (row:MenuRowInput) => row.actualFoodName || row.customFood?.name || names[row.id] || resolvedRows.get(row.id)?.food.name || row.dish;
  const displayRows: DisplayRow[] = day.rows.map(row => {
    const resolved=resolvedRows.get(row.id);
    return {uid:row.id,meal:row.meal,dish:row.dish,foodId:row.foodId || row.customFood?.id || "",foodName:nameOf(row),inputGrams:row.quantity??0,inputBasis:row.basis==="raw"?"raw":"edible",conversionFactor:row.conversionFactor??1,grams:resolved?.referenceAmount??0,wastePercent:resolved?.food.wastePercent??null,note:row.note??"",nutrients:resolved?.food.nutrients??{},classify:EMPTY_CLASSIFY,sourceRow:row};
  });
  displayRows.push(...(emptyRows[day.id]??[]).filter(row=>!day.rows.some(item=>item.meal===row.meal&&item.dish===row.dish)));
  function structuralChange(rows:Row[]) {
    const next=structuredClone(input), placeholders:Row[]=[];
    next.days[dayIndex].rows=rows.flatMap(display=>{
      const original=(display as DisplayRow).sourceRow;
      if(!original){
        if(!display.foodId){placeholders.push(display);return [];}
        const added=webNutritionReportInput([{id:day.id,label:day.label,date:day.date,rows:[display]}],null,input.mode).days[0].rows[0];
        if(display.note.startsWith("AI")){added.recipeSource={kind:"ai",label:"AI hỗ trợ nhập liệu; người dùng cần kiểm tra nguồn và định lượng"};added.aiFilledFields=["quantity","servings"];}
        return [{...added,id:display.uid}];
      }
      return [{...structuredClone(original),id:display.uid,meal:display.meal,dish:display.dish,note:display.note}];
    });
    setEmptyRows(current=>({...current,[day.id]:placeholders})); onNames(Object.fromEntries(rows.filter(row=>row.foodId).map(row=>[row.uid,row.foodName]))); onChange(next);
  }
  function patch(index:number,changes:Partial<MenuRowInput>) {
    const next=structuredClone(input), row=next.days[dayIndex].rows[index];
    Object.assign(row,changes);
    row.aiFilledFields=row.aiFilledFields?.filter(key=>!Object.keys(changes).includes(key));
    onChange(next);
  }
  function append(rows:MenuRowInput[],added:Record<string,string>) {
    if(day.rows.length+rows.length>100){setError("Mỗi ngày tối đa100 dòng. Giữ nguyên bản đang nhập và chia ngày/kỳ khi cần.");return;}
    const next=structuredClone(input);next.days[dayIndex].rows.push(...rows);onNames(added);setError("");onChange(next);
  }
  function pickFood(food:FoodResult,target:{meal:string;dish:string}) {
    const id=crypto.randomUUID();
    const source=webRowFoodSource({foodId:food.id,foodName:food.name,nutrients:Object.fromEntries(CORE_CALC_FIELDS.map(field=>[field.key,typeof food[field.key]==="number"?food[field.key] as number:null])),wastePercent:typeof food.wastePercent==="number"?food.wastePercent:null});
    append([{id,meal:target.meal,dish:target.dish,...source,quantity:null,unit:food.unit==="ml"?"ml":"g",servings:1,basis:"edible",recipeSource:{kind:"user",label:source.customFood?"Người dùng tự nhập số liệu trên website":"Người dùng chọn thực phẩm trong kho"}}],{[id]:food.name});
  }
  function pickDish(dish:DishResult,meal:string) {
    if(!dish.ingredients.length||dish.ingredients.some(item=>!item.food||item.quantityG===null)) {setError("Công thức còn nguyên liệu chưa liên kết hoặc thiếu lượng. Chọn nguyên liệu có nguồn; hệ thống giữ toàn bộ bản đang nhập.");return;}
    const added:Record<string,string>={};
    const rows=dish.ingredients.map(item=>{const id=crypto.randomUUID();added[id]=item.food!.name;return {id,meal,dish:dish.name,foodId:item.food!.id,quantity:item.quantityG,unit:"g" as const,servings:1,basis:"edible" as const,recipeSource:{kind:"catalog" as const,label:`RNI: ${dish.name}`,dishId:dish.id},note:"Định lượng toàn công thức nguồn; kiểm tra số phần trước khi dùng."};});
    append(rows,added);
  }
  const matchesSnapshot=JSON.stringify(input.days)===JSON.stringify(menu?.input.days);
  function energy(rows:MenuRowInput[]) {
    if(!matchesSnapshot||!rows.length)return "— kcal";
    const resolved=rows.map(row=>resolvedRows.get(row.id));if(resolved.some(row=>!row))return "— kcal";
    const total=resolvedDisplayTotal(resolved.filter(row=>row!==undefined),"energyKcal");
    return total.value===null?"— kcal":`${total.incomplete?"≥ ":""}${Math.round(total.value).toLocaleString("vi-VN")} kcal`;
  }
  const mealNames=[...new Set(displayRows.map(row=>row.meal))];
  const tree=mealNames.map(meal=>({meal,kcal:energy(day.rows.filter(row=>row.meal===meal)),dishes:[...new Set(displayRows.filter(row=>row.meal===meal).map(row=>row.dish))].map(dish=>({dish,kcal:energy(day.rows.filter(row=>row.meal===meal&&row.dish===dish))}))}));
  const controlled:ControlledMealInput={rows:displayRows,mode:input.mode,disabled,showActions:true,onChange:structuralChange,onModeChange:mode=>onChange({...input,mode}),onPickFood:pickFood,onPickDish:pickDish,tree,renderDish:(meal,dish,actions)=><DishInputFrame name={dish.dish} disabled={disabled} onRename={actions.rename} onDelete={actions.remove} onDuplicate={actions.duplicate}>
    <div className="relative overflow-x-auto"><table className="w-full min-w-[980px] table-fixed border-collapse text-sm [&_th]:border [&_th]:border-[#cbd8d1] [&_th]:bg-[#eef4f1] [&_td]:border [&_td]:border-[#e0e8e3]">
      <caption className="p-2 text-left text-sm font-semibold">Thực phẩm / nguyên liệu của món · lượng, đơn vị và số suất giữ theo bản đang mở</caption>
      <colgroup><col className="w-[24%]"/><col className="w-[12%]"/><col className="w-[10%]"/><col className="w-[11%]"/><col className="w-[10%]"/><col className="w-[8%]"/><col className="w-[8%]"/><col className="w-[13%]"/><col className="w-[4%]"/></colgroup>
      <thead><tr><th className="px-2 py-2 text-left">Thực phẩm</th><th className="px-1 py-2">{input.mode==="recall24h"?"Đã ăn / suất":"Lượng / suất"}</th><th className="px-1 py-2">Hệ số</th><th className="px-1 py-2">Theo nguồn</th><th className="px-1 py-2">Mua/kho</th><th className="px-1 py-2">Thải bỏ</th><th className="px-1 py-2">Số suất</th><th className="px-2 py-2 text-left">Ghi chú</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
      <tbody>{day.rows.map((row,index)=>({row,index})).filter(({row})=>row.meal===meal&&row.dish===dish.dish).map(({row,index})=>{const name=nameOf(row),resolved=resolvedRows.get(row.id),current=JSON.stringify(row)===JSON.stringify(menu?.input.days.flatMap(day=>day.rows).find(item=>item.id===row.id));return <tr key={row.id} className="align-top">
        <th scope="row" className="bg-white px-2 py-2 text-left font-normal"><b>{name}</b><p className="mt-1 text-xs text-neutral-600">{resolved?briefFoodSource(resolved.food.source):row.customFood?.source.label||row.recipeSource.label}</p>
          <details className="mt-2 text-xs"><summary className="cursor-pointer underline">Cơ sở, quy đổi và nguồn</summary>
            <label className="mt-2 block">Cơ sở lượng<select aria-label={`Cơ sở ${name}`} value={row.basis} onChange={event=>patch(index,{basis:event.target.value as MenuRowInput["basis"]})} className={field}><option value="edible">Theo trạng thái nguồn</option><option value="raw">Lượng mua vào</option><option value="cooked">Chín → trạng thái nguồn</option></select></label>
            {row.basis==="cooked"?<label className="mt-2 block">Nguồn hệ số<input aria-label={`Nguồn hệ số ${name}`} value={row.conversionSource??""} onChange={event=>patch(index,{conversionSource:event.target.value||undefined})} className={field}/></label>:null}
            <label className="mt-2 block">Mật độ g/ml<input aria-label={`Mật độ ${name}`} type="number" min={0.000001} step="any" value={row.densityGPerMl??""} onChange={event=>patch(index,{densityGPerMl:event.target.value===""?undefined:Number(event.target.value)})} className={field}/></label><label className="mt-2 block">Nguồn mật độ<input aria-label={`Nguồn mật độ ${name}`} value={row.densitySource??""} onChange={event=>patch(index,{densitySource:event.target.value||undefined})} className={field}/></label>
            <label className="mt-2 block">Trạng thái nguồn<select value={row.sourceState??""} aria-label={`Trạng thái nguồn ${name}`} onChange={event=>patch(index,{sourceState:event.target.value as MenuRowInput["sourceState"]||undefined})} className={field}><option value="">Chưa xác nhận</option><option value="raw_clean">Sống sạch</option><option value="cooked">Đã chín</option><option value="as_sold">Theo sản phẩm</option></select></label>
            {input.mode==="recall24h"?<><label className="mt-2 block">Giờ ăn<input type="time" value={row.mealTime??""} onChange={event=>patch(index,{mealTime:event.target.value||undefined})} className={field}/></label><label className="mt-2 block">Số bát, cốc…<input value={row.householdMeasure??""} onChange={event=>patch(index,{householdMeasure:event.target.value||undefined})} className={field}/></label></>:null}
          </details></th>
        <td className="px-1 py-2"><div className="flex items-center gap-1">{aiFilled(row,"quantity")?"*":null}<input aria-label={`Lượng ${name}`} type="number" min={0} max={1000000} step="any" value={row.quantity??""} onChange={event=>onAmount(dayIndex,index,"quantity",event.target.value)} className={numberField}/></div><select aria-label={`Đơn vị ${name}`} value={row.unit} onChange={event=>patch(index,{unit:event.target.value as "g"|"ml"})} className={field+" mt-1"}><option value="g">g</option><option value="ml">ml</option></select></td>
        <td className="px-1 py-2">{row.basis==="cooked"?<input aria-label={`Hệ số quy đổi ${name}`} type="number" min={0.000001} step="any" value={row.conversionFactor??""} onChange={event=>patch(index,{conversionFactor:event.target.value===""?undefined:Number(event.target.value)})} className={numberField}/>:<span className="text-xs">Không quy đổi</span>}</td>
        <td className="px-1 py-2 text-right">{current&&resolved?.referenceAmount!==null&&resolved?.referenceAmount!==undefined?`${resolved.referenceAmount.toLocaleString("vi-VN")} ${resolved.food.unit}`:"—"}</td>
        <td className="px-1 py-2 text-right">{current&&resolved?.rawGrams!==null&&resolved?.rawGrams!==undefined?`${resolved.rawGrams.toLocaleString("vi-VN")} g`:"—"}</td>
        <td className="px-1 py-2 text-right">{resolved?.food.wastePercent!==null&&resolved?.food.wastePercent!==undefined?`${resolved.food.wastePercent}%`:"—"}</td>
        <td className="px-1 py-2">{aiFilled(row,"servings")?"*":null}<input aria-label={`Số suất ${name}`} type="number" min={0.000001} max={10000} step="any" value={row.servings} onChange={event=>onAmount(dayIndex,index,"servings",event.target.value)} className={numberField}/></td>
        <td className="px-2 py-2"><textarea aria-label={`Ghi chú ${name}`} rows={2} value={row.note??""} onChange={event=>patch(index,{note:event.target.value||undefined})} className={field}/></td>
        <td className="px-1 py-2"><button type="button" aria-label={`Bỏ ${name}`} className="rounded px-2 py-1 text-red-800" onClick={()=>{const next=structuredClone(input);next.days[dayIndex].rows.splice(index,1);onChange(next);}}>✕</button></td>
      </tr>;})}</tbody></table></div>
      {!day.rows.some(row=>row.meal===meal&&row.dish===dish.dish)?<p className="p-3 text-sm">Chưa có thực phẩm. Chọn món này rồi tìm ở ô phía dưới.</p>:null}
    </DishInputFrame>};
  return <div className="flex min-w-0 flex-col gap-3 lg:min-h-0 lg:flex-1">
    <div className="flex flex-wrap gap-2" role="group" aria-label="Ngày trong khẩu phần">{input.days.map(item=><button key={item.id} type="button" disabled={disabled} aria-pressed={item.id===day.id} onClick={()=>setSelectedDay(item.id)} className={`rounded border px-3 py-2 text-sm font-semibold ${item.id===day.id?"bg-[#123c36] text-white":"bg-white text-[#123c36]"}`}>{item.label}{item.date?` · ${item.date}`:""}</button>)}</div>
    <div className="grid grid-cols-2 gap-3"><label className="min-w-0 text-sm">Tên ngày<input disabled={disabled} value={day.label} maxLength={100} onChange={event=>{const next=structuredClone(input);next.days[dayIndex].label=event.target.value;onChange(next);}} className={field}/></label><label className="min-w-0 text-sm">Ngày ăn<input disabled={disabled} type="date" value={day.date} onChange={event=>{const next=structuredClone(input);next.days[dayIndex].date=event.target.value;onChange(next);}} className={field}/></label></div>
    {error?<p role="alert" className="text-sm text-red-800">{error}</p>:null}
    <MealInput key={day.id} controlled={controlled}/>
    {sourceMode==="all"?<details className="rounded border p-3"><summary className="cursor-pointer text-sm">Thêm từ thư viện cá nhân</summary><LibraryIngredientPicker disabled={disabled} onPick={(rows,added)=>append(rows,added)}/></details>:null}
    <p className="text-xs text-neutral-600">* Số AI tự điền. Số chuyển đổi và kết quả cập nhật sau khi Xem trước. Giữ nguyên đơn vị, nguồn và số suất; ô — là chưa đủ dữ liệu.</p>
  </div>;
}
