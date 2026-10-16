import "server-only";
import type { NutritionIdentity, ResolvedMenu } from "./contracts";
import { NUTRIENT_KEYS, NutritionInputError } from "./validation";
import { searchNutritionFoods, getNutritionFood, searchNutritionDishes, getNutritionDish, searchNutritionDietCodes, loadNutritionDietCode } from "./repository";
import { validateOperationObject, operationId, prepareNutritionMenu, confirmedNutritionMenu, saveNutritionMenu, listSavedNutritionMenus, getSavedNutritionMenu } from "./service";
import { exportNutritionMenu } from "./downloads";
import { NUTRITION_WORKFLOW, nutritionToolScope } from "./tools";
import { enforceNutritionRateLimit, NutritionSecurityError } from "./security";
import { nutritionChatReport } from "./chat-report";
import { listPersonalLibrary, getPersonalLibraryItem, personalLibraryKind } from "@/lib/personal-library";
import { GUEST_TOOL_NAMES, nutritionResponseGuidance } from "./response-guidance";
import { createWebMenu } from "./web-menu";

export async function executeNutritionTool(name:string,value:unknown,identity:NutritionIdentity) {
  if(identity.kind==="guest" && !GUEST_TOOL_NAMES.includes(name))throw new NutritionSecurityError("guest_account_required",403,"Thao tác này cần tài khoản; phiên tạm chỉ tra kho chung, tính và xuất file.");
  const result=await executeOperation(name,value,identity);
  if(name==="prepare_menu"){const prepared=result as Awaited<ReturnType<typeof prepareNutritionMenu>>;return {...prepared,...await createWebMenu(prepared.preview,identity,"draft"),guidance:nutritionResponseGuidance(name,prepared,identity)};}
  if(name==="calculate_menu")return {...result,...await createWebMenu(result as ResolvedMenu,identity,"calculated"),guidance:nutritionResponseGuidance(name,result,identity)};
  return {...result,guidance:nutritionResponseGuidance(name,result,identity)};
}
async function executeOperation(name:string,value:unknown,identity:NutritionIdentity) {
  const scope=nutritionToolScope(name);
  if(!scope)throw new NutritionInputError("Công cụ không tồn tại.","name",404);
  if(!identity.scopes.includes(scope))throw new NutritionSecurityError("insufficient_scope",403,"Cần cấp quyền cho thao tác này.",scope);
  await enforceNutritionRateLimit(`nutrition-user:${identity.userId}`,{limit:120,windowSeconds:60});
  if(["prepare_menu","calculate_menu","save_menu"].includes(name))await enforceNutritionRateLimit(`nutrition-compute:${identity.userId}`,{limit:identity.kind==="guest"?6:20,windowSeconds:60});
  if(name==="export_workbook")await enforceNutritionRateLimit(`nutrition-export:${identity.userId}`,{limit:identity.kind==="guest"?2:4,windowSeconds:60});
  if(name==="get_workflow"){validateOperationObject(value,[]);return NUTRITION_WORKFLOW;}
  if(name==="search_diet_codes"){const a=validateOperationObject(value,["q","targetGroup","diseaseGroup","limit","offset"]);return searchNutritionDietCodes(a);}
  if(name==="get_diet_code"){const a=validateOperationObject(value,["id"],["id"]);return loadNutritionDietCode(operationId(a.id,"id"));}
  if(name==="list_personal_library") {
    const a=validateOperationObject(value,["kind","q","page"],["kind"]);
    return listPersonalLibrary(personalLibraryKind(a.kind),a.q===undefined?"":a.q as string,a.page===undefined?0:a.page as number,identity);
  }
  if(name==="get_personal_library_item") {
    const a=validateOperationObject(value,["kind","id"],["kind","id"]);
    return getPersonalLibraryItem(personalLibraryKind(a.kind),operationId(a.id,"id"),identity);
  }
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
  const a=validateOperationObject(value,name==="save_menu"?["input","confirmationToken","idempotencyKey","rationId","expectedRevision"]:name==="export_workbook"?["input","confirmationToken","saveToAccount"]:["input","confirmationToken"],["input","confirmationToken",...(name==="save_menu"?["idempotencyKey"]:[])]);
  if(name==="save_menu")return saveNutritionMenu(a,identity);
  if(name==="export_workbook" && a.saveToAccount!==undefined && typeof a.saveToAccount!=="boolean")throw new NutritionInputError("Lựa chọn lưu tài khoản không hợp lệ.","saveToAccount");
  if(name==="export_workbook" && a.saveToAccount===true && !identity.scopes.includes("nutrition:write"))throw new NutritionSecurityError("insufficient_scope",403,"Cần cấp quyền lưu thực đơn để lưu cùng file Excel.","nutrition:write");
  const menu=await confirmedNutritionMenu(a,identity);
  if(name==="export_workbook" && a.saveToAccount===true)await saveNutritionMenu({...a,idempotencyKey:`export-${menu.digest}`},identity);
  return name==="export_workbook"?{...await exportNutritionMenu(menu,identity),...await createWebMenu(menu,identity,"calculated")}:{...menu,chatReport:nutritionChatReport(menu)};
}
