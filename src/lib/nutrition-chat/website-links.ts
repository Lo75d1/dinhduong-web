import { getNutritionPublicUrl } from "./oauth-validation";

/** Read-only website links. IDs never grant access to a private saved menu. */
export function nutritionWebsiteLink(kind: "food" | "saved", id: string): string {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new Error("Invalid website record ID");
  return `${getNutritionPublicUrl()}/${kind === "food" ? "thuc-pham" : "ket-noi-ai/ban-luu"}/${id}`;
}

export function isNutritionWebsiteLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === getNutritionPublicUrl() && !url.username && !url.password && !url.search && !url.hash &&
      /^\/(?:thuc-pham|ket-noi-ai\/ban-luu)\/[A-Za-z0-9_-]{1,100}$/.test(url.pathname) && url.href === value;
  } catch { return false; }
}
