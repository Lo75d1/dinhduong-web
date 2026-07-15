import { requireSessionUser } from "@/lib/auth";

export async function requireDataEditor() {
  const user = await requireSessionUser();
  if (user.role !== "ADMIN" && user.role !== "EDITOR") throw new Error("FORBIDDEN");
  return user;
}
