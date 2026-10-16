import { randomBytes, createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseMenuInput, NUTRITION_LIMITS, NutritionInputError } from "./validation";
import type { MenuInput, NutritionIdentity } from "./contracts";
import { getNutritionPublicUrl, NutritionSecurityError } from "./oauth-validation";

export const WEB_MENU_SECONDS=1800;
const directory=join(tmpdir(),"dinhduong2598-nutrition-chat-v1","web-menus");
type Snapshot={version:1;input:MenuInput;digest:string;stage:"draft"|"calculated";expiresAt:string;issuer:string};
const unavailable=()=>new NutritionSecurityError("web_menu_expired",410,"Bản tạm không còn hiệu lực. Mở đúng link từ chat hoặc yêu cầu tạo link mới; bản này chưa được lưu vào tài khoản.");
export function webMenuId(key:string){if(!/^[A-Za-z0-9_-]{43}$/.test(key))throw unavailable();return createHash("sha256").update(key).digest("hex");}
function path(id:string){if(!/^[a-f0-9]{64}$/.test(id))throw unavailable();return join(directory,`${id}.json`);}
export function webMenuCookie(id:string){path(id);return `nutrition_web_${id}`;}
export function webMenuUrl(key:string){webMenuId(key);return `${getNutritionPublicUrl()}/ket-noi-ai/ban-tam#${key}`;}
export async function cleanupWebMenus(){
  await mkdir(directory,{recursive:true,mode:0o700});let files=0,bytes=0,removed=0;
  for(const name of (await readdir(directory)).filter(n=>/^[a-f0-9]{64}\.json$/.test(n))){
    const target=join(directory,name),info=await stat(target).catch(()=>null);if(!info)continue;
    if(info.mtimeMs+WEB_MENU_SECONDS*1000<=Date.now()){await unlink(target).catch(()=>undefined);removed++;}else{files++;bytes+=info.size;}
  }
  return {files,bytes,removed};
}
export async function storeWebMenu(input:MenuInput,digest:string,stage:Snapshot["stage"]){
  const state=await cleanupWebMenus();
  if(state.files>=256 || state.bytes>=128*1024*1024)throw new NutritionSecurityError("web_menu_busy",503,"Vùng bản tạm đang đầy, vui lòng thử lại sau.",undefined,60);
  const key=randomBytes(32).toString("base64url"),id=webMenuId(key),expiresAt=new Date(Date.now()+WEB_MENU_SECONDS*1000).toISOString();
  const data:Snapshot={version:1,input,digest,stage,expiresAt,issuer:getNutritionPublicUrl()},text=JSON.stringify(data);
  if(Buffer.byteLength(JSON.stringify(input))>NUTRITION_LIMITS.jsonBytes)throw new NutritionInputError("Đầu vào quá lớn để mở bản tạm; chia kỳ theo ngày.","input",413);
  await writeFile(path(id),text,{flag:"wx",mode:0o600});
  return {webUrl:webMenuUrl(key),webExpiresAt:expiresAt,webStorage:"temporary" as const};
}
export async function readWebMenu(id:string,key:string){
  if(webMenuId(key)!==id)throw unavailable();const target=path(id),info=await stat(target).catch(()=>null);
  if(!info || info.size>NUTRITION_LIMITS.jsonBytes+4096)throw unavailable();
  const snapshot=await readFile(target,"utf8").then(text=>JSON.parse(text) as Snapshot).catch(()=>null);
  const expiry=Date.parse(snapshot?.expiresAt??"");
  if(!snapshot || snapshot.version!==1 || snapshot.issuer!==getNutritionPublicUrl() || !["draft","calculated"].includes(snapshot.stage) || !/^[a-f0-9]{64}$/.test(snapshot.digest) || !(expiry>Date.now()) || expiry>Date.now()+WEB_MENU_SECONDS*1000+1000)throw unavailable();
  const identity:NutritionIdentity={userId:`web-${id}`,clientId:"web-menu",kind:"guest",expiresAt:snapshot.expiresAt,scopes:["nutrition:read","nutrition:calculate","nutrition:export"]};
  return {...snapshot,input:parseMenuInput(snapshot.input),identity};
}
