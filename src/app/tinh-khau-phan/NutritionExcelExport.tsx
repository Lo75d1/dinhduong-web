"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NutritionExcelExport({ onExport, label = "Xuất Excel đầy đủ" }: { onExport: (saveToAccount: boolean) => Promise<string | null>; label?: string }) {
  const [signedIn, setSignedIn] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [saveToAccount, setSaveToAccount] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/me", { cache: "no-store", signal: controller.signal }).then(response => response.ok ? response.json() : null)
      .then(result => { if (!controller.signal.aborted) setSignedIn(typeof result?.user?.id === "string"); })
      .catch(() => undefined).finally(() => { if (!controller.signal.aborted) setLoadingAccount(false); });
    return () => controller.abort();
  }, []);
  async function exportFile() {
    if (busy || loadingAccount) return;
    setBusy(true); setError(""); setSavedUrl(null);
    try { setSavedUrl(await onExport(signedIn && saveToAccount)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa xuất được Excel."); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-col items-start gap-2 text-sm">
    <button type="button" disabled={busy || loadingAccount} onClick={() => void exportFile()} className="rounded-md bg-[#123c36] px-3 py-2 font-semibold text-white hover:bg-[#0f5c51] disabled:cursor-wait disabled:bg-[#56736c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123c36]">{busy ? "Đang xuất…" : signedIn && saveToAccount ? "Lưu và tải Excel" : label}</button>
    {signedIn ? <label className="flex items-start gap-2 text-neutral-800"><input type="checkbox" checked={saveToAccount} disabled={busy} onChange={event => setSaveToAccount(event.target.checked)} className="mt-0.5 accent-[#123c36]" /><span>Lưu thêm bản thực đơn vào tài khoản để dùng lại.</span></label> : !loadingAccount ? <Link href="/dang-nhap?next=%2Ftinh-khau-phan" className="text-[#123c36] underline underline-offset-4">Đăng nhập để lưu và mở lại thực đơn</Link> : null}
    {error ? <p role="alert" className="text-red-800">{error}</p> : null}
    {savedUrl ? <p role="status" className="max-w-lg text-neutral-800"><a href={savedUrl} className="font-semibold text-[#123c36] underline underline-offset-4">Mở thực đơn đã lưu</a>. Có thể dùng lại trên web hoặc trong chat. Bản lưu giữ đầu vào lúc xuất; sửa file Excel trên máy không tự đồng bộ.</p> : null}
  </div>;
}
