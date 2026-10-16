import { accountHandler, manageAccount } from "@/lib/account-management";
export const runtime = "nodejs";
export function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  return accountHandler(async () =>
    manageAccount(request, (await params).action),
  );
}
