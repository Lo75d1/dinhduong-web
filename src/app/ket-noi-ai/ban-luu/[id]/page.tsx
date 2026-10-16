import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { savedCalculatorUrl } from "@/lib/nutrition-chat/calculator-links";

export const metadata: Metadata = { title: "Thực đơn đã lưu | Dinh dưỡng 2598", robots: { index: false, follow: false }, referrer:"no-referrer" };
export default async function SavedMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) notFound();
  redirect(savedCalculatorUrl(id));
}
