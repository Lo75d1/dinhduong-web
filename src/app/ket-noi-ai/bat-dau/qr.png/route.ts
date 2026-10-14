import QRCode from "qrcode";
import { getNutritionPublicUrl } from "@/lib/nutrition-chat/oauth-validation";
import { nutritionStartLinks } from "@/lib/nutrition-chat/start-guide";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const bytes = await QRCode.toBuffer(nutritionStartLinks(getNutritionPublicUrl()).start, {
    type: "png", width: 720, margin: 4, errorCorrectionLevel: "Q", color: { dark: "#123c36", light: "#ffffff" },
  });
  return new Response(new Uint8Array(bytes), { headers: {
    "Content-Type": "image/png",
    "Content-Disposition": 'inline; filename="dinh-duong-2598-bat-dau.png"',
    "Cache-Control": "public, max-age=86400",
    "X-Content-Type-Options": "nosniff",
  } });
}
