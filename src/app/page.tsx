import HomeContent from "./HomeContent";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  if (Object.keys(query).some(key => key === "fbclid" || key === "mibextid" || key.startsWith("utm_"))) {
    redirect("/");
  }
  const [foodCount, dishCount, settings] = await Promise.all([
    prisma.food.count(),
    prisma.dish.count(),
    prisma.siteSetting.findUnique({ where: { id: "public" }, select: { thankYouTitle: true, thankYouBody: true, contactName: true, organization: true, phone: true, email: true, address: true, zaloUrl: true, offlineDownloadUrl: true } }).catch(() => null),
  ]);
  return <HomeContent foodCount={foodCount} dishCount={dishCount} settings={settings} />;
}
