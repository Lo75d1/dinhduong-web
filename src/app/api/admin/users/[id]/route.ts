import { accountHandler, updateAccountUser } from "@/lib/account-management";
export function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return accountHandler(async () =>
    updateAccountUser(request, (await params).id),
  );
}
