"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Profile } from "./PersonalProfile";
import type { Row } from "./types";
import { normalizedRationOpenUrl, restoreLegacyRationFromServer, SavedRationLoadError, type SavedRationSummary } from "./saved-ration-client";
import { legacyCalculatorUrl } from "@/lib/nutrition-chat/calculator-links";

type User = { id: string; email: string; displayName: string; role: string };

export function LegacySavedRationLoader({ rationId }: { rationId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => restoreLegacyRationFromServer(rationId, window.localStorage, fetch, controller.signal)).then(result => {
      if (controller.signal.aborted) return;
      if (result.kind === "normalized") router.replace(result.openUrl);
      // Restore the existing manual editors from the newly loaded storage state.
      else window.location.replace("/tinh-khau-phan");
    }).catch(cause => {
      if (controller.signal.aborted) return;
      setNeedsLogin(cause instanceof SavedRationLoadError && cause.status === 401);
      setError(cause instanceof Error ? cause.message : "Không thể mở thực đơn.");
    });
    return () => controller.abort();
  }, [rationId, router]);
  return <section className="rounded-lg border border-[#b1c8bd] bg-white p-4 text-[#123c36]">
    {error ? <><p role="alert" className="text-sm text-red-800">{error}</p><div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold underline underline-offset-4">{needsLogin ? <Link href={`/dang-nhap?next=${encodeURIComponent(legacyCalculatorUrl(rationId))}`}>Đăng nhập để mở thực đơn</Link> : null}<Link href="/tai-khoan/thuc-don">Về Thực đơn của tôi</Link></div></> : <p role="status">Đang mở khẩu phần đã lưu trong Tính khẩu phần…</p>}
  </section>;
}

