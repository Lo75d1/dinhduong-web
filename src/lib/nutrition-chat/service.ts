import "server-only";
import { prisma } from "@/lib/prisma";
import { parseMenuInput, NutritionInputError } from "./validation";
import { resolveMenu, assertMenuComplete, nutritionDigest } from "./core";
import { createNutritionTicket, verifyNutritionTicket } from "./approval";
import { loadNutritionFoods, loadNutritionRecommendations } from "./repository";
import type { NutritionIdentity, ResolvedMenu } from "./contracts";
import type { Prisma } from "@/generated/prisma/client";
import { nutritionWebsiteLink } from "./website-links";
import { nutritionMenuReview } from "./menu-review";

type AuditRow={rowId:string;before:unknown;after:unknown};
type AuditEntry={revision:number;confirmedAt:string;clientId:string;dataVersion:string;changes:AuditRow[]};
type SavedConversation = { version: 1; inputDigest: string; requestKey: string; requestDigest: string; preview: ResolvedMenu; savedAt: string;history?:AuditEntry[];historyTruncated?:boolean };
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
function snapshot(value: unknown): SavedConversation {
  const saved = value as SavedConversation | null;
  if (!saved || saved.version !== 1 || !saved.preview?.input) throw new NutritionInputError("Bản lưu này không thuộc luồng hội thoại.", "rationId", 409);
  return saved;
}
export function validateOperationObject(value: unknown, keys: string[], required: string[] = []): Record<string,unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new NutritionInputError("Cần dữ liệu dạng đối tượng.");
  const data = value as Record<string,unknown>;
  for (const key of Object.keys(data)) if (!keys.includes(key)) throw new NutritionInputError(`Trường không được phép: ${key}`, key);
  for (const key of required) if (!(key in data)) throw new NutritionInputError(`Thiếu trường ${key}.`, key);
  return data;
}
export function operationId(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(value)) throw new NutritionInputError("ID không hợp lệ.", field);
  return value;
}
export async function prepareNutritionMenu(value: unknown, identity: NutritionIdentity) {
  const input = parseMenuInput(value), rows = input.days.flatMap(day => day.rows);
  const foodIds = rows.flatMap(row => [row.foodId, row.replacedFromFoodId].filter((id): id is string => Boolean(id)));
  const recipeIds = [...new Set(rows.flatMap(row => row.recipeSource.dishId ? [row.recipeSource.dishId] : []))];
  const [foods, recommendations, recipes] = await Promise.all([
    loadNutritionFoods(foodIds, input.fields!),
    input.comparison.mode === "profile" ? loadNutritionRecommendations() : Promise.resolve([]),
    recipeIds.length ? prisma.dish.findMany({ where: { id: { in: recipeIds } }, select: { id: true, name: true, source: true } }) : Promise.resolve([]),
  ]);
  const known = new Set(foods.map(food => food.id)), recipeMap = new Map(recipes.map(dish => [dish.id,dish]));
  for (const row of rows) {
    if (row.recipeSource.kind === "catalog" && !row.recipeSource.dishId) {
      const food = foods.find(food => food.id === row.foodId);
      if (food?.source.kind !== "catalog" || food.source.label !== "VDD" || food.foodType !== "MA") throw new NutritionInputError("Công thức kho cần Dish ID; món tự nhập chọn nguồn user hoặc ai.", `row.${row.id}.recipeSource`, 422);
      row.recipeSource.label = `VDD: ${food.name}`;
    }
    if (row.replacedFromFoodId && !known.has(row.replacedFromFoodId)) throw new NutritionInputError("Food ID nguyên liệu được thay không còn tồn tại.", `row.${row.id}.replacedFromFoodId`, 422);
    if (row.recipeSource.dishId) {
      const original = recipeMap.get(row.recipeSource.dishId);
      if (!original) throw new NutritionInputError("Dish ID công thức gốc không tồn tại.", `row.${row.id}.recipeSource`, 422);
      // Catalogue provenance comes from the server. Variants keep the original ID plus changes.
      if (row.recipeSource.kind === "catalog") row.recipeSource.label = `${original.source || "Kho Dinh dưỡng 2598"}: ${original.name}`;
    }
  }
  const preview = resolveMenu(input, foods, recommendations);
  return { input, preview, review: nutritionMenuReview(preview), confirmationToken: createNutritionTicket("confirm", preview.digest, identity), expiresAt: new Date(Date.now()+600_000).toISOString() };
}
export async function confirmedNutritionMenu(args: Record<string,unknown>, identity: NutritionIdentity) {
  const prepared = await prepareNutritionMenu(args.input, identity);
  verifyNutritionTicket(args.confirmationToken, "confirm", prepared.preview.digest, identity);
  assertMenuComplete(prepared.preview);
  return prepared.preview;
}
function savedResult(ration: { id: string; title: string; conversationRevision: number; conversationJson: unknown }) {
  const saved = snapshot(ration.conversationJson);
  return { ration: { id: ration.id, title: ration.title, revision: ration.conversationRevision, url: nutritionWebsiteLink("saved", ration.id) }, input: saved.preview.input, preview: saved.preview };
}
function auditRows(menu:ResolvedMenu){
  return new Map(menu.input.days.flatMap(day=>day.rows.map(row=>[row.id,{dayId:day.id,...row}] as const)));
}
function changes(before:ResolvedMenu|undefined,after:ResolvedMenu):AuditRow[]{
  const oldRows=before?auditRows(before):new Map<string,unknown>(),newRows=auditRows(after);
  return [...new Set([...oldRows.keys(),...newRows.keys()])].flatMap(rowId=>{
    const old=oldRows.get(rowId)??null,next=newRows.get(rowId)??null;
    return nutritionDigest(old)===nutritionDigest(next)?[]:[{rowId,before:old,after:next}];
  });
}
export async function saveNutritionMenu(args: Record<string,unknown>, identity: NutritionIdentity) {
  const input = parseMenuInput(args.input), requestKey = operationId(args.idempotencyKey, "idempotencyKey");
  const rationId = args.rationId === undefined ? undefined : operationId(args.rationId,"rationId");
  if (rationId && (!Number.isInteger(args.expectedRevision) || Number(args.expectedRevision) < 1)) throw new NutritionInputError("Cập nhật cần revision đã đọc để tránh ghi đè bản khác.","expectedRevision",409);
  if (!rationId && args.expectedRevision !== undefined) throw new NutritionInputError("Revision chỉ dùng khi cập nhật bản có ID.","expectedRevision");
  const requestDigest = nutritionDigest({ input, rationId, expectedRevision: args.expectedRevision });
  const existing = rationId ? await prisma.ration.findFirst({where:{id:rationId,ownerId:identity.userId}}) : await prisma.ration.findUnique({where:{ownerId_conversationRequestKey:{ownerId:identity.userId,conversationRequestKey:requestKey}}});
  if (rationId && !existing) throw new NutritionInputError("Không tìm thấy bản thuộc tài khoản.","rationId",404);
  if (existing) {
    const saved = snapshot(existing.conversationJson);
    if ((!rationId || saved.requestKey === requestKey)) {
      if (saved.requestDigest !== requestDigest) throw new NutritionInputError("Mã yêu cầu đã dùng cho nội dung khác.","idempotencyKey",409);
      return {...savedResult(existing),replayed:true};
    }
  }
  const preview = await confirmedNutritionMenu(args,identity);
  const saved: SavedConversation = {version:1,inputDigest:nutritionDigest(preview.input),requestKey,requestDigest,preview,savedAt:new Date().toISOString()};
  if (Buffer.byteLength(JSON.stringify(saved)) > 5*1024*1024) throw new NutritionInputError("Bản lưu vượt dung lượng cho phép; chia kỳ thực đơn.","input",413);
  return prisma.$transaction(async tx => {
    // Serializes per-owner quota and create/retry across all VPS workers.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`nutrition-menu:${identity.userId}`}, 0))::text`;
    const current=rationId?await tx.ration.findFirst({where:{id:rationId,ownerId:identity.userId}}):null;
    const prior=current?snapshot(current.conversationJson):undefined;
    const retry=!rationId?await tx.ration.findUnique({where:{ownerId_conversationRequestKey:{ownerId:identity.userId,conversationRequestKey:requestKey}}}):current && prior?.requestKey===requestKey?current:null;
    if(retry){if(snapshot(retry.conversationJson).requestDigest!==requestDigest)throw new NutritionInputError("Mã yêu cầu đã dùng cho nội dung khác.","idempotencyKey",409);return {...savedResult(retry),replayed:true};}
    if(rationId && (!current || current.conversationRevision!==Number(args.expectedRevision)))throw new NutritionInputError("Bản đã thay đổi; đọc lại rồi chốt cập nhật.","expectedRevision",409);
    const entries=[...(prior?.history??[]),{revision:(current?.conversationRevision??0)+1,confirmedAt:saved.savedAt,clientId:identity.clientId,dataVersion:preview.dataVersion,changes:changes(prior?.preview,preview)}];
    saved.history=entries.slice(-20);saved.historyTruncated=(prior?.historyTruncated??false) || entries.length>20;
    if(Buffer.byteLength(JSON.stringify(saved))>5*1024*1024)throw new NutritionInputError("Bản và lịch sử vượt 5 MB; lưu kỳ mới thay vì gộp thêm.","quota",413);
    const usage=await tx.$queryRaw<Array<{bytes:number}>>`SELECT COALESCE(SUM(pg_column_size("conversationJson")),0)::double precision AS "bytes" FROM "rations" WHERE "ownerId"=${identity.userId} AND "id"<>${rationId??""}`;
    if((usage[0]?.bytes??0)+Buffer.byteLength(JSON.stringify(saved))>25*1024*1024)throw new NutritionInputError("Bản cá nhân đã đạt hạn mức 25 MB; xóa bản không dùng hoặc giảm kỳ thực đơn.","quota",409);
    const data = {title:preview.title,conversationJson:json(saved)};
    if (rationId) {
      const update = await tx.ration.updateMany({where:{id:rationId,ownerId:identity.userId,conversationRevision:Number(args.expectedRevision)},data:{...data,conversationRevision:{increment:1}}});
      if (update.count !== 1) {
        const current = await tx.ration.findFirst({where:{id:rationId,ownerId:identity.userId}});
        if (current) { const prior = snapshot(current.conversationJson); if (prior.requestKey === requestKey && prior.requestDigest === requestDigest) return {...savedResult(current),replayed:true}; }
        throw new NutritionInputError("Bản đã thay đổi; đọc lại rồi chốt cập nhật.","expectedRevision",409);
      }
      const ration = await tx.ration.findUniqueOrThrow({where:{id:rationId}});
      return {...savedResult(ration),replayed:false};
    }
    if (await tx.ration.count({where:{ownerId:identity.userId,conversationRevision:{gt:0}}}) >= 200) throw new NutritionInputError("Đã đạt 200 bản hội thoại; cập nhật một bản đã lưu hoặc xóa bản không dùng.","quota",409);
    // Ration owns the private copy. The typed snapshot preserves days, ml and missing
    // values that the legacy single-day RationItem Float columns cannot represent.
    const ration = await tx.ration.create({data:{...data,ownerId:identity.userId,conversationRevision:1,conversationRequestKey:requestKey}});
    return {...savedResult(ration),replayed:false};
  },{timeout:15_000});
}
export async function getSavedNutritionMenu(id: string, identity: NutritionIdentity) {
  const ration = await prisma.ration.findFirst({where:{id:operationId(id,"rationId"),ownerId:identity.userId,conversationRevision:{gt:0}}});
  if (!ration) throw new NutritionInputError("Không tìm thấy bản thuộc tài khoản.","rationId",404);
  const saved = savedResult(ration), prepared = await prepareNutritionMenu(saved.input,identity);
  const history=snapshot(ration.conversationJson);
  return {...saved,input:prepared.input,preview:prepared.preview,review:prepared.review,confirmationToken:prepared.confirmationToken,sourceChanged:prepared.preview.dataVersion !== saved.preview.dataVersion,savedDataVersion:saved.preview.dataVersion,history:history.history??[],historyTruncated:history.historyTruncated??false};
}
export async function listSavedNutritionMenus(offset: number, identity: NutritionIdentity) {
  if (!Number.isInteger(offset) || offset < 0 || offset > 200) throw new NutritionInputError("Phân trang không hợp lệ.","offset");
  const items = await prisma.ration.findMany({where:{ownerId:identity.userId,conversationRevision:{gt:0}},orderBy:[{updatedAt:"desc"},{id:"asc"}],skip:offset,take:21,select:{id:true,title:true,conversationRevision:true,createdAt:true,updatedAt:true}});
  return {items:items.slice(0,20).map(item=>({...item,revision:item.conversationRevision,conversationRevision:undefined,url:nutritionWebsiteLink("saved",item.id)})),nextOffset:items.length>20?offset+20:null};
}
export async function deleteSavedNutritionMenu(id:string,revision:number,identity:NutritionIdentity){
  if(!Number.isInteger(revision) || revision<1)throw new NutritionInputError("Cần phiên bản bản lưu đang xem.","expectedRevision",409);
  const result=await prisma.ration.deleteMany({where:{id:operationId(id,"rationId"),ownerId:identity.userId,conversationRevision:revision}});
  if(result.count!==1)throw new NutritionInputError("Không tìm thấy bản hoặc bản đã thay đổi; đọc lại trước khi xóa.","rationId",409);
  return {deleted:true};
}
