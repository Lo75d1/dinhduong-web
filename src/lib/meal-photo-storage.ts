import "server-only";
import { mealPhotoPath, mealPhotoPublicUrl, validateMealPhoto } from "@/lib/meal-photo";

export { mealPhotoPath, mealPhotoPublicUrl, validateMealPhoto };

const DEFAULT_BUCKET = "meal-photos";

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.MEAL_PHOTO_BUCKET || DEFAULT_BUCKET;
  if (!url || !key) throw new Error("Kho ảnh đối chứng chưa được cấu hình.");
  return { url, key, bucket };
}

export async function uploadMealPhoto(path: string, file: File) {
  const { url, key, bucket } = config();
  const response = await fetch(
    `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`,
    {
      method: "PUT",
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": file.type,
        "x-upsert": "true",
      },
      body: await file.arrayBuffer(),
    },
  );
  if (!response.ok) throw new Error("Chưa thể tải ảnh lên kho lưu trữ.");
}
