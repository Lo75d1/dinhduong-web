import "server-only";

import { createHash, randomBytes } from "node:crypto";

export function cleanPublicText(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

export function publicMealCode() {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "2-digit", month: "2-digit", day: "2-digit" }).format(new Date()).replaceAll("-", "");
  return `BA-${day}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function ipHash(request: Request) {
  const raw = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${process.env.APP_SECRET || "local"}:${raw}`).digest("hex");
}
