import { redirect } from "next/navigation";
import { menuLibraryAccess } from "@/lib/menu-library/access";
import Delegations from "./Delegations";
export const dynamic = "force-dynamic";
export const metadata = { title: "Ủy quyền AI | Quản trị", robots: { index: false, follow: false } };
export default async function Page() {
  const access = await menuLibraryAccess();
  if (!access.allowed) { if (access.status === 401) redirect("/dang-nhap?next=%2Fquan-tri%2Fket-noi-ai"); return <p role="alert">{access.error}</p>; }
  return <Delegations />;
}
