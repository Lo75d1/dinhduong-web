import { mkdir, readdir, readFile, writeFile, unlink, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NutritionInputError } from "./validation";
const DIRECTORY=join(tmpdir(),"dinhduong2598-nutrition-chat-v1");
export const NUTRITION_DOWNLOAD_TTL_SECONDS=600;
function path(key:string){if(!/^[a-f0-9]{48}$/.test(key))throw new NutritionInputError("Link tải không hợp lệ.","download",404);return join(DIRECTORY,`${key}.xlsx`);}
export async function cleanupNutritionDownloads(){
  await mkdir(DIRECTORY,{recursive:true,mode:0o700});
  const files=(await readdir(DIRECTORY)).filter(name=>/^[a-f0-9]{48}\.xlsx$/.test(name));
  let removed=0,bytes=0;
  for(const file of files){const target=join(DIRECTORY,file),info=await stat(target).catch(()=>null);if(!info)continue;if(info.mtimeMs+NUTRITION_DOWNLOAD_TTL_SECONDS*1000<Date.now()){await unlink(target).catch(()=>undefined);removed++;}else bytes+=info.size;}
  return {removed,bytes,files:files.length-removed};
}
export async function storeNutritionDownload(key:string,bytes:Uint8Array){await writeFile(path(key),bytes,{flag:"wx",mode:0o600});}
export async function readStoredNutritionDownload(key:string){
  const target=path(key),info=await stat(target).catch(()=>null);
  if(!info || info.mtimeMs+NUTRITION_DOWNLOAD_TTL_SECONDS*1000<Date.now())throw new NutritionInputError("Link tải đã hết hạn; xuất lại từ hội thoại.","download",410);
  return readFile(target);
}
