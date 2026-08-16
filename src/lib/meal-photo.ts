const DEFAULT_BUCKET = "meal-photos";
const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function validateMealPhoto(file: File) {
  const extension = EXTENSIONS[file.type];
  if (!extension) throw new Error("Ảnh phải có định dạng JPG, PNG hoặc WebP.");
  if (file.size <= 0 || file.size > MAX_BYTES) throw new Error("Ảnh đối chứng không được vượt quá 5 MB.");
  return extension;
}

export function mealPhotoPath(input: { mealDate: Date; mealTypeId: string; dietTypeId: string; extension: string }) {
  return `${input.mealDate.toISOString().slice(0, 10)}/${encodeURIComponent(input.mealTypeId)}/${encodeURIComponent(input.dietTypeId)}.${input.extension}`;
}

export function mealPhotoPublicUrl(path: string | null | undefined) {
  if (!path || !process.env.SUPABASE_URL) return null;
  const url = process.env.SUPABASE_URL.replace(/\/$/, "");
  const bucket = process.env.MEAL_PHOTO_BUCKET || DEFAULT_BUCKET;
  return `${url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path}`;
}
