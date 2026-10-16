"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ACCOUNT_ROLES,
  accountRoleLabel,
  ACCOUNT_ACTION_LABELS,
} from "@/lib/account-options";
type User = {
  id: string;
  displayName: string;
  email: string;
  role: string;
  createdAt: string;
  disabledAt: string | null;
  _count: {
    rations: number;
    patients: number;
    sessions: number;
    nutritionOAuthTokens: number;
  };
};
export type UserList = {
  items: User[];
  total: number;
  page: number;
  pages: number;
  active: number;
  disabled: number;
  csrf: string;
  requesterId: string;
  activity: {
    id: string;
    action: string;
    actorName: string;
    reason: string;
    createdAt: string;
  }[];
};
const input =
  "mt-1 block w-full min-w-0 rounded-md border border-[#8fa99e] bg-white px-3 py-2 text-neutral-900 focus:outline-2 focus:outline-[#123c36]";
const button =
  "rounded-md bg-[#123c36] px-4 py-2.5 font-semibold text-white hover:bg-[#0f5c51] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123c36]";
const secondary =
  "rounded-md border border-[#8fa99e] bg-white px-3 py-2 text-sm font-semibold text-[#123c36] hover:bg-[#edf4ef] disabled:opacity-50";
function date(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
}
const empty = {
  displayName: "",
  email: "",
  role: "CLINICIAN",
  password: "",
  currentPassword: "",
  reason: "",
};
export default function UserManager({ initial }: { initial: UserList }) {
  const router = useRouter();
  const [data, setData] = useState(initial),
    [filters, setFilters] = useState({ q: "", role: "", status: "" });
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [createForm, setCreateForm] = useState(empty),
    [selected, setSelected] = useState<User | null>(null);
  const [edit, setEdit] = useState({ ...empty, action: "update" }),
    [confirmed, setConfirmed] = useState(false);
  async function load(page: number, id = selected?.id) {
    const params = new URLSearchParams({
      ...filters,
      page: String(page),
      ...(id ? { selected: id } : {}),
    });
    const response = await fetch(`/api/admin/users?${params}`, {
      cache: "no-store",
    });
    const next = await response.json();
    if (!response.ok)
      throw new Error(next.error ?? "Không tải được người dùng.");
    setData(next);
    return next as UserList;
  }
  async function search(event?: FormEvent, page = 1) {
    event?.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await load(page);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Mất kết nối.");
    } finally {
      setBusy(false);
    }
  }
  async function select(user: User) {
    setSelected(user);
    setEdit({
      ...empty,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      action: "update",
    });
    setConfirmed(false);
    setMessage("");
    try {
      await load(data.page, user.id);
    } catch {
      setMessage("Chưa tải được lịch sử người dùng.");
    }
  }
  async function submit(event: FormEvent, create: boolean) {
    event.preventDefault();
    if (!create && (!selected || !confirmed)) return;
    setBusy(true);
    setMessage("");
    try {
      const payload = create ? createForm : { ...edit };
      const response = await fetch(
        create ? "/api/admin/users" : `/api/admin/users/${selected!.id}`,
        {
          method: create ? "POST" : "PATCH",
          headers: {
            "content-type": "application/json",
            "x-account-csrf": data.csrf,
          },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không thể cập nhật.");
      if (result.signInAgain) {
        router.replace("/dang-nhap?next=%2Fquan-tri%2Fnguoi-dung");
        router.refresh();
        return;
      }
      setMessage(
        create ? "Đã tạo tài khoản." : "Đã cập nhật người dùng và ghi nhật ký.",
      );
      setCreateForm(empty);
      setEdit((v) => ({ ...v, currentPassword: "", password: "", reason: "" }));
      setConfirmed(false);
      const next = await load(create ? 1 : data.page);
      if (selected)
        setSelected(
          next.items.find((v) => v.id === selected.id) ??
            (result.item ? { ...selected, ...result.item } : selected),
        );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Mất kết nối. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-6xl text-[#123c36]">
      <header className="border-b border-[#b7ccc0] pb-6">
        <Link href="/tai-khoan" className="text-sm underline">
          ← Tài khoản của tôi
        </Link>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          Người dùng & phân quyền
        </h1>
        <p className="mt-3 max-w-3xl text-neutral-700">
          Quản lý thông tin, vai trò và quyền truy cập. Khóa tài khoản giữ
          nguyên hồ sơ và khẩu phần; mọi thao tác quản trị cần xác nhận mật khẩu
          và lý do.
        </p>
        <p className="mt-4 text-sm">
          {data.active} tài khoản đang hoạt động · {data.disabled} tài khoản bị
          khóa
        </p>
      </header>
      {message && (
        <p
          role="status"
          className="my-5 rounded-md border border-[#8fa99e] bg-[#f1f6f3] p-4 text-neutral-900"
        >
          {message}
        </p>
      )}
      <details className="mt-6 rounded-lg border border-[#b7ccc0] bg-white p-5">
        <summary className="cursor-pointer text-lg font-semibold">
          Tạo tài khoản mới
        </summary>
        <form
          onSubmit={(e) => void submit(e, true)}
          className="mt-5 grid gap-4 sm:grid-cols-2"
        >
          <label>
            Họ tên
            <input
              required
              maxLength={100}
              autoComplete="off"
              className={input}
              value={createForm.displayName}
              onChange={(e) =>
                setCreateForm({ ...createForm, displayName: e.target.value })
              }
            />
          </label>
          <label>
            Email đăng nhập
            <input
              required
              type="email"
              maxLength={254}
              autoComplete="off"
              className={input}
              value={createForm.email}
              onChange={(e) =>
                setCreateForm({ ...createForm, email: e.target.value })
              }
            />
          </label>
          <label>
            Vai trò
            <select
              className={input}
              value={createForm.role}
              onChange={(e) =>
                setCreateForm({ ...createForm, role: e.target.value })
              }
            >
              {ACCOUNT_ROLES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mật khẩu ban đầu
            <input
              required
              type="password"
              minLength={10}
              maxLength={256}
              autoComplete="new-password"
              className={input}
              value={createForm.password}
              onChange={(e) =>
                setCreateForm({ ...createForm, password: e.target.value })
              }
            />
          </label>
          <label>
            Mật khẩu quản trị hiện tại
            <input
              required
              type="password"
              maxLength={256}
              autoComplete="current-password"
              className={input}
              value={createForm.currentPassword}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  currentPassword: e.target.value,
                })
              }
            />
          </label>
          <label>
            Lý do tạo tài khoản
            <input
              required
              maxLength={300}
              className={input}
              value={createForm.reason}
              onChange={(e) =>
                setCreateForm({ ...createForm, reason: e.target.value })
              }
            />
          </label>
          <button disabled={busy} className={`${button} justify-self-start`}>
            Tạo tài khoản
          </button>
        </form>
        <p className="mt-4 text-sm text-neutral-600">
          Người dùng có thể tự đổi mật khẩu sau khi đăng nhập.
        </p>
      </details>
      <form onSubmit={search} className="my-6 flex flex-wrap items-end gap-3">
        <label className="min-w-0 grow">
          Tìm họ tên hoặc email
          <input
            className={input}
            maxLength={100}
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />
        </label>
        <label>
          Vai trò lọc
          <select
            className={input}
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          >
            <option value="">Tất cả vai trò</option>
            {ACCOUNT_ROLES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Trạng thái
          <select
            className={input}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="disabled">Đã khóa</option>
          </select>
        </label>
        <button disabled={busy} className={button}>
          {busy ? "Đang tải…" : "Tìm / lọc"}
        </button>
      </form>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-label="Danh sách người dùng" className="min-w-0">
          <p className="mb-3 text-sm text-neutral-700">
            {data.total} kết quả · Trang {data.page}/{data.pages}
          </p>
          {!data.items.length && (
            <p className="rounded-md border p-5">
              Không tìm thấy người dùng phù hợp.
            </p>
          )}
          <ul className="divide-y divide-[#dce7df] rounded-lg border border-[#b7ccc0] bg-white px-4">
            {data.items.map((user) => (
              <li key={user.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words font-semibold">
                      {user.displayName}{" "}
                      {user.id === data.requesterId && (
                        <span className="text-sm">· Bạn</span>
                      )}
                    </h2>
                    <p className="mt-1 break-all text-sm text-neutral-600">
                      {user.email}
                    </p>
                  </div>
                  <button
                    disabled={busy}
                    className={secondary}
                    onClick={() => void select(user)}
                    aria-pressed={selected?.id === user.id}
                  >
                    {selected?.id === user.id ? "Đang chọn" : "Quản lý"}
                  </button>
                </div>
                <p className="mt-3 text-sm">
                  {accountRoleLabel(user.role)} ·{" "}
                  {user.disabledAt ? "Đã khóa" : "Đang hoạt động"}
                </p>
                <p className="mt-1 text-xs text-neutral-600">
                  {user._count.rations} khẩu phần · {user._count.patients} hồ sơ
                  · {user._count.sessions} phiên website ·{" "}
                  {user._count.nutritionOAuthTokens} kết nối
                  <br />
                  Tạo lúc {date(user.createdAt)}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              className={secondary}
              disabled={busy || data.page <= 1}
              onClick={() => void search(undefined, data.page - 1)}
            >
              ← Trang trước
            </button>
            <button
              className={secondary}
              disabled={busy || data.page >= data.pages}
              onClick={() => void search(undefined, data.page + 1)}
            >
              Trang sau →
            </button>
          </div>
        </section>
        <section
          id="quan-ly-nguoi-dung"
          aria-label="Chi tiết người dùng"
          className="min-w-0 rounded-lg border border-[#b7ccc0] bg-white p-5"
        >
          {!selected ? (
            <>
              <h2 className="text-2xl font-semibold">Chọn người dùng</h2>
              <p className="mt-3 text-sm text-neutral-600">
                Bấm Quản lý để xem thông tin, đổi quyền, khóa tài khoản, đặt lại
                mật khẩu hoặc thu hồi quyền truy cập.
              </p>
            </>
          ) : (
            <>
              <h2 className="break-words text-2xl font-semibold">
                {selected.displayName}
              </h2>
              <p className="mt-2 break-all text-sm text-neutral-600">
                {selected.email}
              </p>
              <form
                onSubmit={(e) => void submit(e, false)}
                className="mt-5 space-y-4"
              >
                <label className="block">
                  Thao tác
                  <select
                    className={input}
                    value={edit.action}
                    onChange={(e) => {
                      setEdit({
                        ...edit,
                        action: e.target.value,
                        password: "",
                        currentPassword: "",
                      });
                      setConfirmed(false);
                    }}
                  >
                    <option value="update">Sửa thông tin / vai trò</option>
                    <option value={selected.disabledAt ? "enable" : "disable"}>
                      {selected.disabledAt ? "Mở tài khoản" : "Khóa tài khoản"}
                    </option>
                    <option value="reset-password">Đặt lại mật khẩu</option>
                    <option value="revoke-access">
                      Thu hồi mọi phiên & kết nối
                    </option>
                  </select>
                </label>
                {edit.action === "update" && (
                  <>
                    <label className="block">
                      Tên hiển thị
                      <input
                        required
                        maxLength={100}
                        className={input}
                        value={edit.displayName}
                        onChange={(e) =>
                          setEdit({ ...edit, displayName: e.target.value })
                        }
                      />
                    </label>
                    <label className="block">
                      Email đăng nhập
                      <input
                        required
                        type="email"
                        maxLength={254}
                        className={input}
                        value={edit.email}
                        onChange={(e) =>
                          setEdit({ ...edit, email: e.target.value })
                        }
                      />
                    </label>
                    <label className="block">
                      Vai trò mới
                      <select
                        className={input}
                        value={edit.role}
                        onChange={(e) =>
                          setEdit({ ...edit, role: e.target.value })
                        }
                      >
                        {ACCOUNT_ROLES.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                {edit.action === "reset-password" && (
                  <label className="block">
                    Mật khẩu mới của người dùng
                    <input
                      required
                      type="password"
                      minLength={10}
                      maxLength={256}
                      autoComplete="new-password"
                      className={input}
                      value={edit.password}
                      onChange={(e) =>
                        setEdit({ ...edit, password: e.target.value })
                      }
                    />
                  </label>
                )}
                <p className="border-l-4 border-[#9bb6ab] bg-[#f1f6f3] p-3 text-sm text-neutral-700">
                  {edit.action === "enable"
                    ? "Mở lại tài khoản. Các phiên và cấu hình đã thu hồi không tự được khôi phục."
                    : edit.action === "update"
                      ? `Xác nhận thông tin mới: ${edit.displayName} · ${edit.email} · ${accountRoleLabel(edit.role)}. Thay email hoặc vai trò sẽ thu hồi mọi phiên và kết nối.`
                      : "Thao tác sẽ thu hồi mọi phiên website và kết nối ứng dụng của người dùng. Khẩu phần và hồ sơ được giữ nguyên."}
                </p>
                <label className="block">
                  Lý do thao tác
                  <textarea
                    required
                    maxLength={300}
                    rows={2}
                    className={input}
                    value={edit.reason}
                    onChange={(e) =>
                      setEdit({ ...edit, reason: e.target.value })
                    }
                  />
                </label>
                <label className="block">
                  Mật khẩu quản trị hiện tại
                  <input
                    required
                    type="password"
                    maxLength={256}
                    autoComplete="current-password"
                    className={input}
                    value={edit.currentPassword}
                    onChange={(e) =>
                      setEdit({ ...edit, currentPassword: e.target.value })
                    }
                  />
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    required
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-1 accent-[#123c36]"
                  />
                  Tôi đã kiểm tra đúng người dùng và thao tác ở trên.
                </label>
                <button disabled={busy || !confirmed} className={button}>
                  Xác nhận thao tác
                </button>
              </form>
              <h3 className="mt-8 border-t border-[#dce7df] pt-5 font-semibold">
                Nhật ký quản lý tài khoản
              </h3>
              {!data.activity.length && (
                <p className="mt-3 text-sm text-neutral-600">
                  Chưa có thao tác từ khi bật nhật ký tài khoản.
                </p>
              )}
              <ul className="mt-3 divide-y divide-[#dce7df]">
                {data.activity.map((item) => (
                  <li key={item.id} className="py-3 text-sm">
                    <p className="font-semibold">
                      {ACCOUNT_ACTION_LABELS[item.action] ?? item.action}
                    </p>
                    <p className="mt-1 text-xs text-neutral-600">
                      {date(item.createdAt)} · {item.actorName}
                    </p>
                    <p className="mt-1 break-words">{item.reason}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
