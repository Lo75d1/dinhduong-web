import LoginForm from "./LoginForm";
import { safeAccountReturnTo } from "@/lib/account-options";
export const metadata = { title: "Đăng nhập | Dinh dưỡng 2598" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <LoginForm returnTo={safeAccountReturnTo((await searchParams).next)} />
  );
}
