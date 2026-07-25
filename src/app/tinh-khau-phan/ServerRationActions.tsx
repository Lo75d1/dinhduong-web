"use client";

import { useEffect, useState } from "react";
import { EMPTY_CLASSIFY } from "@/lib/food-classify";
import type { Profile } from "./PersonalProfile";
import type { Row } from "./types";
import { genId, saveRationMode, saveRows } from "./types";

type User = { id: string; email: string; displayName: string; role: string };

// Danh sách khẩu phần đã lưu (khớp GET /api/rations).
type SavedRation = {
  id: string;
  title: string;
  updatedAt: string;
  patient: { id: string; name: string } | null;
  _count: { items: number };
};

// Một dòng thực phẩm trả về từ GET /api/rations/[id] (RationItem trong CSDL).
type SavedItem = {
  foodId: string | null;
  meal: string;
  dish: string;
  foodName: string;
  edibleGrams: unknown;
  inputGrams: unknown;
  inputBasis: string;
  conversionFactor: unknown;
  wastePercent: unknown;
  note: string | null;
  nutrientsJson: Record<string, number | null> | null;
  classifyJson: Record<string, string | number | null> | null;
};

const PROFILE_LS_KEY = "khauphan_profile_v1";

const num = (value: unknown, fallback = 0) => {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export default function ServerRationActions({ rows, profile }: { rows: Row[]; profile: Profile | null }) {
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
  const [savedList, setSavedList] = useState<SavedRation[] | null>(null);
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

  // Mở lại một thực đơn đã lưu: nạp về localStorage rồi reload để MealInput/PersonalProfile tự hydrate.
  async function loadRation(id: string, name: string) {
    setListBusy(true); setListError("");
    try {
      const response = await fetch(`/api/rations/${id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Không thể mở thực đơn.");
      const items: SavedItem[] = data.ration?.items ?? [];
      const loaded: Row[] = items.map((it) => {
        const wp = it.wastePercent == null ? null : num(it.wastePercent, NaN);
        return {
          uid: genId(),
          meal: it.meal || "(Chưa phân bữa)",
          dish: it.dish || "(Chưa phân món)",
          foodId: it.foodId || "",
          foodName: it.foodName || "",
          grams: num(it.edibleGrams),
          inputGrams: num(it.inputGrams, num(it.edibleGrams)),
          inputBasis: it.inputBasis === "raw" ? "raw" : "edible",
          conversionFactor: num(it.conversionFactor, 1) > 0 ? num(it.conversionFactor, 1) : 1,
          wastePercent: wp != null && Number.isFinite(wp) ? wp : null,
          note: it.note || "",
          nutrients: (it.nutrientsJson ?? {}) as Record<string, number | null>,
          classify: { ...EMPTY_CLASSIFY, ...(it.classifyJson ?? {}) } as Row["classify"],
        };
      });
      saveRows(loaded);
      saveRationMode(loaded.some((r) => r.inputBasis === "raw") ? "menu" : "recall24h");
      if (data.ration?.profileJson && typeof window !== "undefined") {
        try { window.localStorage.setItem(PROFILE_LS_KEY, JSON.stringify(data.ration.profileJson)); } catch { /* localStorage bị chặn */ }
      }
      setTitle(name);
      window.location.reload();
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Không thể mở thực đơn.");
      setListBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null); setSavedList(null); setMessage("Đã đăng xuất.");
  }

  const fmtDate = (value: string) => {
    try { return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return value; }
  };

  return <div className="flex flex-wrap items-center justify-end gap-2">
    {user ? <><label className="text-sm font-semibold text-neutral-900">Tên phiếu<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} className="ml-2 rounded-md border border-neutral-400 px-2 py-1 text-sm font-normal" /></label><span className="text-sm font-semibold text-neutral-900">{user.displayName}</span><button onClick={logout} className="rounded-md border border-neutral-400 bg-white px-3 py-2 text-sm font-semibold text-neutral-900">Đăng xuất</button></> : <button onClick={() => { setMessage(""); setOpen(true); }} className="rounded-md border border-[#123c36] bg-white px-3 py-2 text-sm font-semibold text-[#123c36]">Đăng nhập để lưu</button>}
    {user && <button onClick={openList} className="rounded-md border border-[#123c36] bg-white px-3 py-2 text-sm font-semibold text-[#123c36]">📂 Thực đơn đã lưu</button>}
    <button onClick={save} disabled={busy || !rows.some((row) => row.foodId)} className="rounded-md bg-[#123c36] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Đang xử lý..." : "Lưu lên server"}</button>
    {message && <p className="w-full text-right text-sm font-medium text-neutral-900">{message}</p>}

    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><form onSubmit={submitAuth} className="w-full max-w-md rounded-xl border-2 border-[#123c36] bg-white p-5 shadow-xl"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold text-neutral-950">{creatingFirstAccount ? "Tạo tài khoản quản trị đầu tiên" : "Đăng nhập"}</h2><button type="button" onClick={() => setOpen(false)} className="text-lg text-neutral-900" aria-label="Đóng">×</button></div><p className="mt-2 text-sm text-neutral-800">Mỗi bác sĩ chỉ thấy các khẩu phần do chính mình lưu.</p>{creatingFirstAccount && <label className="mt-3 block text-sm font-semibold text-neutral-900">Họ tên<input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 w-full rounded-md border border-neutral-500 px-3 py-2" /></label>}<label className="mt-3 block text-sm font-semibold text-neutral-900">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-neutral-500 px-3 py-2" /></label><label className="mt-3 block text-sm font-semibold text-neutral-900">Mật khẩu<input required type="password" minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md border border-neutral-500 px-3 py-2" /></label>{message && <p className="mt-3 text-sm font-medium text-red-800">{message}</p>}<button disabled={busy} className="mt-4 w-full rounded-md bg-[#123c36] px-3 py-2 font-semibold text-white disabled:opacity-60">{busy ? "Đang xử lý..." : creatingFirstAccount ? "Tạo tài khoản" : "Đăng nhập"}</button><button type="button" onClick={() => { setCreatingFirstAccount((value) => !value); setMessage(""); }} className="mt-3 w-full text-sm font-semibold text-[#123c36]">{creatingFirstAccount ? "Đã có tài khoản? Đăng nhập" : "Lần đầu sử dụng? Tạo tài khoản quản trị"}</button></form></div>}

    {listOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><div className="w-full max-w-2xl rounded-xl border-2 border-[#123c36] bg-white p-5 shadow-xl">
      <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold text-neutral-950">Thực đơn / khẩu phần đã lưu</h2><button type="button" onClick={() => setListOpen(false)} className="text-lg text-neutral-900" aria-label="Đóng">×</button></div>
      <p className="mt-2 text-sm text-neutral-800">Mở lại một thực đơn sẽ thay thế nội dung đang nhập. Hãy lưu phiếu hiện tại trước nếu cần giữ.</p>
      {listBusy && <p className="mt-4 text-sm font-medium text-neutral-900">Đang tải…</p>}
      {listError && <p className="mt-4 text-sm font-medium text-red-800">{listError}</p>}
      {!listBusy && !listError && savedList && savedList.length === 0 && <p className="mt-4 text-sm text-neutral-800">Chưa có thực đơn nào được lưu. Hãy nhập khẩu phần rồi bấm “Lưu lên server”.</p>}
      {!listBusy && savedList && savedList.length > 0 && <ul className="mt-4 max-h-[60vh] divide-y divide-neutral-200 overflow-y-auto">
        {savedList.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0"><p className="truncate font-semibold text-neutral-950">{item.title}</p><p className="text-xs text-neutral-700">{item._count.items} món · cập nhật {fmtDate(item.updatedAt)}{item.patient?.name ? ` · ${item.patient.name}` : ""}</p></div>
          <button onClick={() => loadRation(item.id, item.title)} disabled={listBusy} className="shrink-0 rounded-md bg-[#123c36] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">Mở</button>
        </li>)}
      </ul>}
    </div></div>}
  </div>;
}
