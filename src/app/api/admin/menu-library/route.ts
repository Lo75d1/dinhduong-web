import { menuLibraryAccess, menuLibraryDenied, PRIVATE_LIBRARY_HEADERS } from "@/lib/menu-library/access";
import { menuLibraryCatalog } from "@/lib/menu-library/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await menuLibraryAccess();
  if (!access.allowed) return menuLibraryDenied(access);
  return Response.json(menuLibraryCatalog(), { headers: PRIVATE_LIBRARY_HEADERS });
}
