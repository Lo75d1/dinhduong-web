import type { MenuLibraryDraft } from "./contracts";

/** Explicit metadata wins. Only documented legacy IDs/units have a fallback;
 * never guess ages or clinical suitability from a menu title. */
export function librarySection(draft: MenuLibraryDraft) {
  return draft.librarySection ?? (draft.unit?.type === "hospital" || draft.id.startsWith("hospital-patient-")
    ? "hospital" : draft.direction);
}
export function hospitalUse(draft: MenuLibraryDraft) {
  return draft.hospitalUse ?? (librarySection(draft) === "hospital"
    ? draft.direction === "individual" ? "patient_guidance" : "hospital_kitchen" : null);
}
export function hasReferenceProfileInputs(profile: MenuLibraryDraft["groups"][number]["recommendationProfile"]) {
  return !profile || !!profile.age.trim() && Number.isFinite(Number(profile.age)) && Number(profile.age) >= 0
    && ["tuoi", "thang"].includes(profile.ageUnit) && ["Nam", "Nữ"].includes(profile.gender)
    && ["sedentary", "light", "moderate", "heavy", "very_heavy"].includes(profile.activityLevel)
    && ["normal", "pregnant_1", "pregnant_2", "pregnant_3", "lactating_1", "lactating_2"].includes(profile.physiology);
}
/** Empty editor lines are not instructions. Preserve actual text and order. */
export function tidyInstructions(draft: MenuLibraryDraft): MenuLibraryDraft {
  const clean = structuredClone(draft);
  const lines = (items: string[]) => items.map(item => item.trim()).filter(Boolean);
  for (const group of clean.groups) if (group.guidance) {
    group.guidance.notes = lines(group.guidance.notes);
    group.guidance.recommendations = lines(group.guidance.recommendations);
  }
  for (const day of clean.days) for (const meal of day.meals) for (const portion of meal.groupPortions) for (const dish of portion.dishes) if (dish.preparation) {
    dish.preparation.steps = lines(dish.preparation.steps);
    dish.preparation.notes = lines(dish.preparation.notes);
  }
  return clean;
}
export function contentReadiness(draft: MenuLibraryDraft, dayId?: string, groupId?: string): string[] {
  const issues: string[] = [];
  if (draft.availability?.state === "archived") issues.push("Mẫu đã ngừng dùng: " + draft.availability.reason);
  for (const group of draft.groups.filter(group => !groupId || group.id === groupId)) {
    const label = group.label;
    if (!group.lifeStage) issues.push(`${label}: chưa phân loại Ăn dặm / Trẻ em / Người lớn.`);
    if (group.lifeStage === "complementary_feeding" && !group.ageMonths) issues.push(`${label}: thiếu khoảng tuổi theo tháng.`);
    if (!group.guidance?.notes.length) issues.push(`${label}: thiếu lưu ý cho người ăn / người chăm sóc.`);
    if (!group.guidance?.recommendations.length) issues.push(`${label}: thiếu khuyến nghị sử dụng thực đơn.`);
    for (const day of draft.days.filter(day => !dayId || day.id === dayId)) {
      for (const meal of day.meals) {
        for (const dish of meal.groupPortions.find(portion => portion.groupId === group.id)?.dishes ?? []) {
          const prefix = `Ngày ${day.dayIndex} · ${meal.label} · ${dish.label}`;
          if (!dish.preparation?.method || !dish.preparation?.steps.length) issues.push(`${prefix}: thiếu cách chế biến.`);
          if (!dish.preparation?.texture) issues.push(`${prefix}: thiếu kết cấu món.`);
          if (!dish.preparation?.notes.length) issues.push(`${prefix}: thiếu lưu ý chế biến / phục vụ.`);
        }
      }
    }
  }
  return issues;
}
