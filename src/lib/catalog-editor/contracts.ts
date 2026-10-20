import { FOOD_GROUP_ORDER, PROTEIN_ORIGIN_ORDER } from "@/lib/food-classify";
export const CATALOG_TYPES = ["TS", "CB", "MA", "SP"] as const;
export const IMAGE_LICENSES = [
  "CC0",
  "CC_BY",
  "CC_BY_SA",
  "OWNED",
  "PERMISSION",
] as const;
export const CLASSIFICATION_VERSION = "food-groups-2598-v1";
export const MAX_BATCH_ENTRIES = 25;
export { FOOD_GROUP_ORDER, PROTEIN_ORIGIN_ORDER };
export type CatalogPrice = {
  id?: string;
  region: "Bắc" | "Trung" | "Nam" | null;
  amountVnd: number;
  basis: "per_kg" | "per_100g" | "per_piece" | "per_pack";
  packG: number | null;
  source: string;
  sourceUrl: string;
  asOfDate: string;
  note: string;
};
export type CatalogImage = {
  url: string;
  sourceUrl: string;
  credit: string;
  license: (typeof IMAGE_LICENSES)[number];
  licenseNote: string;
};
export type CatalogProposal = {
  foodId: string;
  expectedUpdatedAt: string;
  reason: string;
  classification?: {
    foodType?: string;
    foodGroup?: string;
    proteinOrigin?: string;
  };
  image?: CatalogImage;
  prices?: CatalogPrice[];
};
export type CatalogFood = {
  id: string;
  name: string;
  source: string;
  sourceCode: string | null;
  unit: string;
  updatedAt: string;
  foodType: string | null;
  foodGroup: string | null;
  proteinOrigin: string | null;
  imageUrl: string | null;
  imageSourceUrl: string | null;
  imageCredit: string | null;
  imageLicense: string | null;
  prices: Array<
    CatalogPrice & { id: string; createdAt?: string; updatedAt?: string }
  >;
};
export type CatalogEntry = {
  proposal: CatalogProposal;
  before: CatalogFood;
  classificationVersion: string;
};
export type CatalogBatch = {
  id: string;
  ownerId: string;
  keyId: string | null;
  principal: string;
  title: string;
  state: "DRAFT" | "SUBMITTED" | "RETURNED" | "PUBLISHED" | "ARCHIVED";
  revision: number;
  entriesJson: CatalogEntry[];
  reviewNote: string | null;
  publishedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type CatalogBatchSummary = Omit<CatalogBatch, "entriesJson"> & {
  entryCount: number;
};
export type CatalogKey = {
  id: string;
  ownerId: string;
  label: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};
