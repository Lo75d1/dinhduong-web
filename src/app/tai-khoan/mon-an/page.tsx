import type { Metadata } from "next";
import PersonalLibraryPage from "../PersonalLibraryPage";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Món ăn của tôi | Dinh dưỡng 2598", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function Page({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) { return <PersonalLibraryPage kind="dish" searchParams={searchParams} />; }
