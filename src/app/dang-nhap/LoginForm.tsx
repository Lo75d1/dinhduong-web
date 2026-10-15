"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export default function LoginForm({
  returnTo = "/tai-khoan",
}: {
  returnTo?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login"),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const registering = mode === "register";
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        registering ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            registering
              ? { displayName: name, email, password }
              : { email, password },
          ),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Không thể đăng nhập.");
      setPassword("");
      router.push(returnTo);
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
  const input =
    "mt-1 w-full rounded-md border border-[#8fa99e] px-3 py-2 focus:outline-2 focus:outline-[#123c36]";
  return (
    <section className="mx-auto max-w-md rounded-lg border border-[#8fa99e] bg-white p-6 text-[#123c36]">
      <p className="text-xs font-semibold tracking-wide">
        TÀI KHOẢN DINH DƯỠNG 2598
      </p>
      <h1 className="mt-2 text-3xl font-semibold">
        {registering ? "Tạo tài khoản" : "Đăng nhập"}
      </h1>
      <p className="mt-3 text-sm text-neutral-700">
        {registering
          ? "Lưu khẩu phần và quản lý dữ liệu làm việc của bạn."
          : "Đăng nhập để mở dữ liệu đã lưu và quản lý kết nối ứng dụng."}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {(["login", "register"] as const).map((value) => (
          <button
            key={value}
            type="button"
            disabled={busy}
            onClick={() => {
              setMode(value);
              setMessage("");
              setPassword("");
            }}
            aria-pressed={mode === value}
            className={
              mode === value
                ? "rounded-md bg-[#123c36] p-2 font-semibold text-white"
                : "rounded-md border border-[#8fa99e] p-2 font-semibold"
            }
          >
            {value === "login" ? "Đăng nhập" : "Đăng ký mới"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-5 space-y-4">
        {registering && (
          <label className="block">
            Họ và tên
            <input
              required
              maxLength={100}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={input}
            />
          </label>
        )}
        <label className="block">
          Email
          <input
            required
            type="email"
            autoComplete="username"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </label>
        <label className="block">
          Mật khẩu
          {registering && (
            <span className="ml-1 text-sm text-neutral-600">
              (10–256 ký tự)
            </span>
          )}
          <input
            required
            type="password"
            minLength={registering ? 10 : undefined}
            maxLength={256}
            autoComplete={registering ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </label>
        <button
          disabled={busy}
          className="w-full rounded-md bg-[#123c36] px-4 py-3 font-semibold text-white hover:bg-[#0f5c51] disabled:opacity-50"
        >
          {busy ? "Đang xử lý…" : registering ? "Tạo tài khoản" : "Đăng nhập"}
        </button>
      </form>
      {message && (
        <p
          role="alert"
          className="mt-4 rounded border border-[#bb7770] bg-[#fff5f3] p-3 text-sm text-neutral-900"
        >
          {message}
        </p>
      )}
      <p className="mt-5 text-xs text-neutral-600">
        {registering
          ? "Tài khoản tự đăng ký có quyền cá nhân. Vai trò quản trị và biên tập do quản trị viên cấp."
          : "Quên mật khẩu hoặc tài khoản bị khóa? Liên hệ quản trị viên để được xác minh và hỗ trợ."}
      </p>
      {!registering && (
        <a href="/lien-he" className="mt-2 inline-block text-sm underline">
          Liên hệ hỗ trợ
        </a>
      )}
    </section>
  );
}
