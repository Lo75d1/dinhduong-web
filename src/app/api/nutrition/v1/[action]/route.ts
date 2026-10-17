import { nutritionRestIdentity, nutritionRestError } from "@/lib/nutrition-chat/rest";
import { readNutritionJson, nutritionJson } from "@/lib/nutrition-chat/security";
import { executeNutritionTool } from "@/lib/nutrition-chat/operations";
import { nutritionToolScope, NUTRITION_TOOLS, NUTRITION_WORKFLOW } from "@/lib/nutrition-chat/tools";
import { NutritionInputError, NUTRITION_LIMITS } from "@/lib/nutrition-chat/validation";
import {deleteSavedNutritionMenu,validateOperationObject,operationId} from "@/lib/nutrition-chat/service";
import {enforceNutritionRateLimit,validateNutritionOrigin,nutritionAnonymousKey} from "@/lib/nutrition-chat/security";
import {nutritionResponseGuidance} from "@/lib/nutrition-chat/response-guidance";
import {startGuestSession} from "@/lib/nutrition-chat/guest-session";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{action:string}>};
const actions:Record<string,string>={...Object.fromEntries(NUTRITION_TOOLS.map(tool=>[tool.name,tool.name])),prepare:"prepare_menu",calculate:"calculate_menu",save:"save_menu",export:"export_workbook"};
async function publicWorkflow(request:Request){
  validateNutritionOrigin(request);
  await enforceNutritionRateLimit(`nutrition-discovery:anonymous:${nutritionAnonymousKey(request)}`,{limit:60,windowSeconds:60});
  return nutritionJson({...NUTRITION_WORKFLOW,guidance:nutritionResponseGuidance("get_workflow",NUTRITION_WORKFLOW)});
}
export async function POST(request:Request,context:Context) {
  try {
    const {action}=await context.params,name=actions[action];
    if(!name)throw new NutritionInputError("Đường dẫn không tồn tại.","action",404);
    if(name==="start_guest_session"){validateOperationObject(await readNutritionJson(request,1024),[]);return nutritionJson(await startGuestSession(request),201);}
    if(name==="get_workflow"&&!request.headers.has("authorization")){validateOperationObject(await readNutritionJson(request,1024),[]);return await publicWorkflow(request);}
    const identity=await nutritionRestIdentity(request,nutritionToolScope(name)!);
    return nutritionJson(await executeNutritionTool(name,await readNutritionJson(request,NUTRITION_LIMITS.jsonBytes),identity));
  }catch(error){return nutritionRestError(error);}
}
export async function GET(request:Request,context:Context) {
  try {
    const {action}=await context.params,url=new URL(request.url);
    if(action!=="saved" && action!=="workflow")throw new NutritionInputError("Đường dẫn không tồn tại.","action",404);
    if(action==="workflow"&&!request.headers.has("authorization"))return await publicWorkflow(request);
    const identity=await nutritionRestIdentity(request,"nutrition:read");
    const name=action==="workflow"?"get_workflow":url.searchParams.has("id")?"get_saved_menu":"list_saved_menus";
    return nutritionJson(await executeNutritionTool(name,name==="get_workflow"?{}:name==="get_saved_menu"?{id:url.searchParams.get("id")}:{offset:Number(url.searchParams.get("offset")??0)},identity));
  }catch(error){return nutritionRestError(error);}
}
export async function DELETE(request:Request,context:Context){
  try{
    const {action}=await context.params;if(action!=="saved")throw new NutritionInputError("Đường dẫn không tồn tại.","action",404);
    const identity=await nutritionRestIdentity(request,"nutrition:write");
    await enforceNutritionRateLimit(`nutrition-delete:${identity.userId}`,{limit:10,windowSeconds:60});
    const args=validateOperationObject(await readNutritionJson(request,4096),["id","expectedRevision"],["id","expectedRevision"]);
    if(typeof args.expectedRevision!=="number")throw new NutritionInputError("Phiên bản không hợp lệ.","expectedRevision");
    return nutritionJson(await deleteSavedNutritionMenu(operationId(args.id,"id"),args.expectedRevision,identity));
  }catch(error){return nutritionRestError(error);}
}
