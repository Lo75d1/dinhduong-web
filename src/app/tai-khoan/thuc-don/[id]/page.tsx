import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { savedCalculatorUrl, legacyCalculatorUrl } from "@/lib/nutrition-chat/calculator-links";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Thực đơn của tôi | Dinh dưỡng 2598", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function MyMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) notFound();
  const user = await getSessionUser();
  if (!user) redirect(`/dang-nhap?next=${encodeURIComponent(`/tai-khoan/thuc-don/${id}`)}`);
  const menu = await prisma.ration.findFirst({ where: { id, ownerId: user.id }, select: { id: true, conversationRevision: true } });
  if (!menu) notFound();
  redirect(menu.conversationRevision > 0 ? savedCalculatorUrl(menu.id) : legacyCalculatorUrl(menu.id));
}
