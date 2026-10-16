import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { libraryCalculatorUrl } from "@/lib/nutrition-chat/calculator-links";

export const metadata: Metadata = { title: "Lập thực đơn | Dinh dưỡng 2598", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Page({ searchParams }: { searchParams: Promise<{ food?: string; dish?: string }> }) {
  const params = await searchParams;
  const kind = typeof params.food === "string" ? "food" : typeof params.dish === "string" ? "dish" : undefined;
  const id = kind ? params[kind] : undefined;
  if (id && !/^[A-Za-z0-9_-]{1,100}$/.test(id)) notFound();
  redirect(libraryCalculatorUrl(kind,id));
}
