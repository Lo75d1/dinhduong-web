import type { CatalogEntry, CatalogPrice } from "./contracts";
import { normalizeVi } from "@/lib/normalize";
export type ReviewKind = "all" | "classification" | "price" | "image";
export type EntryReview = { status: "checked" | "needs_fix"; note: string };
export const PRICE_LABELS: Record<string, string> = {
  per_kg: "/ kg",
  per_100g: "/ 100 g",
  per_piece: "/ cái, quả",
  per_pack: "/ gói, hộp",
};
export const CLASSIFY_LABELS = {
  foodType: "Loại thực phẩm",
  foodGroup: "Nhóm thực phẩm",
  proteinOrigin: "Nguồn đạm",
};
export function entryKinds(entry: CatalogEntry): Exclude<ReviewKind, "all">[] {
  const result: Exclude<ReviewKind, "all">[] = [];
  if (entry.proposal.classification) result.push("classification");
  if (entry.proposal.prices?.length) result.push("price");
  if (entry.proposal.image) result.push("image");
  return result;
}
export function filterReview(
  entries: CatalogEntry[],
  kind: ReviewKind,
  query: string,
  onlyUnchecked: boolean,
  reviews: Record<string, EntryReview>,
) {
  const q = normalizeVi(query);
  return entries.filter(
    (e) =>
      (kind === "all" || entryKinds(e).includes(kind)) &&
      (!q ||
        normalizeVi(
          e.before.name +
            " " +
            (e.before.sourceCode ?? "") +
            " " +
            e.proposal.reason,
        ).includes(q)) &&
      (!onlyUnchecked || reviews[e.proposal.foodId]?.status !== "checked"),
  );
}
export function reviewProgress(
  entries: CatalogEntry[],
  reviews: Record<string, EntryReview>,
) {
  const checked = entries.filter(
    (e) => reviews[e.proposal.foodId]?.status === "checked",
  ).length;
  const needsFix = entries.filter(
    (e) => reviews[e.proposal.foodId]?.status === "needs_fix",
  ).length;
  return {
    total: entries.length,
    checked,
    needsFix,
    remaining: entries.length - checked,
    ready: entries.length > 0 && checked === entries.length && needsFix === 0,
  };
}
export function returnReviewNote(
  entries: CatalogEntry[],
  reviews: Record<string, EntryReview>,
) {
  return entries
    .filter((e) => reviews[e.proposal.foodId]?.status === "needs_fix")
    .map(
      (e) =>
        `${e.before.name}: ${reviews[e.proposal.foodId].note.trim() || "Cần đối chiếu lại nguồn và thông tin đề xuất."}`,
    )
    .join("\n");
}
export function priceChangeLabel(
  before: CatalogPrice | undefined,
  after: CatalogPrice,
) {
  if (!before) return "Thêm ghi nhận giá";
  if (
    before.basis !== after.basis ||
    before.packG !== after.packG ||
    before.region !== after.region
  )
    return "Đổi cơ sở/vùng giá · đối chiếu đầy đủ";
  const delta = after.amountVnd - before.amountVnd;
  return delta === 0
    ? "Giữ giá · kiểm tra nguồn/ngày"
    : `${delta > 0 ? "Tăng" : "Giảm"} ${Math.abs(delta).toLocaleString("vi-VN")} đ cùng đơn vị mua`;
}
