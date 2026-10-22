/** Keep the original catalogue name for inspection; shorten only its English translation on screen. */
export function foodDisplayName(name: string) {
  return name.replace(/\s*\([A-Za-z0-9 ,./;:'’+–&-]+\)\s*$/, "").trim();
}
export function clinicalNumber(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
}
/** Presentation only: these title labels never populate numeric nutrition targets. */
export function menuTitleParts(title: string) {
  const parts = title.split("|").map(part => part.trim()).filter(Boolean);
  if (parts.length < 2) return { title, labels: [] as string[] };
  const labels = parts.filter(part => /^\d+(?:[.,]\d+)?\s*kcal$/i.test(part) || /^\d+\s*bữa$/i.test(part));
  const name = parts.filter(part => !labels.includes(part) && !["Ăn tại nhà", "Tại nhà", "Ngoài quán", "Kết hợp"].includes(part)).join(" · ");
  return { title: name || title, labels };
}
