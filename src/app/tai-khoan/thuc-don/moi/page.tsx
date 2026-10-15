import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPersonalLibraryItem } from "@/lib/personal-library";
import type { CustomFoodInput, MenuInput, MenuRowInput } from "@/lib/nutrition-chat/contracts";
import ReuseSavedMenu from "@/app/ket-noi-ai/ban-luu/[id]/ReuseSavedMenu";
import PersonalLibraryNav from "../../PersonalLibraryNav";
import { NutritionInputError } from "@/lib/nutrition-chat/validation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lập thực đơn từ thư viện | Dinh dưỡng 2598", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Page({ searchParams }: { searchParams: Promise<{ food?: string; dish?: string }> }) {
  const user = await getSessionUser(), params = await searchParams;
  const kind = typeof params.food === "string" ? "food" : "dish", id = kind === "food" ? params.food : params.dish;
  const nextUrl = `/tai-khoan/thuc-don/moi${typeof id === "string" ? `?${kind}=${encodeURIComponent(id)}` : ""}`;
  if (!user) redirect(`/dang-nhap?next=${encodeURIComponent(nextUrl)}`);
  let rows: MenuRowInput[] = [], names: Record<string, string> = {};
  if (typeof id === "string") {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) notFound();
    const item = await getPersonalLibraryItem(kind, id, { userId: user.id, clientId: "web-session", scopes: ["nutrition:read"] }).catch(error => {
      if (error instanceof NutritionInputError && error.status === 404) notFound();
      throw error;
    });
    if (kind === "dish") { rows = (item.content as unknown as MenuInput).days[0].rows; names = Object.fromEntries(item.preview?.days[0].rows.map(row => [row.id, row.food.name]) ?? []); }
    else {
      const food = item.content as unknown as CustomFoodInput;
      rows = [{ id: "personal-food", meal: "Bữa mới", dish: food.name, customFood: food, quantity: food.basis === "portion" ? food.portionAmount ?? null : 100, unit: food.basis === "100ml" ? "ml" : food.basis === "portion" ? food.portionUnit ?? "g" : "g", servings: 1, basis: "edible", recipeSource: { kind: "user", label: "Thực phẩm từ thư viện cá nhân" } }];
    }
  }
  const input: MenuInput = { title: "Thực đơn mới", mode: "menu", comparison: { mode: "none" }, days: [{ id: "day-1", date: "", label: "Ngày 1", rows }] };
  return <section className="mx-auto max-w-4xl text-[#123c36]"><Link href="/tai-khoan/thuc-don" className="text-sm underline">Thực đơn của tôi</Link><h1 className="mt-4 text-3xl font-semibold">Lập thực đơn từ thư viện</h1><PersonalLibraryNav active="menu" /><ReuseSavedMenu key={`${kind}:${id ?? "new"}`} initialInput={input} initialNames={names} /></section>;
}
