import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const REFERENCE_DIR = path.resolve("data/reference");

export const referenceModels = [
  { client: "food", table: "foods", file: "foods.jsonl", orderBy: { id: "asc" } },
  { client: "foodAlias", table: "food_aliases", file: "food_aliases.jsonl", orderBy: { id: "asc" } },
  { client: "dish", table: "dishes", file: "dishes.jsonl", orderBy: { id: "asc" } },
  { client: "dishIngredient", table: "dish_ingredients", file: "dish_ingredients.jsonl", orderBy: { id: "asc" } },
  { client: "nutritionRecommendation", table: "nutrition_recommendations", file: "nutrition_recommendations.jsonl", orderBy: { id: "asc" } },
  { client: "dietCode", table: "diet_codes", file: "diet_codes.jsonl", orderBy: { id: "asc" } },
  { client: "childGrowthStandard", table: "child_growth_standards", file: "child_growth_standards.jsonl", orderBy: { id: "asc" } },
] as const;

export type ReferenceSpec = (typeof referenceModels)[number];

type ReferenceDelegate = {
  count(): Promise<number>;
  findMany(args: unknown): Promise<Record<string, unknown>[]>;
  createMany(args: unknown): Promise<{ count: number }>;
};

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== "createdAt" && key !== "updatedAt")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, normalize(item)]),
    );
  }
  return value;
}

export function encodeRows(rows: unknown[]): string {
  return rows.map((row) => JSON.stringify(normalize(row))).join("\n") + (rows.length ? "\n" : "");
}

export function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export async function readRows(file: string): Promise<Record<string, unknown>[]> {
  const content = await readFile(path.join(REFERENCE_DIR, file), "utf8");
  return content
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

export async function writeRows(file: string, rows: unknown[]): Promise<{ count: number; sha256: string }> {
  const content = encodeRows(rows);
  await writeFile(path.join(REFERENCE_DIR, file), content, "utf8");
  return { count: rows.length, sha256: sha256(content) };
}

export function getDelegate(prisma: unknown, client: string) {
  return (prisma as unknown as Record<string, ReferenceDelegate>)[client];
}
