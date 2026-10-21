import { redirect } from "next/navigation";
import { menuLibraryAccess } from "@/lib/menu-library/access";
import GuidanceArticle from "../GuidanceArticle";
export const dynamic = "force-dynamic";
export const metadata = { title: "Hướng dẫn kho mẫu | Quản trị", robots: { index: false, follow: false } };
export default async function Page() {
  const access = await menuLibraryAccess();
  if (!access.allowed) { if (access.status === 401) redirect("/dang-nhap?next=%2Fquan-tri%2Fkho-thuc-don%2Fhuong-dan"); return <p role="alert">{access.error}</p>; }
  return <GuidanceArticle />;
}
