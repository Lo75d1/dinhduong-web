import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listPersonalLibrary, personalListParams, personalLibraryDraftFromMenu } from "@/lib/personal-library";
import { NutritionInputError } from "@/lib/nutrition-chat/validation";
import PersonalLibraryNav from "./PersonalLibraryNav";
import PersonalLibrary from "./PersonalLibrary";

export default async function PersonalLibraryPage({ kind, searchParams }: { kind: "food" | "dish"; searchParams: Promise<{ q?: string; page?: string; fromMenu?: string; row?: string }> }) {
  const user = await getSessionUser(), params = await searchParams, path = `/tai-khoan/${kind === "food" ? "thuc-pham" : "mon-an"}`;
  const importQuery = typeof params.fromMenu === "string" && typeof params.row === "string" ? `?fromMenu=${encodeURIComponent(params.fromMenu)}&row=${encodeURIComponent(params.row)}` : "";
  if (!user) redirect(`/dang-nhap?next=${encodeURIComponent(path + importQuery)}`);
  const { q, page } = personalListParams(params), identity = { userId: user.id, clientId: "web-session", scopes: ["nutrition:read"] };
  const result = await listPersonalLibrary(kind, q, page, identity);
  const initialDraft = importQuery ? await personalLibraryDraftFromMenu(kind, params.fromMenu!, params.row!, identity).catch(error => { if (error instanceof NutritionInputError && error.status === 404) notFound(); throw error; }) : undefined;
  return <section className="mx-auto max-w-4xl text-[#123c36]"><Link href="/tai-khoan" className="text-sm underline">Tài khoản của tôi</Link><h1 className="mt-4 text-3xl font-semibold">{kind === "food" ? "Thực phẩm của tôi" : "Món ăn của tôi"}</h1><PersonalLibraryNav active={kind} /><PersonalLibrary key={params.fromMenu && params.row ? `${params.fromMenu}:${params.row}` : "library"} kind={kind} items={result.items.map(item => ({ ...item, updatedAt: item.updatedAt.toISOString() }))} nextPage={result.nextPage} q={q} page={page} initialDraft={initialDraft} /></section>;
}
