import { isIP } from "node:net";
import {
  CATALOG_TYPES,
  FOOD_GROUP_ORDER,
  IMAGE_LICENSES,
  MAX_BATCH_ENTRIES,
  PROTEIN_ORIGIN_ORDER,
  type CatalogProposal,
  type CatalogPrice,
} from "./contracts";
import {
  isPriceBasis,
  isPriceRegion,
  basisNeedsPackWeight,
} from "@/lib/food-price";
export class CatalogError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function fail(message: string, status = 400): never {
  throw new CatalogError(status, message);
}
export function object(
  value: unknown,
  allowed: string[],
  required: string[] = [],
) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("Cần gửi một đối tượng JSON.");
  const result = value as Record<string, unknown>;
  if (
    Object.keys(result).some((key) => !allowed.includes(key)) ||
    required.some((key) => !Object.hasOwn(result, key))
  )
    fail("Có trường bị khóa, không được hỗ trợ hoặc còn thiếu.");
  return result;
}
export function text(value: unknown, label: string, max = 1000) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    fail(`${label} chưa hợp lệ.`);
  return value.trim();
}
export function id(value: unknown) {
  const v = text(value, "ID", 100);
  if (!/^[A-Za-z0-9_-]+$/.test(v)) fail("ID chưa hợp lệ.");
  return v;
}
export function revision(value: unknown) {
  if (!Number.isSafeInteger(value) || (value as number) < 1)
    fail("Cần phiên bản bản nháp hợp lệ.");
  return value as number;
}
export function publicUrl(value: unknown) {
  const v = text(value, "URL nguồn", 2000);
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return fail("URL nguồn chưa hợp lệ.");
  }
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    isIP(host.replace(/^\[|\]$/g, "")) ||
    !host.includes(".") ||
    /(?:^|\.)(localhost|local|internal|test|invalid)$/.test(host)
  )
    fail("Dùng URL HTTPS công khai, không chứa thông tin đăng nhập.");
  return url.href;
}
function date(value: unknown) {
  const v = text(value, "Ngày ghi nhận", 10),
    parsed = new Date(v + "T00:00:00.000Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== v ||
    v > new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" })
  )
    fail("Ngày ghi nhận phải là ngày hợp lệ, không nằm trong tương lai.");
  return v;
}
function price(value: unknown): CatalogPrice {
  const v = object(
    value,
    [
      "id",
      "region",
      "amountVnd",
      "basis",
      "packG",
      "source",
      "sourceUrl",
      "asOfDate",
      "note",
    ],
    ["region", "amountVnd", "basis", "source", "sourceUrl", "asOfDate"],
  );
  if (
    typeof v.amountVnd !== "number" ||
    !Number.isFinite(v.amountVnd) ||
    v.amountVnd <= 0 ||
    v.amountVnd > 1e9 ||
    !isPriceBasis(v.basis)
  )
    fail("Giá hoặc đơn vị tính giá chưa hợp lệ.");
  if (v.region !== null && !isPriceRegion(v.region))
    fail("Vùng giá chưa hợp lệ.");
  const packG = v.packG == null ? null : v.packG;
  if (
    (packG !== null &&
      (typeof packG !== "number" ||
        !Number.isFinite(packG) ||
        packG <= 0 ||
        packG > 1e6)) ||
    (basisNeedsPackWeight(v.basis) && packG === null)
  )
    fail("Giá theo cái/gói cần khối lượng mua có căn cứ.");
  return {
    ...(v.id === undefined ? {} : { id: id(v.id) }),
    region: v.region as CatalogPrice["region"],
    amountVnd: v.amountVnd,
    basis: v.basis,
    packG: packG as number | null,
    source: text(v.source, "Nguồn giá", 200),
    sourceUrl: publicUrl(v.sourceUrl),
    asOfDate: date(v.asOfDate),
    note:
      v.note === undefined || v.note === ""
        ? ""
        : text(v.note, "Ghi chú giá", 500),
  };
}
export function proposals(value: unknown): CatalogProposal[] {
  if (!Array.isArray(value) || value.length > MAX_BATCH_ENTRIES)
    fail(`Mỗi đợt tối đa ${MAX_BATCH_ENTRIES} thực phẩm.`);
  const foods = new Set<string>();
  return value.map((raw) => {
    const v = object(
      raw,
      [
        "foodId",
        "expectedUpdatedAt",
        "reason",
        "classification",
        "image",
        "prices",
      ],
      ["foodId", "expectedUpdatedAt", "reason"],
    );
    const foodId = id(v.foodId),
      expectedUpdatedAt = text(v.expectedUpdatedAt, "Mốc dữ liệu", 30);
    if (foods.has(foodId))
      fail("Mỗi thực phẩm chỉ xuất hiện một lần trong đợt.");
    foods.add(foodId);
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        expectedUpdatedAt,
      ) ||
      !Number.isFinite(Date.parse(expectedUpdatedAt))
    )
      fail("Mốc dữ liệu chưa hợp lệ; tìm lại thực phẩm.");
    const result: CatalogProposal = {
      foodId,
      expectedUpdatedAt,
      reason: text(v.reason, "Lý do/căn cứ", 1500),
    };
    if (v.classification !== undefined) {
      const c = object(v.classification, [
        "foodType",
        "foodGroup",
        "proteinOrigin",
      ]);
      if (!Object.keys(c).length) fail("Chưa chọn phân loại.");
      const allowed: Record<string, readonly string[]> = {
        foodType: CATALOG_TYPES,
        foodGroup: FOOD_GROUP_ORDER,
        proteinOrigin: PROTEIN_ORIGIN_ORDER,
      };
      for (const [key, val] of Object.entries(c))
        if (typeof val !== "string" || !allowed[key].includes(val))
          fail(
            "Phân loại chưa có trong bộ quy tắc; giữ chưa phân loại khi chưa chắc.",
          );
      result.classification = c as CatalogProposal["classification"];
    }
    if (v.image !== undefined) {
      const im = object(
        v.image,
        ["url", "sourceUrl", "credit", "license", "licenseNote"],
        ["url", "sourceUrl", "credit", "license", "licenseNote"],
      );
      if (
        !IMAGE_LICENSES.includes(im.license as (typeof IMAGE_LICENSES)[number])
      )
        fail("Cần chọn quyền sử dụng ảnh.");
      result.image = {
        url: publicUrl(im.url),
        sourceUrl: publicUrl(im.sourceUrl),
        credit: text(im.credit, "Tác giả/ghi công", 300),
        license: im.license as (typeof IMAGE_LICENSES)[number],
        licenseNote: text(im.licenseNote, "Căn cứ quyền sử dụng ảnh", 1000),
      };
    }
    if (v.prices !== undefined) {
      if (!Array.isArray(v.prices) || !v.prices.length || v.prices.length > 5)
        fail("Mỗi thực phẩm tối đa 5 đề xuất giá trong một đợt.");
      result.prices = v.prices.map(price);
      const ids = result.prices.flatMap((p) => (p.id ? [p.id] : []));
      if (new Set(ids).size !== ids.length)
        fail("Một dòng giá chỉ được sửa một lần trong đợt.");
    }
    if (!result.classification && !result.image && !result.prices)
      fail("Chưa có thay đổi được phép cho thực phẩm.");
    return result;
  });
}
export function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${JSON.stringify(key)}:${stable(val)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
