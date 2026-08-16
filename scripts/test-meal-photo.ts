import assert from "node:assert/strict";
import { mealPhotoPath, mealPhotoPublicUrl, validateMealPhoto } from "../src/lib/meal-photo";

assert.equal(validateMealPhoto(new File([new Uint8Array(10)], "meal.webp", { type: "image/webp" })), "webp");
assert.throws(() => validateMealPhoto(new File(["x"], "meal.svg", { type: "image/svg+xml" })));
assert.equal(mealPhotoPath({ mealDate: new Date("2026-08-16T00:00:00Z"), mealTypeId: "lunch", dietTypeId: "soft", extension: "jpg" }), "2026-08-16/lunch/soft.jpg");
process.env.SUPABASE_URL = "https://example.supabase.co/";
process.env.MEAL_PHOTO_BUCKET = "meal-photos";
assert.equal(mealPhotoPublicUrl("2026-08-16/lunch/soft.jpg"), "https://example.supabase.co/storage/v1/object/public/meal-photos/2026-08-16/lunch/soft.jpg");
assert.equal(mealPhotoPublicUrl(null), null);
console.log("Meal photo validation/path tests passed.");
