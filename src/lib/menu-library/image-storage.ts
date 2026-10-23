import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { NutritionInputError } from "@/lib/nutrition-chat/validation";
import { MENU_IMAGE_ID_PATTERN, MENU_IMAGE_MAX_BYTES, type MealIllustration } from "./illustration";

const MAX_STORAGE_BYTES = 512 * 1024 * 1024;
type Metadata = { id: string; inputDigest: string; sourceKind: MealIllustration["sourceKind"]; alt: string; width: number; height: number; bytes: number };
// Runtime media lives outside source tracing; Docker mounts this configured path.
const root = () => process.env.MENU_LIBRARY_IMAGE_DIR || "/var/lib/dinhduong/menu-library-images";
function fail(message: string, status = 422): never { throw new NutritionInputError(message, "illustration", status); }
export function validateImageMetadataInput(alt: unknown, sourceKind: unknown, requestKey: unknown) {
  if (typeof alt !== "string" || !alt.trim() || alt.length > 300 || /[\x00-\x1f\x7f]/.test(alt)) fail("Cần mô tả ảnh từ 1 đến 300 ký tự.", 400);
  if (sourceKind !== "ai" && sourceKind !== "manual") fail("Chọn nguồn ảnh AI hoặc tải thủ công.", 400);
  if (typeof requestKey !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(requestKey)) fail("Mã tải ảnh không hợp lệ.", 400);
  return { alt: alt.trim(), sourceKind, requestKey } as { alt: string; sourceKind: MealIllustration["sourceKind"]; requestKey: string };
}
export function decodeImageBase64(value: unknown) {
  if (typeof value !== "string" || !value.length || value.length > Math.ceil(MENU_IMAGE_MAX_BYTES / 3) * 4) fail("Ảnh tối đa 5 MB; gửi base64 thuần, không gửi đường dẫn hoặc URL.", 413);
  if (value.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) fail("Dữ liệu ảnh base64 không hợp lệ.", 400);
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value || bytes.length > MENU_IMAGE_MAX_BYTES) fail("Dữ liệu ảnh base64 không hợp lệ hoặc vượt 5 MB.", 413);
  return bytes;
}
export async function readImageMetadata(id: string): Promise<Metadata> {
  if (!new RegExp(MENU_IMAGE_ID_PATTERN).test(id)) fail("Không tìm thấy ảnh minh hoạ.", 404);
  try { return JSON.parse(await readFile(join(root(), id, "metadata.json"), "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") fail("Không tìm thấy ảnh minh hoạ.", 404); throw error; }
}
export async function assertIllustrationsExist(illustrations: MealIllustration[]) {
  for (const image of new Map(illustrations.map(image => [`${image.assetId}:${image.sourceKind}`, image])).values()) {
    const metadata = await readImageMetadata(image.assetId);
    if (metadata.sourceKind !== image.sourceKind) fail("Nguồn ảnh không khớp ảnh đã tải lên.");
  }
}
/** Caller serializes writes with the shared DB image-storage lock, across workers. */
export async function storeMenuImage(bytes: Buffer, userId: string, input: ReturnType<typeof validateImageMetadataInput>) {
  if (!bytes.length || bytes.length > MENU_IMAGE_MAX_BYTES) fail("Ảnh tối đa 5 MB.", 413);
  const id = createHash("sha256").update(JSON.stringify([userId, input.requestKey])).digest("hex");
  const inputDigest = createHash("sha256").update(bytes).update(JSON.stringify([input.alt, input.sourceKind])).digest("hex");
  try {
    const previous = await readImageMetadata(id);
    if (previous.inputDigest !== inputDigest) fail("Mã tải ảnh đã dùng cho nội dung khác. Chọn lại ảnh để tạo lượt tải mới.", 409);
    return { metadata: previous, illustration: { assetId: id, alt: previous.alt, sourceKind: previous.sourceKind }, replayed: true };
  } catch (error) { if (!(error instanceof NutritionInputError && error.status === 404)) throw error; }
  // Decode the actual image, limit decompression, strip metadata and re-encode.
  // Never serve uploaded SVG/HTML, EXIF, arbitrary bytes or user-supplied URLs.
  let output!: { data: Buffer; info: { width: number; height: number } };
  try {
    const { default: sharp } = await import("sharp");
    const decoder = sharp(bytes, { limitInputPixels: 25_000_000, failOn: "warning" });
    const metadata = await decoder.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) fail("Chỉ nhận ảnh tĩnh JPG, PNG hoặc WebP.");
    output = await decoder.rotate().resize({ width: 1600, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
  } catch (error) { if (error instanceof NutritionInputError) throw error; fail("Không đọc được ảnh. Chọn JPG, PNG hoặc WebP hợp lệ, tối đa 25 triệu điểm ảnh."); }
  await mkdir(root(), { recursive: true, mode: 0o700 });
  let used = 0;
  // Uploaded media is runtime data, never an input to the standalone build trace.
  for (const entry of await readdir(/* turbopackIgnore: true */ root(), { withFileTypes: true })) {
    if (entry.isDirectory() && new RegExp(MENU_IMAGE_ID_PATTERN).test(entry.name)) used += (await readImageMetadata(entry.name)).bytes;
  }
  if (used + output.data.length > MAX_STORAGE_BYTES) fail("Kho ảnh đã đạt 512 MB. Liên hệ quản trị để tăng dung lượng.", 507);
  const metadata: Metadata = { id, inputDigest, sourceKind: input.sourceKind, alt: input.alt, width: output.info.width, height: output.info.height, bytes: output.data.length };
  const staging = join(root(), `.upload-${randomUUID()}`);
  await mkdir(staging, { mode: 0o700 });
  try {
    await writeFile(join(staging, "image.webp"), output.data, { mode: 0o600, flag: "wx" });
    await writeFile(join(staging, "metadata.json"), JSON.stringify(metadata), { mode: 0o600, flag: "wx" });
    await rename(staging, join(/* turbopackIgnore: true */ root(), id));
  } finally { await rm(staging, { recursive: true, force: true }); }
  return { metadata, illustration: { assetId: id, alt: input.alt, sourceKind: input.sourceKind }, replayed: false };
}
export async function readMenuImage(id: string) {
  const metadata = await readImageMetadata(id);
  const bytes = await readFile(join(root(), id, "image.webp"));
  return { metadata, bytes };
}
