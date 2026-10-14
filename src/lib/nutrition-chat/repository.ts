import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { ALL_NUTRIENT_FIELDS, CORE_CALC_FIELDS } from "@/lib/nutrient-fields";
import { searchTokens } from "@/lib/search";
import { normalizeVi } from "@/lib/normalize";
import type { NutritionFood } from "./contracts";
import { NutritionInputError, NUTRIENT_KEYS, NUTRITION_LIMITS } from "./validation";
import { sanitizeNutritionFood } from "./core";

function selectFood(fields: string[]): Prisma.FoodSelect {
  return { id: true, name: true, source: true, sourceCode: true, foodType: true, unit: true, wastePercent: true, foodGroup: true, imageUrl: true, aliases: { orderBy:[{aliasNormalized:"asc"},{id:"asc"}],select: { alias: true, verified: true } }, ...Object.fromEntries([...new Set([...fields,...CORE_CALC_FIELDS.map(f => f.key)])].filter(k => NUTRIENT_KEYS.has(k)).map(k => [k,true])) };
}
export function mapNutritionFood(raw: Record<string,unknown>, fields: string[]): NutritionFood {
  if(raw.unit!=="g" && raw.unit!=="ml")throw new NutritionInputError("Cơ sở đơn vị trong kho chưa được hỗ trợ; cần xác minh nguồn.","food.unit",422);
  const aliases = Array.isArray(raw.aliases) ? raw.aliases as Array<{ alias: string; verified: boolean }> : [];
  return sanitizeNutritionFood({ id: String(raw.id), name: String(raw.name), unit: raw.unit === "ml" ? "ml" : "g", source: { kind: "catalog", label: typeof raw.source === "string" ? raw.source : "Nguồn chưa ghi rõ", confirmed: true }, sourceCode: typeof raw.sourceCode === "string" ? raw.sourceCode : null, foodType: typeof raw.foodType === "string" ? raw.foodType : null, imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : null, wastePercent: typeof raw.wastePercent === "number" && raw.wastePercent >= 0 && raw.wastePercent < 100 ? raw.wastePercent : null, foodGroup: typeof raw.foodGroup === "string" ? raw.foodGroup : null, nutrients: Object.fromEntries([...new Set([...fields,...CORE_CALC_FIELDS.map(f => f.key)])].map(k => [k, typeof raw[k] === "number" && Number.isFinite(raw[k]) ? raw[k] as number : null])), aliases: aliases.map(a => ({ name: a.alias, verified: a.verified })) });
}
export async function loadNutritionFoods(ids: string[], fields: string[]): Promise<NutritionFood[]> {
  if (!ids.length) return [];
  const rows = await prisma.food.findMany({ where: { id: { in: [...new Set(ids)] } }, select: selectFood(fields) });
  return (rows as unknown as Record<string,unknown>[]).map(row => mapNutritionFood(row, fields));
}
export async function loadNutritionCatalogue(fields: string[]): Promise<NutritionFood[]> {
  const rows = await prisma.food.findMany({ orderBy: { id: "asc" }, take: NUTRITION_LIMITS.catalogue + 1, select: selectFood(fields) });
  if (rows.length > NUTRITION_LIMITS.catalogue) throw new NutritionInputError("Danh mục vượt giới hạn xuất offline; cần cấu hình phạm vi danh mục trước khi xuất.", "catalogue", 503);
  return (rows as unknown as Record<string,unknown>[]).map(row => mapNutritionFood(row, fields));
}
function matchRank(name: string, q: string): number {
  const accented = name.toLocaleLowerCase("vi-VN"), query = q.toLocaleLowerCase("vi-VN");
  if (accented === query) return 0;
  if (accented.startsWith(`${query} `) || accented.startsWith(`${query} (`)) return 1;
  if (accented.includes(query)) return 2;
  const n = normalizeVi(name), normalized = normalizeVi(q);
  if (n === normalized) return 3;
  if (n.startsWith(`${normalized} `) || n.startsWith(`${normalized} (`)) return 4;
  return 5;
}
export async function searchNutritionFoods(args: { q: string; type?: string; source?: string; group?: string; limit?: number; offset?: number; fields?: string[] }) {
  const q = args.q?.trim(), tokens = q ? searchTokens(q) : [];
  if (!q || q.length > 120 || !tokens.length) throw new NutritionInputError("Nhập tên thực phẩm từ 1 đến 120 ký tự.", "q");
  if (args.type!==undefined && !["TS","CB","MA","SP"].includes(args.type)) throw new NutritionInputError("Loại thực phẩm không hợp lệ.", "type");
  if (args.source!==undefined && !["VDD","RNI"].includes(args.source)) throw new NutritionInputError("Nguồn lọc không hợp lệ.", "source");
  const limit = args.limit ?? 20, offset = args.offset ?? 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 40 || !Number.isInteger(offset) || offset < 0 || offset > 6000) throw new NutritionInputError("Phân trang không hợp lệ.", "pagination");
  const candidates = await prisma.food.findMany({ where: { ...(args.type ? { foodType: args.type } : {}), ...(args.source ? { source: args.source } : {}), ...(args.group ? { foodGroup: args.group } : {}), AND: tokens.map(token => ({ OR: [{ nameNormalized: { contains: token } }, { aliases: { some: { aliasNormalized: { contains: token } } } }] })) }, orderBy: { id: "asc" }, take: NUTRITION_LIMITS.catalogue + 1, select: { id: true, name: true, aliases: { select: { alias: true, verified: true } } } });
  if (candidates.length > NUTRITION_LIMITS.catalogue) throw new NutritionInputError("Truy vấn quá rộng; thêm tên hoặc bộ lọc.", "q", 422);
  candidates.sort((a,b) => Math.min(matchRank(a.name,q), ...a.aliases.map(x => matchRank(x.alias,q) + 1)) - Math.min(matchRank(b.name,q), ...b.aliases.map(x => matchRank(x.alias,q) + 1)) || a.name.localeCompare(b.name,"vi") || a.id.localeCompare(b.id));
  const slice = candidates.slice(offset,offset+limit), fields = args.fields ?? CORE_CALC_FIELDS.map(f => f.key);
  const foods = await loadNutritionFoods(slice.map(f => f.id), fields), map = new Map(foods.map(f => [f.id,f]));
  return { items: slice.map(f => map.get(f.id)), total: candidates.length, nextOffset: offset + limit < candidates.length ? offset + limit : null, note: "Tên gọi khác có thể chưa được xác minh; chọn đúng nguồn, loại và trạng thái chế biến trước khi chốt." };
}
export async function getNutritionFood(id: string, fields = ALL_NUTRIENT_FIELDS.map(f => f.key)) {
  const foods = await loadNutritionFoods([id], fields);
  if (!foods.length) throw new NutritionInputError("Không tìm thấy thực phẩm.", "foodId", 404);
  return foods[0];
}
export async function searchNutritionDishes(args: { q: string; limit?: number }) {
  const tokens = searchTokens(args.q ?? ""); if (!tokens.length || args.q.length > 120) throw new NutritionInputError("Cần tên món từ 1 đến 120 ký tự.", "q");
  const limit = args.limit ?? 20; if (!Number.isInteger(limit) || limit < 1 || limit > 40) throw new NutritionInputError("Giới hạn kết quả không hợp lệ.", "limit");
  const rows = await prisma.dish.findMany({ where: { AND: tokens.map(token => ({ nameNormalized: { contains: token } })) }, take: 6001, select: { id: true, name: true, source: true, sourceCode: true, totalWeightG: true, servingUnit: true, imageSourceId: true, categoryRaw: true, _count: { select: { ingredients: true } } } });
  if(rows.length>6000)throw new NutritionInputError("Truy vấn món quá rộng; thêm tên cụ thể.","q",422);
  rows.sort((a,b) => matchRank(a.name,args.q) - matchRank(b.name,args.q) || a.name.localeCompare(b.name,"vi"));
  return { items: rows.slice(0,limit).map(row => ({ ...row, ingredientCount: row._count.ingredients, _count: undefined, imageUrl: row.imageSourceId ? `/api/dish-images/rni/${row.imageSourceId}` : null })), total: rows.length };
}
export async function getNutritionDish(id: string) {
  const dish = await prisma.dish.findUnique({ where: { id }, include: { ingredients: { orderBy: { sortOrder: "asc" } } } });
  if (!dish) throw new NutritionInputError("Không tìm thấy công thức món.", "dishId", 404);
  const foods = await loadNutritionFoods(dish.ingredients.flatMap(i => i.foodId ? [i.foodId] : []), CORE_CALC_FIELDS.map(f => f.key));
  const map = new Map(foods.map(f => [f.id,f]));
  return { id: dish.id, name: dish.name, source: dish.source, sourceCode: dish.sourceCode, recipeSource: { kind: "catalog", label: dish.source || "RNI", dishId: dish.id }, totalWeightG: dish.totalWeightG, servingUnit: dish.servingUnit, cookingSteps: dish.cookingSteps, ingredients: dish.ingredients.map(i => ({ id: i.id, foodId: i.foodId, name: i.foodNameRaw, quantity: i.quantityG, unit: "g", food: i.foodId ? map.get(i.foodId) ?? null : null })), note: "Định lượng là công thức nguồn; không mặc định là một khẩu phần hoặc lượng người dùng đã ăn." };
}
export async function loadNutritionRecommendations() { return prisma.nutritionRecommendation.findMany({ orderBy: { stt: "asc" } }); }
