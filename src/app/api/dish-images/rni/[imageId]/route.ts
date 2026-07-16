import { NextRequest } from "next/server";

export const runtime = "nodejs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Context = { params: Promise<{ imageId: string }> };

export async function GET(_: NextRequest, { params }: Context) {
  const { imageId } = await params;
  if (!uuid.test(imageId)) return new Response("Not found", { status: 404 });
  try {
    const source = await fetch(`https://app.thucdongiadinh.vn/api/services/app/DanhMucNhomThucPham/GetImg?imgId=${imageId}`, { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", accept: "application/json, text/plain, */*", referer: "https://app.thucdongiadinh.vn/app/xay-dung-khau-phan/nbt-xay-dung-thuc-don", origin: "https://app.thucdongiadinh.vn", "x-requested-with": "XMLHttpRequest" }, next: { revalidate: 86_400 } });
    const data = await source.json() as { result?: unknown; success?: unknown };
    if (!source.ok || !data.success || typeof data.result !== "string") return new Response("Not found", { status: 404 });
    const body = Buffer.from(data.result, "base64");
    return new Response(body, { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
  } catch { return new Response("Unavailable", { status: 502 }); }
}
