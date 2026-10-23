import type { Profile } from "@/app/tinh-khau-phan/PersonalProfile";
/** Library draft, distinct from a Nutrition Chat MenuInput. */
export type SchoolLevel = "nursery" | "kindergarten" | "primary" | "lower_secondary" | "upper_secondary";
export type MealCode = "breakfast" | "lunch" | "afternoon_main" | "afternoon_snack" | "dinner" | "shift_main" | "other";
export const LIFE_STAGE_OPTIONS = [
  { value: "complementary_feeding", label: "Ăn dặm" },
  { value: "child", label: "Trẻ em" },
  { value: "adult", label: "Người lớn" },
] as const;
export const TEXTURE_OPTIONS = [
  { value: "regular", label: "Thông thường" }, { value: "soft", label: "Mềm" },
  { value: "minced", label: "Băm nhỏ" }, { value: "pureed", label: "Nghiền / xay" },
  { value: "liquid", label: "Lỏng" },
] as const;
export const COOKING_METHOD_OPTIONS = [
  { value: "boil", label: "Luộc" }, { value: "steam", label: "Hấp" },
  { value: "stew", label: "Hầm / ninh" }, { value: "simmer", label: "Nấu / kho" },
  { value: "stir_fry", label: "Xào" }, { value: "bake", label: "Nướng" },
  { value: "mix", label: "Trộn / pha" }, { value: "other", label: "Khác" },
] as const;
export type LifeStage = typeof LIFE_STAGE_OPTIONS[number]["value"];
export const EATING_CONTEXT_OPTIONS = [
  { value: "home", label: "Tại nhà" },
  { value: "restaurant", label: "Ngoài quán" },
  { value: "mixed", label: "Kết hợp" },
] as const;
export type EatingContext = typeof EATING_CONTEXT_OPTIONS[number]["value"];
export function eatingContextLabel(value?: EatingContext | null) {
  return EATING_CONTEXT_OPTIONS.find(option => option.value === value)?.label ?? "Chưa xác định";
}
/** A mixed day does not identify how any particular meal is prepared. */
export function mealEatingContext(menu?: EatingContext | null, meal?: EatingContext | null): EatingContext | null {
  return meal ?? (menu === "mixed" ? null : menu ?? null);
}

export type TargetReference = {
  nutrient: string;
  unit: string;
  kind: "target" | "range" | "minimum" | "maximum";
  target: number | null;
  min: number | null;
  max: number | null;
  denominator: "person_day";
  sourceId: string;
  sourceVersion: string;
  locator: string;
};

export type MenuLibraryDraft = {
  schemaVersion: "1.0.0" | "1.1.0" | "1.2.0";
  id: string;
  version: number;
  status: "draft" | "reviewed" | "published";
  title: string;
  direction: "individual" | "collective";
  librarySection?: "individual" | "collective" | "hospital";
  hospitalUse?: "patient_guidance" | "hospital_kitchen" | null;
  availability?: { state: "active" | "archived"; reason: string | null };
  eatingContext?: EatingContext | null;
  unit: { id: string; label: string; type: "school" | "workplace" | "agency" | "hospital" | "other" } | null;
  coverage: "full_day" | "served_meals";
  derivedFrom: { templateId: string; version: number } | null;
  groups: {
    id: string;
    label: string;
    schoolLevel: SchoolLevel | null;
    ageYears: { min: number; max: number } | null;
    lifeStage?: LifeStage | null;
    ageMonths?: { min: number; max: number } | null;
    guidance?: { notes: string[]; recommendations: string[] };
    /** Explicit reference profile for this template/group; no names or patient identifiers. */
    recommendationProfile?: Profile | null;
    gender: "male" | "female" | "mixed" | "unspecified";
    activity: string | null;
    goal: string | null;
    /** User-selected library design target, independent of official daily references. */
    designEnergyKcal?: number | null;
    dietCode: string | null;
    dailyReferences: TargetReference[];
  }[];
  days: {
    id: string;
    dayIndex: number;
    date: string | null;
    meals: {
      id: string;
      code: MealCode;
      label: string;
      eatingContext?: EatingContext | null;
      groupPortions: {
        groupId: string;
        headcount: number | null;
        mealRuleIds: string[];
        dishes: {
          id: string;
          recipeId: string | null;
          label: string;
          sourceKind: "catalog" | "ai" | "manual";
          preparation?: {
            method: typeof COOKING_METHOD_OPTIONS[number]["value"] | null;
            texture: typeof TEXTURE_OPTIONS[number]["value"] | null;
            steps: string[];
            notes: string[];
          };
          ingredients: {
            foodId: string;
            quantityPerPortion: number;
            unit: "g" | "ml";
            basis: "edible_raw";
            edibleFraction: number | null;
            cookingYield: number | null;
          }[];
        }[];
      }[];
    }[];
  }[];
};

// Structural example only: no invented food IDs, nutrient targets or clinical orders.
export const PRIMARY_SCHOOL_DRAFT: MenuLibraryDraft = {
  schemaVersion: "1.1.0",
  id: "example-primary",
  version: 1,
  status: "draft",
  title: "Ví dụ cấu trúc: tiểu học có bữa trưa và bữa xế",
  direction: "collective",
  eatingContext: null,
  unit: { id: "example-school", label: "Trường minh họa", type: "school" },
  coverage: "served_meals",
  derivedFrom: null,
  groups: [
    { id: "age-6-7", label: "6–7 tuổi", schoolLevel: "primary", ageYears: { min: 6, max: 7 }, gender: "mixed", activity: null, goal: null, dietCode: null, dailyReferences: [] },
    { id: "age-8-9", label: "8–9 tuổi", schoolLevel: "primary", ageYears: { min: 8, max: 9 }, gender: "mixed", activity: null, goal: null, dietCode: null, dailyReferences: [] },
    { id: "age-10-11", label: "10–11 tuổi", schoolLevel: "primary", ageYears: { min: 10, max: 11 }, gender: "mixed", activity: null, goal: null, dietCode: null, dailyReferences: [] },
  ],
  days: [{
    id: "day-1", dayIndex: 1, date: null,
    meals: [
      { id: "day-1-lunch", code: "lunch", label: "Trưa", eatingContext: null, groupPortions: ["age-6-7", "age-8-9", "age-10-11"].map(groupId => ({ groupId, headcount: null, mealRuleIds: ["school-lunch"], dishes: [] })) },
      { id: "day-1-snack", code: "afternoon_snack", label: "Xế", eatingContext: null, groupPortions: ["age-6-7", "age-8-9", "age-10-11"].map(groupId => ({ groupId, headcount: null, mealRuleIds: ["school-snack"], dishes: [] })) },
    ],
  }],
};
