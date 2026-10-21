import type { NutrientField } from "@/lib/nutrient-fields";
import type { Profile } from "@/app/tinh-khau-phan/PersonalProfile";
import type { PeriodAnalysis } from "@/app/tinh-khau-phan/multi-day-analysis";
import type { ClinicalContext, ClinicalAssessment } from "./clinical";

export const CONTRACT_VERSION = "1.0";
export type AmountUnit = "g" | "ml";
export type SourceKind = "catalog" | "label" | "document" | "user" | "reference" | "unknown";
export type RecipeSource = { kind: "catalog" | "user" | "ai"; label: string; dishId?: string; url?: string };
export type FoodSource = { kind: SourceKind; label: string; url?: string; confirmed: boolean };
export type CustomFoodInput = {
  id: string; name: string; source: FoodSource;
  basis: "100g" | "100ml" | "portion";
  portionAmount?: number; portionUnit?: AmountUnit;
  nutrients: Record<string, number | null>;
  wastePercent?: number | null; foodGroup?: string | null;
};
export type MenuRowInput = {
  id: string; meal: string; dish: string; foodId?: string; customFood?: CustomFoodInput;
  quantity: number | null; unit: AmountUnit; servings: number;
  basis: "edible" | "raw" | "cooked";
  conversionFactor?: number; conversionSource?: string;
  densityGPerMl?: number; densitySource?: string;
  actualFoodName?: string; estimateAccepted?: boolean;
  recipeSource: RecipeSource; replacedFromFoodId?: string; note?: string;
  mealTime?: string; householdMeasure?: string;
  sourceState?: "raw_clean" | "cooked" | "as_sold";
  aiFilledFields?: string[];
};
export type MenuDayInput = { id: string; label: string; date: string; rows: MenuRowInput[] };
export type TargetInput = { key: string; value: number; source: string; isUpperLimit?: boolean };
export type MenuInput = {
  title: string; mode: "recall24h" | "menu"; days: MenuDayInput[];
  fields?: string[];
  comparison: { mode: "none" | "profile" | "manual"; targets?: TargetInput[] };
  profile?: Profile; aiComment?: string; clinicalContext?: ClinicalContext;
};
export type NutritionFood = {
  id: string; name: string; unit: AmountUnit; source: FoodSource;
  nutrientBasis?: { status: "per100" | "unverified"; amount: 100 | null; unit: AmountUnit; note: string };
  unverifiedSourceNutrients?: Record<string, number | null>;
  sourceCode?: string | null; foodType?: string | null; imageUrl?: string | null;
  wastePercent: number | null; foodGroup: string | null;
  nutrients: Record<string, number | null>;
  aliases?: Array<{ name: string; verified: boolean }>;
  sourceOnlyNutrients?: Record<string, number | null>;
  qualityWarnings?: string[];
};
export type ResolvedRow = MenuRowInput & {
  food: NutritionFood;
  referenceAmount: number | null;
  edibleGrams: number | null; rawGrams: number | null;
  warnings: string[];
};
export type ResolvedDay = Omit<MenuDayInput, "rows"> & { rows: ResolvedRow[] };
export type NutrientTotal = { value: number | null; incomplete: boolean; missingRows: string[]; estimated: boolean };
export type NutrientComparison = { key: string; value: number | null; source: string | null; isUpperLimit: boolean };
export type ResolvedMenu = {
  contractVersion: typeof CONTRACT_VERSION; digest: string; title: string;
  mode: MenuInput["mode"]; input: MenuInput; days: ResolvedDay[]; fields: NutrientField[];
  generatedAt: string; dataVersion: string; aiComment: string;
  totals: Record<string, NutrientTotal>;
  dayTotals: Array<{ id: string; label: string; date: string; hasData: boolean; totals: Record<string, NutrientTotal> }>;
  targets: NutrientComparison[]; analysis: PeriodAnalysis;
  warnings: string[]; missingInputs: Array<{ rowId: string; field: string; message: string }>;
  savedRecord?: {id:string;revision:number};
  clinicalAssessment?: ClinicalAssessment;
};
export type NutritionIdentity = { userId: string; clientId: string; scopes: string[]; kind?: "guest"; expiresAt?: string; familyId?: string };
