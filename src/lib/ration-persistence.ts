import "server-only";

import type { Prisma } from "@/generated/prisma/client";

type SavedRow = {
  foodId: string;
  foodName: string;
  meal: string;
  dish: string;
  grams: number;
  inputGrams: number;
  inputBasis: "edible" | "raw";
  conversionFactor: number;
  wastePercent: number | null;
  note: string;
  nutrients: Record<string, number | null>;
  classify: Record<string, string | number | null>;
};

const cleanText = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const finite = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;

function jsonRecord(value: unknown): Prisma.InputJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const clean: Record<string, string | number | null> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") clean[key.slice(0, 100)] = item.slice(0, 500);
    else if (typeof item === "number" && Number.isFinite(item)) clean[key.slice(0, 100)] = item;
    else if (item === null) clean[key.slice(0, 100)] = null;
  }
  return clean;
}

export function parseRationPayload(body: unknown) {
  const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const title = cleanText(value.title, 160);
  if (!title) throw new Error("Tên khẩu phần là bắt buộc.");
  const rows = Array.isArray(value.rows) ? value.rows.slice(0, 500) : [];
  const items = rows.map((row, sortOrder) => {
    const item = row && typeof row === "object" ? row as Partial<SavedRow> : {};
    const foodName = cleanText(item.foodName, 300);
    if (!foodName) throw new Error("Mỗi dòng lưu phải có tên thực phẩm.");
    const edibleGrams = finite(item.grams);
    const inputGrams = finite(item.inputGrams, edibleGrams);
    if (edibleGrams < 0 || inputGrams < 0) throw new Error("Khối lượng không được âm.");
    const wastePercent = typeof item.wastePercent === "number" && Number.isFinite(item.wastePercent) ? item.wastePercent : null;
    return {
      foodId: cleanText(item.foodId, 100) || null,
      meal: cleanText(item.meal, 160) || "(Chưa phân bữa)",
      dish: cleanText(item.dish, 160) || "(Chưa phân món)",
      foodName,
      edibleGrams,
      inputGrams,
      inputBasis: item.inputBasis === "raw" ? "raw" : "edible",
      conversionFactor: Math.max(0, finite(item.conversionFactor, 1)),
      wastePercent,
      note: cleanText(item.note, 1000) || null,
      nutrientsJson: jsonRecord(item.nutrients),
      classifyJson: jsonRecord(item.classify),
      sortOrder,
    };
  });
  if (!items.length) throw new Error("Khẩu phần chưa có thực phẩm để lưu.");
  const profileJson = value.profile && typeof value.profile === "object" && !Array.isArray(value.profile)
    ? JSON.parse(JSON.stringify(value.profile)) as Prisma.InputJsonValue
    : undefined;
  return { title, items, profileJson };
}
