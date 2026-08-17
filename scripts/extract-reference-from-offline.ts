// Trích dữ liệu tham khảo (foods/dishes/dish_ingredients) từ bản offline JSON
// (đã dọn sạch) → jsonl khớp pipeline reference-data-seed của Codex.
// Chạy 1 lần trên máy dev (nơi có file offline JSON). Không cần kết nối DB.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const OFFLINE =
  "D:\\datanutrition\\du-lieu-nguon\\offline-json\\dinhduong-offline-full_2026-08-04.json";
const OUT_DIR = path.join(process.cwd(), "data", "reference");
const SCALAR_TYPES =
  /^(String|Int|Float|Boolean|DateTime|Json|Decimal|BigInt|Bytes)$/;
let SCHEMA = "";

// Lấy field SCALAR của 1 model trực tiếp từ schema.prisma (bỏ relation + mảng).
function scalarFields(model: string): Set<string> {
  const body =
    SCHEMA.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? "";
  if (!body) throw new Error(`Không thấy model ${model} trong schema.`);
  const out = new Set<string>();
  for (const line of body.split("\n")) {
    const m = line.match(/^\s+(\w+)\s+([A-Za-z]+)(\?|\[\])?/);
    if (!m) continue;
    const [, name, type, suffix] = m;
    if (suffix === "[]") continue; // relation dạng mảng
    if (SCALAR_TYPES.test(type)) out.add(name);
  }
  return out;
}

function pick(rows: Record<string, unknown>[], allow: Set<string>) {
  return rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(r)) if (allow.has(k)) o[k] = r[k];
    return o;
  });
}

async function writeJsonl(file: string, rows: Record<string, unknown>[]) {
  const body =
    rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "");
  await writeFile(path.join(OUT_DIR, file), body, "utf8");
  return {
    count: rows.length,
    bytes: Buffer.byteLength(body),
    sha256: createHash("sha256").update(body).digest("hex"),
  };
}

// Đếm số dòng thiếu 1 field bắt buộc nào đó (để chắc dữ liệu import được).
function missing(rows: Record<string, unknown>[], keys: string[]) {
  const bad: Record<string, number> = {};
  for (const r of rows)
    for (const k of keys)
      if (r[k] === undefined || r[k] === null) bad[k] = (bad[k] ?? 0) + 1;
  return bad;
}

async function main() {
  SCHEMA = await readFile(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");
  console.log("Đọc offline JSON…");
  const raw = JSON.parse(await readFile(OFFLINE, "utf8")) as {
    exportedAt?: string;
    foods?: Record<string, unknown>[];
    dishes?: (Record<string, unknown> & {
      ingredients?: Record<string, unknown>[];
    })[];
  };
  await mkdir(OUT_DIR, { recursive: true });

  const foodF = scalarFields("Food");
  const dishF = scalarFields("Dish");
  const ingF = scalarFields("DishIngredient");

  // Nguyên liệu nằm LỒNG trong từng dishes[].ingredients → gộp phẳng.
  const allIngredients = (raw.dishes ?? []).flatMap((d) =>
    Array.isArray(d.ingredients) ? d.ingredients : [],
  );

  const foods = pick(raw.foods ?? [], foodF);
  const dishes = pick(raw.dishes ?? [], dishF);
  const ings = pick(allIngredients, ingF);

  const files: Record<string, { count: number; bytes: number; sha256: string }> =
    {
      "foods.jsonl": await writeJsonl("foods.jsonl", foods),
      "dishes.jsonl": await writeJsonl("dishes.jsonl", dishes),
      "dish_ingredients.jsonl": await writeJsonl("dish_ingredients.jsonl", ings),
    };
  // 4 bảng không có trong offline JSON → file RỖNG để import không vỡ; populate sau
  // (food_aliases: bí danh tìm kiếm; 3 bảng tham khảo lấy từ dataweb_chuan-1.xlsx).
  for (const f of [
    "food_aliases.jsonl",
    "nutrition_recommendations.jsonl",
    "diet_codes.jsonl",
    "child_growth_standards.jsonl",
  ])
    files[f] = await writeJsonl(f, []);

  const manifest = {
    generatedFrom: `offline JSON ${raw.exportedAt ?? ""}`,
    generatedAt: new Date().toISOString(),
    files,
  };
  await writeFile(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );

  console.log("\n=== KẾT QUẢ ===");
  console.log(JSON.stringify(manifest.files, null, 2));

  console.log("\n=== CHẨN ĐOÁN MAPPING ===");
  const fs0 = (raw.foods ?? [])[0] ?? {};
  console.log(
    "Food — field JSON bị bỏ (không có trong model):",
    Object.keys(fs0).filter((k) => !foodF.has(k)),
  );
  console.log("Food — thiếu id/name/source:", missing(foods, ["id", "name", "source"]));
  console.log("Dish — thiếu id/name/source:", missing(dishes, ["id", "name", "source"]));
  console.log(
    "DishIngredient — key JSON mẫu:",
    Object.keys(allIngredients[0] ?? {}),
  );
  console.log("DishIngredient — model fields:", [...ingF]);
  console.log(
    "DishIngredient — thiếu id/dishId/foodNameRaw:",
    missing(ings, ["id", "dishId", "foodNameRaw"]),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
