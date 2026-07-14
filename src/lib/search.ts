import { normalizeVi } from "@/lib/normalize";

/**
 * Tách truy vấn thành các từ bắt buộc phải cùng xuất hiện. Cách này tránh việc
 * một từ rất chung (vd. "cá") kéo theo kết quả không liên quan khi người dùng
 * đã gõ tên cụ thể hơn (vd. "cá chép").
 */
export function searchTokens(value: string) {
  return normalizeVi(value)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 0)
    .slice(0, 8);
}

/** Ưu tiên trùng tên hoàn toàn, rồi đến tên bắt đầu bằng truy vấn, sau đó mới đến chứa từ khóa. */
export function searchRank(nameNormalized: string, query: string) {
  const normalizedQuery = searchTokens(query).join(" ");
  const normalizedName = normalizeVi(nameNormalized);
  if (normalizedName === normalizedQuery) return 0;
  if (normalizedName.startsWith(normalizedQuery)) return 1;
  const first = searchTokens(query)[0] ?? "";
  return normalizedName.startsWith(first) ? 2 : 3;
}
