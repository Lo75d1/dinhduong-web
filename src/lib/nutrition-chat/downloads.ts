import "server-only";
import { randomBytes } from "node:crypto";
import { buildNutritionWorkbook } from "./workbook";
import { ALL_NUTRIENT_FIELDS } from "../nutrient-fields";
import { loadNutritionCatalogue } from "./repository";
import { createNutritionTicket, readNutritionTicket } from "./approval";
import { getNutritionPublicUrl, enforceNutritionRateLimit } from "./security";
import { NutritionInputError } from "./validation";
import type { NutritionIdentity, ResolvedMenu } from "./contracts";
import {prisma} from "@/lib/prisma";
import {NutritionSecurityError} from "./security";
import {cleanupNutritionDownloads,storeNutritionDownload,readStoredNutritionDownload,NUTRITION_DOWNLOAD_TTL_SECONDS} from "./download-store";
export {cleanupNutritionDownloads,NUTRITION_DOWNLOAD_TTL_SECONDS} from "./download-store";
export async function withNutritionWorkbookSlot<T>(build: () => Promise<T>): Promise<T> {
  return prisma.$transaction(async tx => {
    const slots = await tx.$queryRaw<Array<{ acquired: boolean }>>`SELECT pg_try_advisory_xact_lock(hashtextextended('nutrition-chat-workbook-v1',0)) AS "acquired"`;
    if (!slots[0]?.acquired) throw new NutritionSecurityError("export_busy",503,"Máy chủ đang xuất một file; thử lại sau.",undefined,15);
    return build();
  }, { timeout: 60_000, maxWait: 2000 });
}
export async function exportNutritionMenu(menu: ResolvedMenu,identity: NutritionIdentity) {
  await enforceNutritionRateLimit("nutrition-export-global",{limit:60,windowSeconds:3600});
  return withNutritionWorkbookSlot(async()=>{
    const state=await cleanupNutritionDownloads();
    if(state.bytes>256*1024*1024 || state.files>=100)throw new NutritionInputError("Hàng đợi xuất đang đầy; thử lại sau.","export",503);
    const saved=await prisma.ration.findFirst({where:{ownerId:identity.userId,conversationRevision:{gt:0},conversationJson:{path:["preview","digest"],equals:menu.digest}},orderBy:{updatedAt:"desc"},select:{id:true,conversationRevision:true}});
    const exported=saved?{...menu,savedRecord:{id:saved.id,revision:saved.conversationRevision}}:menu;
    const catalogue=await loadNutritionCatalogue(ALL_NUTRIENT_FIELDS.map(f=>f.key));
    const bytes=await buildNutritionWorkbook(exported,catalogue);
    if(bytes.byteLength>5*1024*1024)throw new NutritionInputError("Excel vượt giới hạn nhập lại 5 MB; chia kỳ hoặc giảm số chất.","export",413);
    const key=randomBytes(24).toString("hex");
    await storeNutritionDownload(key,bytes);
    const ticket=createNutritionTicket("download",key,identity,NUTRITION_DOWNLOAD_TTL_SECONDS);
    return {downloadUrl:`${getNutritionPublicUrl()}/api/nutrition/v1/download/${key}?ticket=${encodeURIComponent(ticket)}`,expiresAt:new Date(Date.now()+NUTRITION_DOWNLOAD_TTL_SECONDS*1000).toISOString(),filename:"Dinh-duong-2598.xlsx"};
  });
}
export async function readNutritionDownload(key:string,ticket:unknown) {
  if(!/^[a-f0-9]{48}$/.test(key))throw new NutritionInputError("Link tải không hợp lệ.","download",404);
  const approval=readNutritionTicket(ticket,"download");
  if(approval.key!==key)throw new NutritionInputError("Link tải không hợp lệ.","download",404);
  // A short-lived capability URL works in platform download clients without cookies.
  return readStoredNutritionDownload(key);
}
