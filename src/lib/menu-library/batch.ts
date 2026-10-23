import type { MenuLibraryDraft } from "./contracts";
import { mealEatingContext } from "./contracts";
import type { BatchRequest, TemplateRef, MealRef } from "./manager-contracts";
import { menuInputError, validateMenuLibraryDraft } from "./validation";
import { validateOperationObject, operationId } from "@/lib/nutrition-chat/service";
export function parseBatchRequest(value: unknown): BatchRequest {
  const base = validateOperationObject(value, ["action", "requestKey", "reason", "items", "tags", "section", "hospitalUse", "meals", "targets", "mode", "item", "dayId", "mealIds"], ["action", "requestKey", "reason"]);
  operationId(base.requestKey, "requestKey");
  if (typeof base.reason !== "string" || !base.reason.trim() || base.reason.length > 500 || /[\x00-\x1f\x7f]/.test(base.reason)) menuInputError("Cần lý do thao tác hợp lệ.", "reason");
  const shape: Record<string, string[]> = {
    trash: ["items"],
    restore: ["items"],
    tag: ["items", "tags"],
    section: ["items", "section", "hospitalUse"],
    remove_meals: ["meals"],
    transfer: ["meals", "targets", "mode"],
    reorder: ["item", "dayId", "mealIds"]
  };
  const fields = shape[String(base.action)];
  if (!fields) menuInputError("Thao tác không hợp lệ.", "action");
  validateOperationObject(value, ["action", "requestKey", "reason", ...fields], ["action", "requestKey", "reason", ...fields]);
  function reference(value: unknown, extra: string[] = []) {
    const ref = validateOperationObject(value, ["id", "revision", ...extra], ["id", "revision", ...extra]);
    operationId(ref.id, "id");
    if (!Number.isSafeInteger(ref.revision) || Number(ref.revision) < 1) menuInputError("Phiên bản thực đơn không hợp lệ.", "revision");
    extra.forEach(key => operationId(ref[key], key));
  }
  for (const [field, extra, max] of [["items", [], 50], ["meals", ["dayId", "mealId", "groupId"], 50], ["targets", ["dayId", "groupId"], 20]] as const) {
    if (!fields.includes(field)) continue;
    const list = base[field];
    if (!Array.isArray(list) || !list.length || list.length > max) menuInputError(`Chọn từ 1 đến ${max} mục cho một lần thao tác.`, field);
    list.forEach(ref => reference(ref, [...extra]));
    const keys = list.map(ref => JSON.stringify([ref.id, ...extra.map(key => ref[key])]));
    if (new Set(keys).size !== keys.length) menuInputError("Có mục được chọn lặp lại.", field);
  }
  if (base.action === "tag" && (!Array.isArray(base.tags) || !base.tags.length || base.tags.length > 20 || base.tags.some(tag => typeof tag !== "string" || !tag.trim() || tag.length > 50 || /[\x00-\x1f\x7f]/.test(tag)))) menuInputError("Nhãn gồm tối đa 20 mục, mỗi mục 50 ký tự.", "tags");
  if (base.action === "section" && (!["individual", "collective", "hospital"].includes(String(base.section)) || (base.section === "hospital" ? !["patient_guidance", "hospital_kitchen"].includes(String(base.hospitalUse)) : base.hospitalUse !== null))) menuInputError("Chọn kho và mục bệnh viện phù hợp.", "section");
  if (base.action === "transfer" && (!["copy", "move"].includes(String(base.mode)) || base.mode === "move" && (base.targets as unknown[]).length !== 1)) menuInputError("Chuyển bữa chỉ nhận một ngày đích; sao chép có thể nhận nhiều ngày.", "mode");
  if (base.action === "reorder") {
    reference(base.item);
    operationId(base.dayId, "dayId");
    if (!Array.isArray(base.mealIds) || base.mealIds.length > 12 || !base.mealIds.length) menuInputError("Danh sách bữa không hợp lệ.", "mealIds");
    base.mealIds.forEach(id => operationId(id, "mealId"));
  }
  return base as BatchRequest;
}
export function batchReferences(operation: BatchRequest): TemplateRef[] {
  const refs = "items" in operation ? operation.items : "meals" in operation ? [...operation.meals, ...("targets" in operation ? operation.targets : [])] : [operation.item];
  const map = new Map<string, TemplateRef>();
  for (const ref of refs) {
    if (map.has(ref.id) && map.get(ref.id)!.revision !== ref.revision) menuInputError("Cùng một thực đơn đang có hai phiên bản. Tải lại trước khi thao tác.", "revision", 409);
    map.set(ref.id, {
      id: ref.id,
      revision: ref.revision
    });
  }
  if (map.size > 50) menuInputError("Mỗi lần thao tác tối đa 50 thực đơn.", "items");
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** Only metadata, order and exact stored portions can change here; no client-supplied food or amount. */
export function applyBatchOperation(originals: Map<string, MenuLibraryDraft>, op: BatchRequest, nextId: () => string) {
  const changed = new Map<string, MenuLibraryDraft>();
  function edit(id: string) {
    if (!changed.has(id)) {
      const source = originals.get(id);
      if (!source) menuInputError("Không tìm thấy thực đơn.", "id", 404);
      const copy = structuredClone(source);
      copy.status = "draft";
      copy.version++;
      changed.set(id, copy);
    }
    return changed.get(id)!;
  }
  function source(ref: MealRef) {
    const menu = originals.get(ref.id),
      day = menu?.days.find(day => day.id === ref.dayId),
      meal = day?.meals.find(meal => meal.id === ref.mealId),
      portion = meal?.groupPortions.find(p => p.groupId === ref.groupId);
    if (!menu || !day || !meal || !portion || !menu.groups.some(group => group.id === ref.groupId)) menuInputError("Bữa đã thay đổi hoặc không thuộc nhóm đang chọn. Tải lại trước khi thao tác.", "meals", 409);
    if (menu.availability?.state === "archived") menuInputError("Khôi phục thực đơn trong thùng rác trước khi dùng bữa.", "availability", 409);
    return {
      menu,
      meal,
      portion
    };
  }
  function remove(ref: MealRef) {
    const menu = edit(ref.id),
      day = menu.days.find(day => day.id === ref.dayId)!,
      meal = day.meals.find(meal => meal.id === ref.mealId)!;
    meal.groupPortions = meal.groupPortions.filter(p => p.groupId !== ref.groupId);
    if (!meal.groupPortions.length) day.meals = day.meals.filter(m => m.id !== meal.id);
  }
  if (op.action === "trash" || op.action === "restore") for (const item of op.items) {
    edit(item.id).availability = {
      state: op.action === "trash" ? "archived" : "active",
      reason: op.action === "trash" ? op.reason.trim() : null
    };
  } else if (op.action === "tag") for (const item of op.items) {
    const menu = edit(item.id);
    menu.tags = [...new Set([...(menu.tags ?? []), ...op.tags.map(tag => tag.trim().replace(/^#+/, ""))])];
  } else if (op.action === "section") for (const item of op.items) {
    const menu = edit(item.id),
      individual = op.section === "individual" || op.section === "hospital" && op.hospitalUse === "patient_guidance";
    if (individual && (menu.groups.length !== 1 || menu.groups.some(group => group.schoolLevel))) menuInputError(`“${menu.title}” có nhiều nhóm hoặc cấp học. Chỉnh nhóm trước khi chuyển sang thực đơn cá thể.`, "section", 422);
    if (individual && menu.days.some(day => day.meals.some(meal => meal.groupPortions.some(portion => portion.mealRuleIds.length)))) menuInputError("Mẫu đang áp dụng quy tắc bữa của đơn vị tập thể. Tạo thực đơn cá thể rồi sao chép các bữa cần dùng sang mẫu mới.", "section", 422);
    menu.librarySection = op.section as MenuLibraryDraft["librarySection"];
    menu.hospitalUse = op.hospitalUse as MenuLibraryDraft["hospitalUse"];
    menu.direction = individual ? "individual" : "collective";
    if (individual) menu.unit = null;else if (op.section === "hospital") {
      if (menu.groups.some(group => group.schoolLevel)) menuInputError("Thực đơn có cấp học cần chỉnh nhóm trước khi chuyển sang suất ăn bệnh lý.", "section", 422);
      menu.unit = {
        id: menu.unit?.id ?? "unit-pending",
        label: menu.unit?.label ?? "Chưa đặt tên đơn vị",
        type: "hospital"
      };
    } else menu.unit = menu.unit ? {
      ...menu.unit,
      type: menu.unit.type === "hospital" ? "other" : menu.unit.type
    } : {
      id: "unit-pending",
      label: "Chưa đặt tên đơn vị",
      type: "other"
    };
  } else if (op.action === "remove_meals") {
    op.meals.forEach(source);
    op.meals.forEach(remove);
  } else if (op.action === "reorder") {
    const menu = edit(op.item.id),
      day = menu.days.find(day => day.id === op.dayId);
    if (!day || new Set(op.mealIds).size !== op.mealIds.length || day.meals.length !== op.mealIds.length || day.meals.some(meal => !op.mealIds.includes(meal.id))) menuInputError("Danh sách bữa đã thay đổi. Tải lại trước khi sắp xếp.", "mealIds", 409);
    day.meals = op.mealIds.map(id => day.meals.find(meal => meal.id === id)!);
  } else if (op.action === "transfer") {
    const sources = op.meals.map(ref => ({
      ref,
      ...source(ref)
    }));
    for (const target of op.targets) {
      const menu = edit(target.id),
        day = menu.days.find(day => day.id === target.dayId);
      if (!day || !menu.groups.some(group => group.id === target.groupId)) menuInputError("Ngày hoặc nhóm nhận bữa không còn tồn tại.", "targets", 409);
      if (menu.availability?.state === "archived") menuInputError("Không thêm bữa vào thực đơn trong thùng rác.", "availability", 409);
      if (day.meals.length + sources.length > 8) menuInputError(`Ngày ${day.dayIndex} của “${menu.title}” đang có ${day.meals.length} bữa. Mỗi ngày tối đa 8 bữa; chọn ít bữa nguồn hơn hoặc chọn ngày khác.`, "targets", 422);
      for (const {
        ref,
        menu: origin,
        meal,
        portion
      } of sources) {
        if (op.mode === "move" && ref.id === target.id && ref.dayId === target.dayId && ref.groupId === target.groupId) menuInputError("Bữa đã ở ngày và nhóm nhận. Dùng kéo sắp xếp nếu cần đổi thứ tự.", "targets", 422);
        const context = mealEatingContext(origin.eatingContext, meal.eatingContext);
        if (menu.eatingContext !== "mixed" && context !== menu.eatingContext) {
          for (const d of menu.days) for (const m of d.meals) m.eatingContext = mealEatingContext(menu.eatingContext, m.eatingContext);
          menu.eatingContext = "mixed";
        }
        // Explicitly copy one portion into the chosen destination group, never scale or relabel it.
        day.meals.push({
          id: nextId(),
          code: meal.code,
          label: meal.label,
          eatingContext: context,
          groupPortions: [{
            groupId: target.groupId,
            headcount: null,
            mealRuleIds: [],
            dishes: portion.dishes.map(dish => ({
              ...structuredClone(dish),
              id: nextId()
            }))
          }]
        });
      }
    }
    if (op.mode === "move") op.meals.forEach(remove);
  }
  for (const [id, menu] of changed) changed.set(id, validateMenuLibraryDraft(menu));
  return changed;
}
