"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const sessionKey = "dinhduong-anonymous-visit";
      const sessionId = sessionStorage.getItem(sessionKey) ?? crypto.randomUUID();
      sessionStorage.setItem(sessionKey, sessionId);
      const pageKey = `dinhduong-visited:${pathname}`;
      if (sessionStorage.getItem(pageKey)) return;
      sessionStorage.setItem(pageKey, "1");
      void fetch("/api/visits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: pathname, sessionId }), keepalive: true });
    } catch { /* Analytics is optional and must not interrupt use. */ }
  }, [pathname]);
  return null;
}
