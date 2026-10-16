import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { NutritionIdentity } from "@/lib/nutrition-chat/contracts";
import { NutritionInputError, parseCustomFoodInput, parseMenuInput } from "@/lib/nutrition-chat/validation";
import { nutritionDigest } from "@/lib/nutrition-chat/core";
import { getSavedNutritionMenu, operationId, prepareNutritionMenu, validateOperationObject } from "@/lib/nutrition-chat/service";

export type PersonalLibraryKind = "food" | "dish";
export function personalLibraryKind(value: unknown): PersonalLibraryKind {
  if (value !== "food" && value !== "dish") throw new NutritionInputError("Loại thư viện không hợp lệ.", "kind");
  return value;
}
// These delegates have identical scalar fields and the same owner relation.
// Pin the shared signature rather than calling a union of Prisma generics.
const model = (db: Prisma.TransactionClient, kind: PersonalLibraryKind): Prisma.TransactionClient["personalFood"] => kind === "food" ? db.personalFood : db.personalDish as unknown as Prisma.TransactionClient["personalFood"];
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const summary = { id: true, name: true, revision: true, updatedAt: true } as const;
export function personalListParams(params: { q?: unknown; page?: unknown }) {
  return { q: typeof params.q === "string" ? params.q.trim().slice(0, 100) : "", page: typeof params.page === "string" && /^\d{1,3}$/.test(params.page) ? Math.min(500, Number(params.page)) : 0 };
}
export async function listPersonalLibrary(kind: PersonalLibraryKind, q: string, page: number, identity: NutritionIdentity) {
  if (typeof q !== "string" || q.length > 100 || !Number.isInteger(page) || page < 0 || page > 500) throw new NutritionInputError("Tìm kiếm hoặc phân trang không hợp lệ.");
  const items = await model(prisma, kind).findMany({ where: { ownerId: identity.userId, ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) }, select: summary, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], skip: page * 20, take: 21 });
  return { items: items.slice(0, 20), nextPage: items.length > 20 ? page + 1 : null };
}
export async function getPersonalLibraryItem(kind: PersonalLibraryKind, id: string, identity: NutritionIdentity) {
  const item = await model(prisma, kind).findFirst({ where: { id: operationId(id, "id"), ownerId: identity.userId }, select: { ...summary, content: true } });
  if (!item) throw new NutritionInputError("Không tìm thấy mục thuộc tài khoản của bạn.", "id", 404);
  if (kind === "food") {
    // Two revisions may coexist in one menu. A stable record ID alone would make
    // the calculator mistake distinct nutrient snapshots for the same source.
    const food = parseCustomFoodInput(item.content);
    return { ...item, content: json({ ...food, id: `${item.id}_v${item.revision}` }), preview: undefined };
  }
  const prepared = kind === "dish" ? await prepareNutritionMenu(item.content, identity) : null;
  return { ...item, ...(prepared ? { preview: prepared.preview } : {}) };
}
export async function savePersonalLibraryItem(kind: PersonalLibraryKind, value: unknown, identity: NutritionIdentity) {
  const args = validateOperationObject(value, ["content", "id", "expectedRevision", "requestKey", "reason", "confirmed"], ["content", "requestKey", "reason", "confirmed"]);
  const requestKey = operationId(args.requestKey, "requestKey"), id = args.id === undefined ? undefined : operationId(args.id, "id");
  const next = id ?? `personal_${nutritionDigest([identity.userId, requestKey]).slice(0, 40)}`;
  if (args.confirmed !== true) throw new NutritionInputError("Xem trước và xác nhận dữ liệu trước khi lưu.", "confirmed");
  if (typeof args.reason !== "string" || args.reason.trim().length < 5 || args.reason.length > 500) throw new NutritionInputError("Ghi lý do lưu từ 5 đến 500 ký tự.", "reason");
  const reason = args.reason.trim();
  if (id && (!Number.isInteger(args.expectedRevision) || Number(args.expectedRevision) < 1)) throw new NutritionInputError("Đọc lại phiên bản trước khi sửa.", "expectedRevision", 409);
  if (!id && args.expectedRevision !== undefined) throw new NutritionInputError("Phiên bản chỉ dùng khi cập nhật.", "expectedRevision");
  let content, name: string;
  if (kind === "food") {
    content = parseCustomFoodInput(args.content);
    content.id = next;
    name = content.name;
  } else {
    const input = parseMenuInput(args.content);
    if (input.days.length !== 1 || input.comparison.mode !== "none" || input.profile) throw new NutritionInputError("Món riêng là một công thức, không kèm hồ sơ hoặc nhu cầu.", "content");
    if (input.days[0].rows.some(row => row.dish !== input.title)) throw new NutritionInputError("Các nguyên liệu phải cùng tên món của công thức.", "content");
    content = (await prepareNutritionMenu(input, identity)).input;
    name = content.title;
  }
  const bytes = Buffer.byteLength(JSON.stringify(content));
  if (bytes > 512 * 1024) throw new NutritionInputError("Mục thư viện vượt 512 KB.", "content", 413);
  const data = json(content), digest = nutritionDigest(content);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`personal-library:${identity.userId}`}, 0))::text`;
    const store = model(tx, kind);
    const retry = await store.findFirst({ where: { ownerId: identity.userId, requestKey } });
    if (retry) {
      if ((id && id !== retry.id) || nutritionDigest(retry.content) !== digest) throw new NutritionInputError("Mã lưu đã dùng cho nội dung khác.", "requestKey", 409);
      return { id: retry.id, name: retry.name, revision: retry.revision, replayed: true };
    }
    const previous = id ? await store.findFirst({ where: { id, ownerId: identity.userId } }) : null;
    if (id && !previous) throw new NutritionInputError("Không tìm thấy mục thuộc tài khoản của bạn.", "id", 404);
    if (previous && previous.revision !== args.expectedRevision) throw new NutritionInputError("Mục này vừa được sửa. Mở lại rồi cập nhật để tránh ghi đè.", "expectedRevision", 409);
    const usage = await tx.$queryRaw<Array<{ bytes: number }>>`SELECT COALESCE(SUM(size),0)::double precision AS bytes FROM (
      SELECT pg_column_size(content) AS size FROM personal_foods WHERE "ownerId"=${identity.userId} AND id<>${id ?? ""}
      UNION ALL SELECT pg_column_size(content) FROM personal_dishes WHERE "ownerId"=${identity.userId} AND id<>${id ?? ""}) sizes`;
    if ((usage[0]?.bytes ?? 0) + bytes > 25 * 1024 * 1024) throw new NutritionInputError("Thư viện cá nhân đã đạt 25 MB.", "quota", 409);
    if (!id && await store.count({ where: { ownerId: identity.userId } }) >= 200) throw new NutritionInputError("Đã đạt 200 mục loại này. Xóa mục không dùng hoặc cập nhật mục đã có.", "quota", 409);
    if (id) {
      const changed = await store.updateMany({ where: { id, ownerId: identity.userId, revision: Number(args.expectedRevision) }, data: { name, content: data, requestKey, revision: { increment: 1 }, updatedAt: new Date() } });
      if (changed.count !== 1) throw new NutritionInputError("Mục này vừa được sửa. Đọc lại trước khi lưu.", "expectedRevision", 409);
    }
    else await store.create({ data: { id: next, ownerId: identity.userId, name, content: data, requestKey } });
    const revision = (previous?.revision ?? 0) + 1;
    await tx.dataChangeLog.create({ data: { entityType: kind === "food" ? "PersonalFood" : "PersonalDish", entityId: next, action: id ? "UPDATE" : "CREATE", actorId: identity.userId, actorName: "Chủ tài khoản", beforeJson: previous ? { name: previous.name, revision: previous.revision } : undefined, afterJson: { name, revision }, reason } });
    return { id: next, name, revision, replayed: false };
  }, { timeout: 15_000 });
}
export async function personalLibraryDraftFromMenu(kind: PersonalLibraryKind, rationId: string, rowId: string, identity: NutritionIdentity) {
  const saved = await getSavedNutritionMenu(operationId(rationId, "rationId"), identity);
  const day = saved.input.days.find(day => day.rows.some(row => row.id === rowId)), row = day?.rows.find(row => row.id === rowId);
  if (!row || !day) throw new NutritionInputError("Không tìm thấy nguyên liệu trong bản lưu.", "row", 404);
  if (kind === "food") {
    if (!row.customFood) throw new NutritionInputError("Thực phẩm này đã có trong kho chung; không cần tạo bản số liệu trùng.", "row", 422);
    return { content: row.customFood, names: {}, sourceLabel: saved.ration.title };
  }
  const rows = day.rows.filter(item => item.meal === row.meal && item.dish === row.dish);
  const input = { title: row.dish, mode: "menu" as const, comparison: { mode: "none" as const }, days: [{ id: "recipe", date: "", label: "Công thức", rows }] };
  const resolved = saved.preview.days.flatMap(day => day.rows);
  return { content: input, names: Object.fromEntries(rows.map(row => [row.id, resolved.find(item => item.id === row.id)?.food.name ?? row.customFood?.name ?? row.dish])), sourceLabel: saved.ration.title };
}
export async function deletePersonalLibraryItem(kind: PersonalLibraryKind, value: unknown, identity: NutritionIdentity) {
  const args = validateOperationObject(value, ["id", "expectedRevision", "reason"], ["id", "expectedRevision", "reason"]);
  const id = operationId(args.id, "id");
  if (!Number.isInteger(args.expectedRevision) || Number(args.expectedRevision) < 1 || typeof args.reason !== "string" || args.reason.trim().length < 5 || args.reason.length > 500) throw new NutritionInputError("Cần phiên bản và lý do xóa hợp lệ.");
  const reason = args.reason.trim();
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`personal-library:${identity.userId}`}, 0))::text`;
    const store = model(tx, kind), item = await store.findFirst({ where: { id, ownerId: identity.userId } });
    if (!item) throw new NutritionInputError("Không tìm thấy mục thuộc tài khoản của bạn.", "id", 404);
    if (item.revision !== args.expectedRevision) throw new NutritionInputError("Mục này vừa được sửa. Đọc lại trước khi xóa.", "expectedRevision", 409);
    await store.deleteMany({ where: { id, ownerId: identity.userId, revision: Number(args.expectedRevision) } });
    await tx.dataChangeLog.create({ data: { entityType: kind === "food" ? "PersonalFood" : "PersonalDish", entityId: id, action: "DELETE", actorId: identity.userId, actorName: "Chủ tài khoản", beforeJson: { name: item.name, revision: item.revision }, reason } });
    return { deleted: true };
  });
}
