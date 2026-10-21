/** Draft contract for the collective library. Not a Nutrition Chat MenuInput. */
export type SchoolLevel = "nursery" | "kindergarten" | "primary" | "lower_secondary" | "upper_secondary";
export type MealCode = "breakfast" | "lunch" | "afternoon_main" | "afternoon_snack" | "dinner" | "shift_main" | "other";

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
  schemaVersion: "1.0.0";
  id: string;
  version: number;
  status: "draft" | "reviewed" | "published";
  title: string;
  direction: "individual" | "collective";
  unit: { id: string; label: string; type: "school" | "workplace" | "agency" | "hospital" | "other" } | null;
  coverage: "full_day" | "served_meals";
  derivedFrom: { templateId: string; version: number } | null;
  groups: {
    id: string;
    label: string;
    schoolLevel: SchoolLevel | null;
    ageYears: { min: number; max: number } | null;
    gender: "male" | "female" | "mixed" | "unspecified";
    activity: string | null;
    goal: string | null;
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
      groupPortions: {
        groupId: string;
        headcount: number | null;
        mealRuleIds: string[];
        dishes: {
          id: string;
          recipeId: string | null;
          label: string;
          sourceKind: "catalog" | "ai" | "manual";
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
  schemaVersion: "1.0.0",
  id: "example-primary",
  version: 1,
  status: "draft",
  title: "Ví dụ cấu trúc: tiểu học có bữa trưa và bữa xế",
  direction: "collective",
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
      { id: "day-1-lunch", code: "lunch", label: "Trưa", groupPortions: ["age-6-7", "age-8-9", "age-10-11"].map(groupId => ({ groupId, headcount: null, mealRuleIds: ["school-lunch"], dishes: [] })) },
      { id: "day-1-snack", code: "afternoon_snack", label: "Xế", groupPortions: ["age-6-7", "age-8-9", "age-10-11"].map(groupId => ({ groupId, headcount: null, mealRuleIds: ["school-snack"], dishes: [] })) },
    ],
  }],
};
