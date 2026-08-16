import assert from "node:assert/strict";
import {
  canPrescribeDietOrder,
  canReviewPublicMealNote,
  canRequestMealOrderChange,
  canSubmitMealOrder,
  dietOrderEffectiveOn,
  dietOrderSuggestions,
  dietOrderWindowsOverlap,
} from "../src/lib/diet-orders";

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const base = {
  departmentId: "dept-a",
  dietTypeId: "diet-a",
  status: "ACTIVE",
  effectiveDate: date("2026-08-10"),
  endDate: null,
};

assert.equal(
  dietOrderEffectiveOn(base, date("2026-08-10")),
  true,
  "effectiveDate is inclusive",
);
assert.equal(
  dietOrderEffectiveOn(
    { ...base, endDate: date("2026-08-16") },
    date("2026-08-16"),
  ),
  true,
  "endDate is inclusive",
);
assert.equal(
  dietOrderEffectiveOn(
    { ...base, endDate: date("2026-08-15") },
    date("2026-08-16"),
  ),
  false,
  "expired order is excluded",
);
assert.equal(
  dietOrderEffectiveOn({ ...base, status: "ENDED" }, date("2026-08-16")),
  false,
  "ended order is excluded",
);
assert.equal(
  dietOrderWindowsOverlap(
    { effectiveDate: date("2026-08-10"), endDate: date("2026-08-15") },
    { effectiveDate: date("2026-08-15"), endDate: null },
  ),
  true,
  "shared endpoint overlaps",
);
assert.equal(
  dietOrderWindowsOverlap(
    { effectiveDate: date("2026-08-10"), endDate: date("2026-08-14") },
    { effectiveDate: date("2026-08-15"), endDate: null },
  ),
  false,
  "separate windows do not overlap",
);

const suggestions = dietOrderSuggestions(
  [
    base,
    { ...base, dietTypeId: "diet-b" },
    { ...base, dietTypeId: "diet-b", endDate: date("2026-08-15") },
    { ...base, departmentId: "dept-b", status: "ENDED" },
  ],
  date("2026-08-16"),
);
assert.deepEqual(suggestions, { "dept-a:diet-a": 1, "dept-a:diet-b": 1 });
assert.equal(canPrescribeDietOrder("CLINICIAN"), true);
assert.equal(canPrescribeDietOrder("DEPARTMENT_STAFF"), false);
assert.equal(
  canSubmitMealOrder("CLINICIAN"),
  false,
  "clinician cannot submit meal totals",
);
assert.equal(canSubmitMealOrder("DEPARTMENT_STAFF"), true);
assert.equal(canReviewPublicMealNote("CLINICIAN"), false);
assert.equal(canReviewPublicMealNote("DEPARTMENT_STAFF"), true);
assert.equal(canRequestMealOrderChange("CLINICIAN"), false);
assert.equal(canRequestMealOrderChange("DEPARTMENT_STAFF"), true);

console.log("DietOrder logic tests passed.");
