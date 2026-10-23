/** References only: image bytes never belong in menu documents or their history. */
export type MealIllustration = { assetId: string; alt: string; sourceKind: "ai" | "manual" };
export const MENU_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const MENU_IMAGE_JSON_BYTES = Math.ceil(MENU_IMAGE_MAX_BYTES / 3) * 4 + 65536;
export const MENU_IMAGE_ID_PATTERN = "^[a-f0-9]{64}$";
export function menuIllustrationUrl(assetId: string) {
  return new RegExp(MENU_IMAGE_ID_PATTERN).test(assetId) ? `/api/menu-library/images/${assetId}` : "";
}
export function illustrationCaption(sourceKind: MealIllustration["sourceKind"]) {
  return sourceKind === "ai" ? "Ảnh minh hoạ do AI tạo" : "Ảnh minh hoạ";
}
