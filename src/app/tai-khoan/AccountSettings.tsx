"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { accountRoleLabel, ACCOUNT_ACTION_LABELS } from "@/lib/account-options";

type Activity = {
  id: string;
  action: string;
  actorName: string;
  reason: string;
  createdAt: string;
};
export type AccountData = {
  user: {
    id: string;
    displayName: string;
    email: string;
    role: string;
    createdAt: string;
  };
  csrf: string;
  mcpUrl: string;
  asOf: string;
  sessions: {
    id: string;
    userAgent: string | null;
    current: boolean;
    createdAt: string;
    expiresAt: string;
  }[];
  connections: {
    familyId: string;
    scopes: string[];
    createdAt: string;
    refreshExpiresAt: string;
    client: { name: string; redirectUris: string[] };
  }[];
  manualClients: {
    id: string;
    name: string;
    scopes: string[];
    redirectUris: string[];
    createdAt: string;
    expiresAt: string;
    disabledAt: string | null;
  }[];
  summary: { rations: number; patients: number };
  activity: Activity[];
};
const input =
  "mt-1 block w-full min-w-0 rounded-md border border-[#8fa99e] bg-white px-3 py-2 text-neutral-900 focus:outline-2 focus:outline-[#123c36]";
const button =
  "rounded-md bg-[#123c36] px-4 py-2.5 font-semibold text-white hover:bg-[#0f5c51] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123c36]";
const secondary =
  "rounded-md border border-[#8fa99e] px-3 py-2 text-sm font-semibold text-[#123c36] hover:bg-[#edf4ef] disabled:opacity-50";
