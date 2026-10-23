import { readMenuImage } from "@/lib/menu-library/image-storage";
import { NutritionInputError } from "@/lib/nutrition-chat/validation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Public illustration URLs contain no patient information; menus stay private. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { bytes, metadata } = await readMenuImage((await context.params).id);
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": "image/webp", "Content-Length": String(metadata.bytes), "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "X-Robots-Tag": "noindex, nofollow",
    } });
  } catch (error) { return new Response(null, { status: error instanceof NutritionInputError ? error.status : 503, headers: { "Cache-Control": "no-store" } }); }
}
