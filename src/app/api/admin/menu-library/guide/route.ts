import { menuLibraryAccess, menuLibraryDenied, PRIVATE_LIBRARY_HEADERS } from "@/lib/menu-library/access";
import { implementationAiGuide, menuAiGuide } from "@/lib/menu-library/guide";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await menuLibraryAccess();
  if (!access.allowed) return menuLibraryDenied(access);
  const mode = new URL(request.url).searchParams.get("mode");
  if (mode && mode !== "menu" && mode !== "implementation")
    return Response.json({ error: "mode phải là menu hoặc implementation." }, { status: 400, headers: PRIVATE_LIBRARY_HEADERS });
  return new Response(mode === "implementation" ? implementationAiGuide() : menuAiGuide(), {
    headers: { ...PRIVATE_LIBRARY_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
  });
}
