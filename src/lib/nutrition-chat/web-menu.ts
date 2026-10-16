import "server-only";
import type { NutritionIdentity, ResolvedMenu } from "./contracts";
import {enforceNutritionRateLimit,nutritionAnonymousKey,getNutritionPublicUrl,NutritionSecurityError,validateNutritionOrigin} from "./security";
import {readWebMenu,storeWebMenu,webMenuCookie,webMenuId,webMenuUrl,WEB_MENU_SECONDS} from "./web-menu-store";
import {prepareNutritionMenu} from "./service";
import {nutritionResponseGuidance} from "./response-guidance";

export async function createWebMenu(menu:ResolvedMenu,identity:NutritionIdentity,stage:"draft"|"calculated"){
  // 120/hour global plus a 30-minute TTL bounds snapshots across two windows to
  // 240 x 512KiB; the existing private temp volume needs no public DB table.
  await enforceNutritionRateLimit("nutrition-web-create:global",{limit:120,windowSeconds:3600});
  await enforceNutritionRateLimit(`nutrition-web-create:${identity.userId}`,{limit:30,windowSeconds:3600});
  return storeWebMenu(menu.input,menu.digest,stage);
}
export function requireWebMenuOrigin(request:Request){
  if(request.headers.get("origin")!==getNutritionPublicUrl())throw new NutritionSecurityError("invalid_origin",403,"Mở thao tác từ trang Dinh dưỡng 2598.");
}
export async function webMenuAccess(request:Request,id:string,key?:string){
  validateNutritionOrigin(request);
  await enforceNutritionRateLimit("nutrition-web-access:global",{limit:600,windowSeconds:60});
  await enforceNutritionRateLimit(`nutrition-web-access:${nutritionAnonymousKey(request)}`,{limit:60,windowSeconds:60});
  const name=webMenuCookie(id),credential=key??request.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith(name+"="))?.slice(name.length+1)??"";
  const snapshot=await readWebMenu(id,credential);
  await enforceNutritionRateLimit(`nutrition-web-view:${id}`,{limit:30,windowSeconds:60});
  return {...snapshot,id,webUrl:webMenuUrl(credential)};
}
export async function webMenuPayload(access:Awaited<ReturnType<typeof webMenuAccess>>){
  await enforceNutritionRateLimit(`nutrition-compute:${access.identity.userId}`,{limit:6,windowSeconds:60});
  const prepared=await prepareNutritionMenu(access.input,access.identity);
  return {...prepared,id:access.id,webUrl:access.webUrl,webExpiresAt:access.expiresAt,stage:access.stage,sourceChanged:prepared.preview.digest!==access.digest,guidance:nutritionResponseGuidance("prepare_menu",prepared,access.identity)};
}
export function webMenuSetCookie(key:string,expiresAt:string){
  const seconds=Math.max(0,Math.min(WEB_MENU_SECONDS,Math.floor((Date.parse(expiresAt)-Date.now())/1000)));
  return `${webMenuCookie(webMenuId(key))}=${key}; Path=/api/nutrition/v1/web-menu; Max-Age=${seconds}; HttpOnly; Secure; SameSite=Strict`;
}
