import {
  accountHandler,
  createAccountUser,
  listAccountUsers,
} from "@/lib/account-management";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return accountHandler(() => listAccountUsers(request));
}
export function POST(request: Request) {
  return accountHandler(() => createAccountUser(request));
}
