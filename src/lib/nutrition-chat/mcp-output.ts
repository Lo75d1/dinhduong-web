import type {ResolvedMenu,NutrientTotal} from "./contracts";
import {NutritionInputError} from "./validation";
import {nutritionChatReport} from "./chat-report";
export const NUTRITION_MCP_MAX_RESULT_CHARACTERS=140_000;
function metric(total:NutrientTotal){return {value:total.value,incomplete:total.incomplete,estimated:total.estimated,missingRowCount:total.missingRows.length,missingRows:total.missingRows.slice(0,20),missingRowsTruncated:total.missingRows.length>20};}
function summary(menu:ResolvedMenu){
  const keys=menu.fields.map(field=>field.key),selected=(totals:Record<string,NutrientTotal>)=>Object.fromEntries(keys.filter(key=>totals[key]).map(key=>[key,metric(totals[key])]));
  return {title:menu.title,mode:menu.mode,generatedAt:menu.generatedAt,dataVersion:menu.dataVersion,digest:menu.digest,fields:menu.fields,totals:selected(menu.totals),targets:menu.targets.filter(target=>keys.includes(target.key)||target.value!==null),
    ...(menu.clinicalAssessment?{clinicalAssessment:menu.clinicalAssessment}:{}),
    foodSources:[...new Map(menu.days.flatMap(day=>day.rows).map(row=>[row.food.id,{id:row.food.id,name:row.food.name,unit:row.food.unit,source:row.food.source}])).values()],
    dayTotals:menu.dayTotals.map(day=>({...day,totals:Object.fromEntries(["energyKcal","proteinG","lipidG","glucidG"].map(key=>[key,metric(day.totals[key])]))})),
    analysis:{calendarDayCount:menu.analysis.calendarDayCount,dataDayCount:menu.analysis.dataDayCount,emptyDayCount:menu.analysis.emptyDayCount,averageEnergyKcal:menu.analysis.averageEnergyKcal,periodEnergyStatus:menu.analysis.periodEnergyStatus,macros:menu.analysis.macros,nutrients:menu.analysis.nutrients.filter(item=>keys.includes(item.key)).map(item=>({...item,total:menu.totals[item.key]?metric(menu.totals[item.key]):item.total})),mealCount:menu.analysis.mealAggregates.length,dishCount:menu.analysis.dishes.length},
    warnings:menu.warnings.slice(0,50),warningCount:menu.warnings.length,missingInputs:menu.missingInputs.slice(0,50),missingInputCount:menu.missingInputs.length,
    outputCompacted:true,detailNotice:"Đã rút gọn dữ liệu truyền về hội thoại để tránh nền tảng cắt kết quả. Chi tiết theo bữa/món, toàn bộ dòng thiếu và nguồn có trong Excel hoặc API/web; không coi danh sách rút gọn là toàn bộ."};
}
/** Claude's hosted connector truncates oversized tool results. Bound before send. */
export function nutritionMcpOutput(name:string,result:unknown):{text:string;data:unknown;includeStructured:boolean}{
  let data=result,text=JSON.stringify(result);
  const size=(text:string,data:unknown,includeStructured:boolean)=>JSON.stringify({content:[{type:"text",text}],...(includeStructured?{structuredContent:data}:{})}).length+1000;
  if(size(text,data,true)<=NUTRITION_MCP_MAX_RESULT_CHARACTERS)return {text,data,includeStructured:true};
  const record=result as Record<string,unknown>;
  if(name==="save_menu")data={ration:record.ration,replayed:record.replayed,outputCompacted:true,detailNotice:"Bản đã lưu đầy đủ; mở bằng get_saved_menu hoặc trang bản lưu để xem."};
  else if(name==="prepare_menu" || name==="get_saved_menu")data={...record,preview:summary(record.preview as ResolvedMenu),...(Array.isArray(record.history)?{history:record.history.map(entry=>({revision:entry.revision,confirmedAt:entry.confirmedAt,dataVersion:entry.dataVersion,changedRowCount:entry.changes?.length??0})),historyDetailsCompacted:true}:{})};
  else if(name==="calculate_menu")data={...summary(result as ResolvedMenu),chatReport:nutritionChatReport(result as ResolvedMenu)};
  if(record.guidance && data && typeof data==="object")data={...data,guidance:record.guidance};
  if(record.webUrl && data && typeof data==="object")data={...data,webUrl:record.webUrl,webExpiresAt:record.webExpiresAt,webStorage:record.webStorage};
  text=JSON.stringify(data);
  if(size(text,data,false)>NUTRITION_MCP_MAX_RESULT_CHARACTERS)throw new NutritionInputError("Đầu vào/kết quả vượt giới hạn hội thoại. Chia thành kỳ nhỏ hơn hoặc dùng trang web/REST để giữ đủ dữ liệu; không gửi kết quả bị cắt.","mcp_result",413);
  return {text,data,includeStructured:size(text,data,true)<=NUTRITION_MCP_MAX_RESULT_CHARACTERS};
}