export default function ServerRationActions({ rows, profile, variant = "full", loadTarget }: { rows: Row[]; profile: Profile | null; variant?: "full" | "load"; loadTarget?: { id: string; title: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [creatingFirstAccount, setCreatingFirstAccount] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("Khẩu phần mới");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  // Danh sách "Thực đơn đã lưu"
  const [listOpen, setListOpen] = useState(false);
  const [savedList, setSavedList] = useState<SavedRationSummary[] | null>(null);
  const [listBusy, setListBusy] = useState(false);
  const [listError, setListError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => setUser(data.user ?? null)).catch(() => setUser(null));
  }, []);

  async function submitAuth(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch(creatingFirstAccount ? "/api/auth/bootstrap" : "/api/auth/login", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(creatingFirstAccount ? { displayName, email, password } : { email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Không thể đăng nhập.");
      setUser(data.user); setOpen(false); setPassword("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể đăng nhập."); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!user) { setOpen(true); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/rations", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, profile, rows: rows.filter((row) => row.foodId) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Không thể lưu khẩu phần.");
      setMessage(`Đã lưu “${data.ration.title}” lên server.`);
      setSavedList(null); // buộc tải lại danh sách lần mở kế tiếp
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể lưu khẩu phần."); }
    finally { setBusy(false); }
  }

  async function openList() {
    setListOpen(true);
    setListBusy(true); setListError("");
    try {
      const response = await fetch("/api/rations", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Không thể tải danh sách.");
      setSavedList(data.items ?? []);
    } catch (error) { setListError(error instanceof Error ? error.message : "Không thể tải danh sách."); }
    finally { setListBusy(false); }
  }

  async function loadRation(id: string, name: string, conversationRevision = 0) {
    setListBusy(true); setListError("");
    try {
      const normalizedUrl = normalizedRationOpenUrl({ id, conversationRevision });
      if (normalizedUrl) { router.push(normalizedUrl); return; }
      const restored = await restoreLegacyRationFromServer(id, window.localStorage);
      if (restored.kind === "normalized") { router.push(restored.openUrl); return; }
      setTitle(name);
      // A full navigation restores both mounted editors and profile from the same saved state.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Both localStorage-backed editors must remount after a legacy load.
      window.location.assign("/tinh-khau-phan");
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Không thể mở thực đơn.");
      setListBusy(false);
    }
  }

  async function deleteRation(item: SavedRationSummary) {
    if (typeof window !== "undefined" && !window.confirm(`Xóa vĩnh viễn “${item.title}”? Không thể hoàn tác.`)) return;
    setListBusy(true); setListError("");
    try {
      const normalized = item.conversationRevision > 0;
      const response = await fetch(normalized ? "/api/nutrition/v1/saved" : `/api/rations/${encodeURIComponent(item.id)}`, normalized ? { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, expectedRevision: item.conversationRevision }) } : { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : typeof data.error === "string" ? data.error : "Không thể xóa thực đơn.");
      if (normalized ? data.deleted !== true : data.ok !== true) throw new Error("Chưa xác nhận được việc xóa. Tải lại danh sách để kiểm tra.");
      setSavedList((current) => (current ? current.filter((saved) => saved.id !== item.id) : current));
    } catch (error) { setListError(error instanceof Error ? error.message : "Không thể xóa thực đơn."); }
    finally { setListBusy(false); }
  }

  const fmtDate = (value: string) => {
    try { return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return value; }
  };

  return <div className={variant === "load" ? "contents" : "flex flex-col gap-2"}>
    {user ? (
      variant === "load"
        ? <button disabled={listBusy} onClick={loadTarget ? () => void loadRation(loadTarget.id, loadTarget.title) : openList} className="rounded-md border border-[#123c36] bg-white px-3 py-2 text-sm font-semibold text-[#123c36] hover:bg-[#edf4ef] disabled:opacity-60">{loadTarget ? listBusy ? "Đang mở…" : "Mở trong Tính khẩu phần" : "Thực đơn đã lưu"}</button>
        : <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="min-w-0 flex-1 text-sm font-semibold text-neutral-900 sm:max-w-xs">Tên phiếu<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} className="mt-1 w-full rounded-md border border-neutral-400 px-3 py-2 text-sm font-normal" /></label>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={save} disabled={busy || !rows.some((row) => row.foodId)} className="rounded-md bg-[#123c36] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Đang lưu…" : "Lưu vào tài khoản"}</button>
              <button onClick={openList} disabled={listBusy} className="rounded-md border border-[#123c36] bg-white px-3 py-2 text-sm font-semibold text-[#123c36] disabled:opacity-60">Thực đơn đã lưu</button>
            </div>
          </div>
    ) : <button onClick={() => { setMessage(""); setOpen(true); }} className="self-start rounded-md border border-[#123c36] bg-white px-3 py-2 text-sm font-semibold text-[#123c36]">{variant === "load" ? "Mở thực đơn đã lưu" : "Đăng nhập để lưu vào tài khoản"}</button>}
    {message && variant !== "load" && <p className="text-sm font-medium text-neutral-900">{message}</p>}
    {loadTarget && listError ? <p role="alert" className="mt-3 text-sm text-red-800">{listError}</p> : null}

    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><form onSubmit={submitAuth} className="w-full max-w-md rounded-xl border-2 border-[#123c36] bg-white p-5 shadow-xl"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold text-neutral-950">{creatingFirstAccount ? "Tạo tài khoản quản trị đầu tiên" : "Đăng nhập"}</h2><button type="button" onClick={() => setOpen(false)} className="text-lg text-neutral-900" aria-label="Đóng">×</button></div><p className="mt-2 text-sm text-neutral-800">Mỗi bác sĩ chỉ thấy các khẩu phần do chính mình lưu.</p>{creatingFirstAccount && <label className="mt-3 block text-sm font-semibold text-neutral-900">Họ tên<input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 w-full rounded-md border border-neutral-500 px-3 py-2" /></label>}<label className="mt-3 block text-sm font-semibold text-neutral-900">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-neutral-500 px-3 py-2" /></label><label className="mt-3 block text-sm font-semibold text-neutral-900">Mật khẩu<input required type="password" minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md border border-neutral-500 px-3 py-2" /></label>{message && <p className="mt-3 text-sm font-medium text-red-800">{message}</p>}<button disabled={busy} className="mt-4 w-full rounded-md bg-[#123c36] px-3 py-2 font-semibold text-white disabled:opacity-60">{busy ? "Đang xử lý..." : creatingFirstAccount ? "Tạo tài khoản" : "Đăng nhập"}</button><button type="button" onClick={() => { setCreatingFirstAccount((value) => !value); setMessage(""); }} className="mt-3 w-full text-sm font-semibold text-[#123c36]">{creatingFirstAccount ? "Đã có tài khoản? Đăng nhập" : "Lần đầu sử dụng? Tạo tài khoản quản trị"}</button></form></div>}

    {listOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-3 sm:p-6"><div role="dialog" aria-modal="true" aria-labelledby="saved-rations-title" className="flex max-h-[85dvh] w-full max-w-3xl flex-col rounded-lg border border-[#8fa99e] bg-white text-[#123c36]">
      <div className="border-b border-[#d7e1da] px-4 py-4 sm:px-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-neutral-600">Tài khoản của tôi</p><h2 id="saved-rations-title" className="mt-1 text-xl font-semibold">Thực đơn đã lưu</h2></div><button type="button" onClick={() => setListOpen(false)} className="rounded border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50" aria-label="Đóng danh sách thực đơn">Đóng</button></div><p className="mt-3 text-sm text-neutral-700">Chọn bản để tiếp tục trong Tính khẩu phần. Bản khẩu phần cũ sẽ thay nội dung đang nhập trên máy; hãy lưu trước nếu cần giữ.</p></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
      {listBusy && <p className="mt-4 text-sm font-medium text-neutral-900">Đang tải…</p>}
      {listError && <p role="alert" className="my-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{listError}</p>}
      {!listBusy && !listError && savedList && savedList.length === 0 && <p className="py-8 text-sm text-neutral-700">Chưa có thực đơn trong tài khoản. Nhập khẩu phần rồi chọn “Lưu vào tài khoản”.</p>}
      {!listBusy && savedList && savedList.length > 0 && <ul className="divide-y divide-[#d7e1da]">
        {savedList.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 py-4">
          <div className="min-w-0 flex-1 basis-48"><p className="break-words font-semibold text-neutral-950">{item.title}</p><p className="mt-1 text-sm text-neutral-600">{item.conversationRevision > 0 ? `Thực đơn đầy đủ · phiên bản ${item.conversationRevision}` : `Khẩu phần cũ · ${item._count.items} dòng thực phẩm`}</p><p className="mt-1 text-xs text-neutral-600">Cập nhật {fmtDate(item.updatedAt)}{item.patient?.name ? ` · ${item.patient.name}` : ""}</p></div>
          <div className="flex shrink-0 items-center gap-2"><button onClick={() => void loadRation(item.id, item.title, item.conversationRevision)} disabled={listBusy} className="rounded-md bg-[#123c36] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f5147] disabled:opacity-60">Mở thực đơn</button><button onClick={() => void deleteRation(item)} disabled={listBusy} className="rounded-md px-3 py-2 text-sm text-[#8a2323] underline underline-offset-4 hover:bg-[#fff5f5] disabled:opacity-60">Xóa</button></div>
        </li>)}
      </ul>}
      </div><div className="mt-4 border-t border-[#d7e1da] px-4 py-4 sm:px-6"><Link href="/tai-khoan/thuc-don" className="text-sm font-semibold underline underline-offset-4">Quản lý tất cả thực đơn trong tài khoản →</Link></div>
    </div></div>}
  </div>;
}
