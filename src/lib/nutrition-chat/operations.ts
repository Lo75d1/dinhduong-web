import "server-only";
import type { NutritionIdentity } from "./contracts";
import { NUTRIENT_KEYS, NutritionInputError } from "./validation";
import { searchNutritionFoods, getNutritionFood, searchNutritionDishes, getNutritionDish } from "./repository";
import { validateOperationObject, operationId, prepareNutritionMenu, confirmedNutritionMenu, saveNutritionMenu, listSavedNutritionMenus, getSavedNutritionMenu } from "./service";
import { exportNutritionMenu } from "./downloads";
import { NUTRITION_WORKFLOW, nutritionToolScope } from "./tools";
import { enforceNutritionRateLimit, NutritionSecurityError } from "./security";
import { nutritionChatReport } from "./chat-report";

export async function executeNutritionTool(name:string,value:unknown,identity:NutritionIdentity) {
  const scope=nutritionToolScope(name);
  if(!scope)throw new NutritionInputError("Công cụ không tồn tại.","name",404);
  if(!identity.scopes.includes(scope))throw new NutritionSecurityError("insufficient_scope",403,"Cần cấp quyền cho thao tác này.",scope);
  await enforceNutritionRateLimit(`nutrition-user:${identity.userId}`,{limit:120,windowSeconds:60});
  if(["prepare_menu","calculate_menu","save_menu"].includes(name))await enforceNutritionRateLimit(`nutrition-compute:${identity.userId}`,{limit:20,windowSeconds:60});
  if(name==="export_workbook")await enforceNutritionRateLimit(`nutrition-export:${identity.userId}`,{limit:4,windowSeconds:60});
  if(name==="get_workflow"){validateOperationObject(value,[]);return NUTRITION_WORKFLOW;}
  if(name==="search_foods") {
    const a=validateOperationObject(value,["q","type","source","group","limit","offset","fields"],["q"]);
    if(typeof a.q!=="string" || (a.group!==undefined && (typeof a.group!=="string" || a.group.length>100)))throw new NutritionInputError("Bộ lọc không hợp lệ.");
    if(a.fields!==undefined && (!Array.isArray(a.fields) || a.fields.length>40 || a.fields.some(k=>typeof k!=="string" || !NUTRIENT_KEYS.has(k))))throw new NutritionInputError("Danh sách chất không hợp lệ.","fields");
    for(const key of ["type","source"]){if(a[key]!==undefined && typeof a[key]!=="string")throw new NutritionInputError("Bộ lọc không hợp lệ.",key);}
    for(const key of ["limit","offset"]){if(a[key]!==undefined && typeof a[key]!=="number")throw new NutritionInputError("Phân trang cần số nguyên.",key);}
    return searchNutritionFoods(a as Parameters<typeof searchNutritionFoods>[0]);
  }
  if(name==="search_dishes"){const a=validateOperationObject(value,["q","limit"],["q"]);if(typeof a.q!=="string")throw new NutritionInputError("Cần tên món.","q");if(a.limit!==undefined && typeof a.limit!=="number")throw new NutritionInputError("Giới hạn cần số nguyên.","limit");return searchNutritionDishes(a as Parameters<typeof searchNutritionDishes>[0]);}
  if(["get_food","get_dish","get_saved_menu"].includes(name)){const a=validateOperationObject(value,["id"],["id"]),id=operationId(a.id,"id");return name==="get_food"?getNutritionFood(id):name==="get_dish"?getNutritionDish(id):getSavedNutritionMenu(id,identity);}
  if(name==="list_saved_menus"){const a=validateOperationObject(value,["offset"]);if(a.offset!==undefined && typeof a.offset!=="number")throw new NutritionInputError("Phân trang cần số nguyên.","offset");return listSavedNutritionMenus(a.offset===undefined?0:a.offset as number,identity);}
  if(name==="prepare_menu"){const a=validateOperationObject(value,["input"],["input"]);return prepareNutritionMenu(a.input,identity);}
  const a=validateOperationObject(value,name==="save_menu"?["input","confirmationToken","idempotencyKey","rationId","expectedRevision"]:["input","confirmationToken"],["input","confirmationToken",...(name==="save_menu"?["idempotencyKey"]:[])]);
  if(name==="save_menu")return saveNutritionMenu(a,identity);
  const menu=await confirmedNutritionMenu(a,identity);
  return name==="export_workbook"?exportNutritionMenu(menu,identity):{...menu,chatReport:nutritionChatReport(menu)};
}
