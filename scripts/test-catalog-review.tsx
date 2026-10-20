import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CatalogReview from "../src/app/quan-tri/bien-tap/CatalogReview";
import {
  filterReview,
  priceChangeLabel,
  returnReviewNote,
  reviewProgress,
  type EntryReview,
} from "../src/lib/catalog-editor/review";
import type {
  CatalogBatch,
  CatalogEntry,
  CatalogPrice,
} from "../src/lib/catalog-editor/contracts";
const before = {
  id: "rice",
  name: "Gạo tẻ",
  source: "RNI",
  sourceCode: "001",
  unit: "g",
  updatedAt: "2026-01-01T00:00:00.000Z",
  foodType: null,
  foodGroup: null,
  proteinOrigin: null,
  imageUrl: null,
  imageSourceUrl: null,
  imageCredit: null,
  imageLicense: null,
  prices: [],
};
const price: CatalogPrice = {
  amountVnd: 20000,
  basis: "per_kg",
  packG: null,
  region: "Trung",
  source: "Fixture",
  sourceUrl: "https://example.org/price",
  asOfDate: "2000-01-01",
  note: "",
};
const entries: CatalogEntry[] = [
  {
    before,
    classificationVersion: "v1",
    proposal: {
      foodId: "rice",
      expectedUpdatedAt: before.updatedAt,
      reason: "Theo tên và thành phần",
      classification: { foodGroup: "Nhóm lương thực" },
    },
  },
  {
    before: { ...before, id: "veg", name: "Rau ngót" },
    classificationVersion: "v1",
    proposal: {
      foodId: "veg",
      expectedUpdatedAt: before.updatedAt,
      reason: "Giá kỹ thuật",
      prices: [price],
    },
  },
  {
    before: { ...before, id: "photo", name: "<script>Ảnh rau</script>" },
    classificationVersion: "v1",
    proposal: {
      foodId: "photo",
      expectedUpdatedAt: before.updatedAt,
      reason: "Ảnh kỹ thuật",
      image: {
        url: "https://example.org/image.jpg",
        sourceUrl: "https://example.org/photo",
        credit: "Fixture",
        license: "PERMISSION",
        licenseNote: "Nguồn kỹ thuật, không xuất bản",
      },
    },
  },
];
let checks = 0;
const eq = (a: unknown, b: unknown) => {
  assert.deepEqual(a, b);
  checks++;
};
const ids = (value: CatalogEntry[]) => value.map((e) => e.proposal.foodId);
eq(ids(filterReview(entries, "all", "gao te", false, {})), ["rice"]);
eq(ids(filterReview(entries, "price", "", false, {})), ["veg"]);
const reviews: Record<string, EntryReview> = {
  rice: { status: "checked", note: "" },
  veg: { status: "needs_fix", note: "Kiểm tra vùng giá" },
};
eq(ids(filterReview(entries, "all", "", true, reviews)), ["veg", "photo"]);
eq(reviewProgress(entries, reviews), {
  total: 3,
  checked: 1,
  needsFix: 1,
  remaining: 2,
  ready: false,
});
eq(
  reviewProgress(entries, {
    rice: { status: "checked", note: "" },
    veg: { status: "checked", note: "" },
    photo: { status: "checked", note: "" },
  }).ready,
  true,
);
eq(reviewProgress([], {}).ready, false);
eq(returnReviewNote(entries, reviews), "Rau ngót: Kiểm tra vùng giá");
const longReason = "x".repeat(1500);
eq(
  returnReviewNote(entries, { veg: { status: "needs_fix", note: longReason } }),
  `Rau ngót: ${longReason}`,
);
eq(priceChangeLabel(undefined, price), "Thêm ghi nhận giá");
eq(
  priceChangeLabel(price, { ...price, amountVnd: 22000 }),
  "Tăng 2.000 đ cùng đơn vị mua",
);
eq(
  priceChangeLabel(price, { ...price, basis: "per_pack", packG: 500 }),
  "Đổi cơ sở/vùng giá · đối chiếu đầy đủ",
);
const batch: CatalogBatch = {
  id: "batch",
  ownerId: "admin",
  keyId: "key",
  principal: "key:key",
  title: "Đợt cần duyệt",
  state: "SUBMITTED",
  revision: 3,
  entriesJson: entries,
  reviewNote: null,
  publishedBy: null,
  publishedAt: null,
  createdAt: before.updatedAt,
  updatedAt: before.updatedAt,
};
const html = renderToStaticMarkup(
  <CatalogReview
    batch={batch}
    isAdmin
    busy={false}
    onDecision={async () => true}
  />,
);
assert.match(html, /Đã xem 0\/3/);
checks++;
assert.match(html, /Kiểm tra và duyệt cả đợt/);
checks++;
assert.match(html, /Thực phẩm đang xem/);
checks++;
assert.doesNotMatch(html, /<script>/);
checks++;
const staff = renderToStaticMarkup(
  <CatalogReview
    batch={batch}
    isAdmin={false}
    busy={false}
    onDecision={async () => true}
  />,
);
assert.doesNotMatch(staff, /Kiểm tra và duyệt cả đợt|Đánh dấu cần sửa/);
checks++;
console.log(
  `Catalog review: ${checks} filter/progress/whole-batch scope, price-unit safeguards, reasons, escaping and permission-render checks passed.`,
);