const scopes = [
  ["nutrition:read", "Tra kho, thư viện riêng và khẩu phần"],
  ["nutrition:calculate", "Tính thành phần dinh dưỡng"],
  ["nutrition:write", "Lưu / cập nhật khẩu phần riêng"],
  ["nutrition:export", "Xuất Excel"],
];
function date(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
}
function scopeLabel(value: string) {
  return scopes.find(([key]) => key === value)?.[1] ?? value;
}
function browserName(value: string | null) {
  if (!value) return "Phiên cũ · chưa ghi nhận trình duyệt";
  const browser = /Edg\//.test(value)
    ? "Edge"
    : /Firefox\//.test(value)
      ? "Firefox"
      : /Chrome\//.test(value)
        ? "Chrome"
        : /Safari\//.test(value)
          ? "Safari"
          : "Trình duyệt khác";
  const device = /Android/.test(value)
    ? "Android"
    : /iPhone|iPad/.test(value)
      ? "iOS"
      : /Windows/.test(value)
        ? "Windows"
        : /Macintosh/.test(value)
          ? "macOS"
          : /Linux/.test(value)
            ? "Linux"
            : "thiết bị khác";
  return `${browser} · ${device}`;
}
export default function AccountSettings({
  initial,
  initialTab,
}: {
  initial: AccountData;
  initialTab?: string;
}) {
  const [data, setData] = useState(initial),
    [tab, setTab] = useState(
      initialTab === "connections" ? "connections" : "profile",
    ),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [name, setName] = useState(initial.user.displayName),
    [password, setPassword] = useState({
      currentPassword: "",
      password: "",
      confirm: "",
    });
  const [manual, setManual] = useState({
    name: "ChatGPT cá nhân",
    platform: "chatgpt",
    currentPassword: "",
    scopes: scopes.map(([key]) => key),
  });
  const [issued, setIssued] = useState<{
    client: { id: string };
    clientSecret: string;
    mcpUrl: string;
    authorizationUrl: string;
    tokenUrl: string;
  } | null>(null);
  const [pending, setPending] = useState<{
    action: string;
    payload: object;
    label: string;
  } | null>(null);
  const router = useRouter();
  async function reload() {
    const response = await fetch("/api/auth/profile", { cache: "no-store" });
    const next = await response.json();
    if (!response.ok)
      throw new Error(next.error ?? "Không tải được tài khoản.");
    setData(next);
  }
  async function send(action: string, payload: object, method = "POST") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        action === "profile"
          ? "/api/auth/profile"
          : `/api/auth/manage/${action}`,
        {
          method,
          headers: {
            "content-type": "application/json",
            "x-account-csrf": data.csrf,
          },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không thể thực hiện.");
      if (result.signInAgain) {
        router.replace("/dang-nhap?next=%2Ftai-khoan");
        router.refresh();
        return;
      }
      if (result.clientSecret) {
        setIssued(result);
        setManual((v) => ({ ...v, currentPassword: "" }));
      }
      setPending(null);
      setMessage("Đã lưu thay đổi.");
      await reload();
      router.refresh();
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
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Đã sao chép. Dán vào phần cài đặt kết nối.");
    } catch {
      setMessage(
        "Không sao chép tự động được. Chọn nội dung trong ô để sao chép thủ công.",
      );
    }
  }
  function changeTab(value: string) {
    setTab(value);
    setMessage("");
    setPending(null);
    setIssued(null);
    setManual((v) => ({ ...v, currentPassword: "" }));
    setPassword({ currentPassword: "", password: "", confirm: "" });
  }
  function changePassword(event: FormEvent) {
    event.preventDefault();
    if (password.password !== password.confirm) {
      setMessage("Hai lần nhập mật khẩu mới chưa khớp.");
      return;
    }
    void send("password", {
      currentPassword: password.currentPassword,
      password: password.password,
    });
  }
  const tabs = [
    ["profile", "Hồ sơ"],
    ["security", "Bảo mật & phiên đăng nhập"],
    ["connections", "Kết nối ứng dụng"],
    ["activity", "Lịch sử tài khoản"],
  ];
  return (
    <div className="mx-auto max-w-5xl text-[#123c36]">
      <header className="border-b border-[#b7ccc0] pb-6">
        <p className="text-sm font-semibold tracking-wide">CÀI ĐẶT CÁ NHÂN</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
          Tài khoản của tôi
        </h1>
        <p className="mt-3 break-words text-lg">
          {data.user.displayName}{" "}
          <span className="text-sm text-neutral-600">
            · {accountRoleLabel(data.user.role)}
          </span>
        </p>
        <p className="mt-1 break-all text-sm text-neutral-600">
          {data.user.email}
        </p>
        <p className="mt-4 text-sm text-neutral-700">
          {data.summary.rations} khẩu phần đã lưu · {data.summary.patients} hồ
          sơ cá nhân · {data.connections.length} kết nối ứng dụng còn hiệu lực
        </p>
        {data.user.role === "ADMIN" && (
          <Link
            href="/quan-tri/nguoi-dung"
            className="mt-4 inline-block font-semibold underline underline-offset-4"
          >
            Quản trị người dùng →
          </Link>
        )}
      </header>
      <nav aria-label="Cài đặt tài khoản" className="my-6 flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => changeTab(key)}
            aria-current={tab === key ? "page" : undefined}
            className={tab === key ? button : secondary}
          >
            {label}
          </button>
        ))}
      </nav>
      {message && (
        <p
          role="status"
          className="mb-5 rounded-md border border-[#8fa99e] bg-[#f1f6f3] p-4 text-neutral-900"
        >
          {message}
        </p>
      )}
      {pending && (
        <div
          role="alert"
          className="mb-5 rounded-md border border-[#bb7770] bg-[#fff5f3] p-4 text-neutral-900"
        >
          <p>{pending.label}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => void send(pending.action, pending.payload)}
              className={button}
            >
              Xác nhận thu hồi
            </button>
            <button
              disabled={busy}
              onClick={() => setPending(null)}
              className={secondary}
            >
              Hủy
            </button>
          </div>
        </div>
      )}
      {tab === "profile" && (
        <section
          aria-labelledby="profile-title"
          className="rounded-lg border border-[#b7ccc0] bg-white p-5 sm:p-7"
        >
          <h2 id="profile-title" className="text-2xl font-semibold">
            Thông tin hồ sơ
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Tham gia từ {date(data.user.createdAt)}. Email là tên đăng nhập;
            liên hệ quản trị viên khi cần thay đổi.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send("profile", { displayName: name }, "PATCH");
            }}
            className="mt-6 max-w-xl space-y-4"
          >
            <label className="block font-medium">
              Tên hiển thị
              <input
                required
                maxLength={100}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={input}
              />
            </label>
            <label className="block font-medium">
              Email đăng nhập
              <input
                readOnly
                value={data.user.email}
                className={`${input} bg-neutral-50`}
              />
            </label>
            <p className="text-sm text-neutral-600">
              Vai trò: {accountRoleLabel(data.user.role)}. Quyền do quản trị
              viên cấp.
            </p>
            <button disabled={busy} className={button}>
              {busy ? "Đang lưu…" : "Lưu hồ sơ"}
            </button>
          </form>
          <div className="mt-8 border-t border-[#dce7df] pt-5">
            <h3 className="font-semibold">Dữ liệu của tôi</h3>
            <p className="mt-2 text-sm text-neutral-700">
              Khẩu phần và hồ sơ đã lưu được giữ theo tài khoản, kể cả khi ngắt
              kết nối ChatGPT / Claude.
            </p>
            <Link
              href="/tai-khoan/thuc-don"
              className="mt-3 block underline"
            >
              Thực đơn của tôi →
            </Link>
            <Link href="/tai-khoan/thuc-pham" className="mt-3 block underline">Thực phẩm của tôi →</Link>
            <Link href="/tai-khoan/mon-an" className="mt-3 block underline">Món ăn của tôi →</Link>
            <Link
              href="/tinh-khau-phan"
              className="mt-3 inline-block underline"
            >
              Mở công cụ và khẩu phần đã lưu →
            </Link>
          </div>
        </section>
      )}
      {tab === "security" && (
        <div className="space-y-7">
          <section className="rounded-lg border border-[#b7ccc0] bg-white p-5 sm:p-7">
            <h2 className="text-2xl font-semibold">Đổi mật khẩu</h2>
            <p className="mt-2 text-sm text-neutral-700">
              Sau khi đổi, mọi phiên đăng nhập và kết nối ứng dụng sẽ bị thu
              hồi. Bạn cần đăng nhập và cấp quyền lại.
            </p>
            <form onSubmit={changePassword} className="mt-5 max-w-xl space-y-4">
              <label className="block">
                Mật khẩu hiện tại
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  maxLength={256}
                  value={password.currentPassword}
                  onChange={(e) =>
                    setPassword({
                      ...password,
                      currentPassword: e.target.value,
                    })
                  }
                  className={input}
                />
              </label>
              <label className="block">
                Mật khẩu mới
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  maxLength={256}
                  value={password.password}
                  onChange={(e) =>
                    setPassword({ ...password, password: e.target.value })
                  }
                  className={input}
                />
              </label>
              <label className="block">
                Nhập lại mật khẩu mới
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  maxLength={256}
                  value={password.confirm}
                  onChange={(e) =>
                    setPassword({ ...password, confirm: e.target.value })
                  }
                  className={input}
                />
              </label>
              <p className="text-sm text-neutral-600">
                Dùng 10–256 ký tự; ưu tiên cụm mật khẩu dài và riêng cho
                website.
              </p>
              <button disabled={busy} className={button}>
                Đổi mật khẩu và đăng nhập lại
              </button>
            </form>
          </section>
          <section className="rounded-lg border border-[#b7ccc0] bg-white p-5 sm:p-7">
            <h2 className="text-2xl font-semibold">Phiên đăng nhập website</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Trình duyệt được nhận diện từ thông tin đăng nhập, không phải vị
              trí hay trạng thái đang online.
            </p>
            <ul className="mt-5 divide-y divide-[#dce7df]">
              {data.sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-4"
                >
                  <div>
                    <h3 className="font-semibold">
                      {browserName(session.userAgent)}{" "}
                      {session.current && (
                        <span className="text-sm text-[#386b55]">
                          · Phiên hiện tại
                        </span>
                      )}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-600">
                      Đăng nhập: {date(session.createdAt)}
                      <br />
                      Hết hạn: {date(session.expiresAt)}
                    </p>
                  </div>
                  {!session.current && (
                    <button
                      disabled={busy}
                      className={secondary}
                      onClick={() =>
                        setPending({
                          action: "sessions",
                          payload: { sessionId: session.id },
                          label:
                            "Thu hồi phiên đăng nhập này? Thiết bị đó sẽ cần đăng nhập lại.",
                        })
                      }
                    >
                      Thu hồi phiên
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <button
              disabled={busy || data.sessions.length < 2}
              onClick={() =>
                setPending({
                  action: "sessions",
                  payload: { otherSessions: true },
                  label:
                    "Thu hồi mọi phiên website khác và giữ phiên hiện tại?",
                })
              }
              className={`${secondary} mt-4`}
            >
              Đăng xuất các thiết bị khác
            </button>
          </section>
        </div>
      )}
      {tab === "connections" && (
        <div className="space-y-7">
          <section className="rounded-lg border border-[#b7ccc0] bg-white p-5 sm:p-7">
            <h2 className="text-2xl font-semibold">Ứng dụng đã cấp quyền</h2>
            <p className="mt-2 text-sm text-neutral-700">
              Chỉ hiện kết nối đã cấp quyền thành công. Cài plugin chưa đồng
              nghĩa với đã liên kết tài khoản.
            </p>
            {!data.connections.length && (
              <p className="mt-5 border-l-4 border-[#9bb6ab] bg-[#f1f6f3] p-4">
                Chưa có kết nối còn hiệu lực.{" "}
                <Link href="/ket-noi-ai#cai-ket-noi" className="underline">
                  Mở hướng dẫn kết nối
                </Link>
                .
              </p>
            )}
            <ul className="mt-4 divide-y divide-[#dce7df]">
              {data.connections.map((connection) => (
                <li key={connection.familyId} className="py-4">
                  <h3 className="font-semibold">{connection.client.name}</h3>
                  <p className="mt-1 break-words text-sm text-neutral-600">
                    {connection.client.redirectUris
                      .map((uri) => new URL(uri).hostname)
                      .join(", ")}{" "}
                    · Hết hạn {date(connection.refreshExpiresAt)}
                  </p>
                  <p className="mt-2 text-sm">
                    Quyền: {connection.scopes.map(scopeLabel).join("; ")}.
                  </p>
                  <button
                    className={`${secondary} mt-3`}
                    disabled={busy}
                    onClick={() =>
                      setPending({
                        action: "connections",
                        payload: { familyId: connection.familyId },
                        label: `Thu hồi quyền của ${connection.client.name}? Khẩu phần đã lưu vẫn được giữ.`,
                      })
                    }
                  >
                    Thu hồi kết nối
                  </button>
                </li>
              ))}
            </ul>
            {!!data.connections.length && (
              <button
                disabled={busy}
                className={`${secondary} mt-3`}
                onClick={() =>
                  setPending({
                    action: "connections",
                    payload: { all: true },
                    label:
                      "Thu hồi mọi kết nối ứng dụng? Các ứng dụng sẽ cần cấp quyền lại.",
                  })
                }
              >
                Thu hồi tất cả kết nối
              </button>
            )}
          </section>
          <section
            id="ket-noi-thu-cong"
            className="scroll-mt-6 rounded-lg border border-[#b7ccc0] bg-white p-5 sm:p-7"
          >
            <h2 className="text-2xl font-semibold">Kết nối thủ công</h2>
            <p className="mt-2 max-w-3xl text-sm text-neutral-700">
              Dùng khi bước đăng ký kết nối tự động không hoạt động. Tạo thông
              tin OAuth tại đây rồi nhập trong cài đặt plugin. Vẫn cần đăng nhập
              và cấp quyền; thông tin này không khắc phục lỗi plugin không nạp
              được công cụ.
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-neutral-700">
              <li>Tạo cấu hình cho nền tảng bạn dùng.</li>
              <li>
                Trong cài đặt plugin: chọn OAuth, dán địa chỉ MCP, Client ID và
                Client Secret.
              </li>
              <li>
                Hoàn tất đăng nhập / cấp quyền rồi thử gọi get_workflow và tra
                thực phẩm.
              </li>
            </ol>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIssued(null);
                void send("manual-create", manual);
              }}
              className="mt-6 max-w-xl space-y-4"
            >
              <label className="block">
                Tên cấu hình
                <input
                  required
                  maxLength={80}
                  value={manual.name}
                  onChange={(e) =>
                    setManual({ ...manual, name: e.target.value })
                  }
                  className={input}
                />
              </label>
              <label className="block">
                Nền tảng
                <select
                  value={manual.platform}
                  onChange={(e) =>
                    setManual({ ...manual, platform: e.target.value })
                  }
                  className={input}
                >
                  <option value="chatgpt">ChatGPT</option>
                  <option value="claude">Claude</option>
                </select>
              </label>
              <fieldset className="space-y-2">
                <legend className="mb-2 font-medium">Quyền cho phép</legend>
                {scopes.map(([key, label]) => (
                  <label key={key} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={manual.scopes.includes(key)}
                      onChange={(e) =>
                        setManual((v) => ({
                          ...v,
                          scopes: e.target.checked
                            ? [...v.scopes, key]
                            : v.scopes.filter((s) => s !== key),
                        }))
                      }
                      className="mt-1 accent-[#123c36]"
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              <label className="block">
                Xác nhận mật khẩu hiện tại
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  maxLength={256}
                  value={manual.currentPassword}
                  onChange={(e) =>
                    setManual({ ...manual, currentPassword: e.target.value })
                  }
                  className={input}
                />
              </label>
              <button
                disabled={busy || !manual.scopes.length}
                className={button}
              >
                {busy ? "Đang tạo…" : "Tạo cấu hình thủ công"}
              </button>
            </form>
            {issued && (
              <div
                role="region"
                aria-label="Thông tin kết nối vừa tạo"
                className="mt-6 rounded-md border border-[#8fa99e] bg-[#f1f6f3] p-4"
              >
                <h3 className="font-semibold">Sao chép thông tin kết nối</h3>
                <p className="mt-2 text-sm text-neutral-700">
                  Client Secret chỉ hiển thị lần này. Nhập trong cài đặt OAuth,
                  giữ riêng; cấu hình chỉ liên kết được tài khoản đã tạo. Nếu
                  mất, thu hồi và tạo mới.
                </p>
                {[
                  ["Địa chỉ MCP", issued.mcpUrl],
                  ["Client ID", issued.client.id],
                  ["Client Secret", issued.clientSecret],
                  ["Địa chỉ cấp quyền", issued.authorizationUrl],
                  ["Địa chỉ đổi token", issued.tokenUrl],
                ].map(([label, value]) => (
                  <div key={label} className="mt-4">
                    <label className="block text-sm font-medium">
                      {label}
                      <input
                        readOnly
                        autoComplete="off"
                        spellCheck={false}
                        value={value}
                        className={`${input} font-mono text-xs`}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void copy(value)}
                      className="mt-1 text-sm underline"
                    >
                      Sao chép {label}
                    </button>
                  </div>
                ))}
                <p className="mt-3 text-sm">
                  Xác thực token: HTTP Basic (hoặc client_secret_post). Cấu hình hết
                  hạn sau 30 ngày không sử dụng.
                </p>
                <button
                  onClick={() => setIssued(null)}
                  className={`${secondary} mt-4`}
                >
                  Đã lưu thông tin · Ẩn khóa
                </button>
              </div>
            )}
            <h3 className="mt-8 font-semibold">Cấu hình đã tạo</h3>
            {!data.manualClients.length && (
              <p className="mt-3 text-sm text-neutral-600">
                Chưa có cấu hình thủ công.
              </p>
            )}
            <ul className="mt-3 divide-y divide-[#dce7df]">
              {data.manualClients.map((client) => {
                const active =
                  !client.disabledAt &&
                  new Date(client.expiresAt).getTime() >
                    new Date(data.asOf).getTime();
                return (
                  <li key={client.id} className="py-4">
                    <p className="font-semibold">
                      {client.name} ·{" "}
                      <span className="text-sm">
                        {client.disabledAt
                          ? "Đã thu hồi"
                          : active
                            ? "Còn hiệu lực"
                            : "Đã hết hạn"}
                      </span>
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-neutral-600">
                      {client.id}
                    </p>
                    <p className="mt-2 text-sm text-neutral-600">
                      Hết hạn nếu không dùng tiếp: {date(client.expiresAt)}
                      <br />
                      Quyền: {client.scopes.map(scopeLabel).join("; ")}.
                    </p>
                    {active && (
                      <button
                        disabled={busy}
                        className={`${secondary} mt-3`}
                        onClick={() =>
                          setPending({
                            action: "manual-revoke",
                            payload: { clientId: client.id },
                            label: `Thu hồi cấu hình ${client.name} và các token đã cấp qua cấu hình này?`,
                          })
                        }
                      >
                        Thu hồi cấu hình
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
      {tab === "activity" && (
        <section className="rounded-lg border border-[#b7ccc0] bg-white p-5 sm:p-7">
          <h2 className="text-2xl font-semibold">Lịch sử thay đổi tài khoản</h2>
          <p className="mt-2 text-sm text-neutral-600">
            20 thao tác gần nhất từ khi bật quản lý tài khoản. Không ghi mật
            khẩu, khóa bí mật hoặc nội dung khẩu phần.
          </p>
          {!data.activity.length && (
            <p className="mt-5">Chưa có thao tác được ghi nhận.</p>
          )}
          <ul className="mt-5 divide-y divide-[#dce7df]">
            {data.activity.map((item) => (
              <li key={item.id} className="py-4">
                <h3 className="font-semibold">
                  {ACCOUNT_ACTION_LABELS[item.action] ?? item.action}
                </h3>
                <p className="mt-1 text-sm text-neutral-600">
                  {date(item.createdAt)} · {item.actorName}
                </p>
                <p className="mt-1 break-words text-sm">{item.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
