"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { buildMealLabelGroups, expandMealLabels } from "@/lib/meal-labels";

// API trả về một aggregate vận hành có nhiều relation Prisma; giữ Row động tại biên UI.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const input =
  "mt-1 w-full rounded-lg border-2 border-[#8fa99e] bg-white px-3 py-2 text-sm";
const panel = "rounded-2xl border-2 border-[#123c36] bg-white p-4 shadow-sm";
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

export default function OperationsApp({
  mode,
}: {
  mode: "report" | "admin" | "kitchen" | "doctor";
}) {
  const [date, setDate] = useState(today);
  const [data, setData] = useState<Row | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    const res = await fetch(`/api/meal-operations?date=${date}`);
    const body = await res.json().catch(() => ({}));
    setData(res.ok ? body : null);
    setNotice(res.ok ? "" : (body.error ?? "Bạn cần đăng nhập."));
    setBusy(false);
  }
  useEffect(() => {
    void load();
  }, [date]);
  async function act(payload: Row) {
    setBusy(true);
    const res = await fetch("/api/meal-operations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setNotice(res.ok ? "Đã lưu thành công." : (body.error ?? "Chưa thể lưu."));
    if (res.ok) await load();
    setBusy(false);
    return res.ok;
  }
  async function uploadPhoto(itemId: string, file: File) {
    setBusy(true);
    const form = new FormData();
    form.set("itemId", itemId);
    form.set("photo", file);
    const res = await fetch("/api/kitchen-menu/photo", { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));
    setNotice(res.ok ? "Đã tải ảnh đối chứng." : (body.error ?? "Chưa thể tải ảnh."));
    if (res.ok) await load();
    setBusy(false);
    return res.ok;
  }
  if (!data)
    return (
      <main className="mx-auto max-w-xl">
        <div className={panel}>
          <h1 className="text-2xl font-black text-[#123c36]">
            Vận hành suất ăn
          </h1>
          <p className="mt-3 text-rose-700">{notice || "Đang tải…"}</p>
          <a
            href="/dang-nhap"
            className="mt-4 inline-block rounded-lg bg-[#123c36] px-4 py-2 font-bold text-white"
          >
            Đăng nhập
          </a>
        </div>
      </main>
    );
  return (
    <main className="mx-auto max-w-7xl space-y-4 pb-10">
      <header className="rounded-2xl bg-[#123c36] p-5 text-white">
        <p className="text-xs font-bold tracking-[.16em] text-[#b9d8cc]">
          DINH DƯỠNG 2598 · VẬN HÀNH BẾP
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">
              {mode === "report"
                ? "Báo suất ăn"
                : mode === "doctor"
                  ? "Chỉ định chế độ ăn"
                  : mode === "kitchen"
                    ? "Ca trực của tôi"
                    : "Quản lý suất ăn & bếp"}
            </h1>
            <p className="text-sm text-white/80">
              {data.user.displayName} · {data.user.role}
            </p>
          </div>
          <label className="text-sm font-bold">
            Ngày
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="ml-2 rounded-lg px-3 py-2 text-[#123c36]"
            />
          </label>
        </div>
      </header>
      {notice && (
        <p
          role="status"
          className="rounded-xl border-2 border-[#7ca796] bg-[#edf7f2] px-4 py-3 font-bold text-[#123c36]"
        >
          {notice}
        </p>
      )}
      {mode === "report" && (
        <>
          <WorkflowHint role="nurse" />
          <ReportPanel data={data} date={date} busy={busy} act={act} />
          <PublicNoteReview data={data} busy={busy} act={act} />
          <ChangeRequestPanel data={data} busy={busy} act={act} />
        </>
      )}
      {mode === "doctor" && (
        data.dietOrdersEnabled ? (
          <DoctorPanel data={data} date={date} busy={busy} act={act} />
        ) : (
          <section className="overflow-hidden rounded-2xl border border-[#123c36]/15 bg-white">
            <div className="border-b border-[#123c36]/10 px-5 py-4">
              <h2 className="text-lg font-semibold text-[#123c36]">Chỉ định chế độ ăn chưa bật</h2>
            </div>
            <p className="px-5 py-4 text-sm text-neutral-600">Bệnh viện đang dùng quy trình báo suất tổng theo khoa. Quản trị viên có thể bật tính năng chỉ định theo từng người bệnh khi cần.</p>
          </section>
        )
      )}
      {mode === "admin" && (
        <>
          <WorkflowHint role="manager" />
          <Summary data={data} date={date} busy={busy} act={act} />
          <PublicNoteReview data={data} busy={busy} act={act} />
          <ChangeApprovals data={data} busy={busy} act={act} />
          {data.user.role === "ADMIN" && (
            <ConfigPanel data={data} busy={busy} act={act} />
          )}
          <SnapshotMenuPanel data={data} date={date} busy={busy} uploadPhoto={uploadPhoto} />
          <ShiftPanel data={data} date={date} busy={busy} act={act} />
        </>
      )}
      {mode === "kitchen" && (
        <>
          <SnapshotMenuPanel data={data} date={date} busy={busy} uploadPhoto={uploadPhoto} />
          <ApprovedPublicNotes data={data} />
          <KitchenPanel data={data} busy={busy} act={act} />
        </>
      )}
    </main>
  );
}

function ReportPanel({
  data,
  date,
  busy,
  act,
}: {
  data: Row;
  date: string;
  busy: boolean;
  act: (p: Row) => Promise<boolean>;
}) {
  const initialDepartmentId = data.departments[0]?.id ?? "";
  const initialMealTypeId = data.mealTypes[0]?.id ?? "";
  const initialOrder = data.orders.find(
    (o: Row) =>
      o.departmentId === initialDepartmentId &&
      o.mealTypeId === initialMealTypeId,
  );
  const quantitiesFor = (order?: Row) =>
    Object.fromEntries(
      data.dietTypes.map((d: Row) => [
        d.id,
        order?.items.find((i: Row) => i.dietTypeId === d.id)?.quantity ?? 0,
      ]),
    );
  const [departmentId, setDepartmentId] = useState(initialDepartmentId);
  const [mealTypeId, setMealTypeId] = useState(initialMealTypeId);
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    quantitiesFor(initialOrder),
  );
  const [note, setNote] = useState(initialOrder?.note ?? "");
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const hasSuggestions = data.dietOrdersEnabled === true;
  const suggestionFor = (dietTypeId: string) =>
    data.dietOrderSuggestions?.[`${departmentId}:${dietTypeId}`] ?? 0;
  const mismatch = hasSuggestions && data.dietTypes.some(
    (d: Row) => (quantities[d.id] ?? 0) !== suggestionFor(d.id),
  );
  const criticalOrders = hasSuggestions ? (data.dietOrders ?? []).filter(
    (order: Row) => order.departmentId === departmentId && order.critical,
  ) : [];
  function selectOrder(nextDepartmentId: string, nextMealTypeId: string) {
    const existing = data.orders.find(
      (o: Row) =>
        o.departmentId === nextDepartmentId && o.mealTypeId === nextMealTypeId,
    );
    setQuantities(quantitiesFor(existing));
    setNote(existing?.note ?? "");
    setRequestKey(crypto.randomUUID());
  }
  const total = Object.values(quantities).reduce(
    (sum, n) => sum + (Number(n) || 0),
    0,
  );
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (
      await act({
        action: "submitOrder",
        requestKey,
        departmentId,
        mealTypeId,
        mealDate: date,
        note,
        items: data.dietTypes.map((d: Row) => ({
          dietTypeId: d.id,
          quantity: quantities[d.id] || 0,
        })),
      })
    )
      setRequestKey(crypto.randomUUID());
  }
  const currentDeptName = data.departments.find(
    (d: Row) => d.id === departmentId,
  )?.name;
  const currentMealName = data.mealTypes.find(
    (m: Row) => m.id === mealTypeId,
  )?.name;
  return (
    <section className="overflow-hidden rounded-2xl border border-[#123c36]/20 bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#123c36]/10 px-5 py-4">
        <h2 className="text-lg font-semibold text-[#123c36]">Phiếu báo suất</h2>
        {currentDeptName && (
          <span className="text-sm text-neutral-500">
            {currentDeptName}
            {currentMealName ? ` · ${currentMealName}` : ""}
          </span>
        )}
      </div>
      {criticalOrders.length > 0 && (
        <div className="mx-5 mt-4 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-amber-900">
          <div className="font-semibold">
            ⚠ Cần xác minh trực tiếp ({criticalOrders.length})
          </div>
          <p className="mt-1 text-sm">
            {criticalOrders
              .map(
                (order: Row) =>
                  `${order.patientCode}${order.room ? ` · ${order.room}` : ""} · ${order.dietType.name}`,
              )
              .join("; ")}
          </p>
        </div>
      )}
      {!data.departments.length ||
      !data.mealTypes.length ||
      !data.dietTypes.length ? (
        <p className="m-5 rounded-lg bg-amber-50 px-4 py-3 text-amber-900">
          Quản trị viên cần cấu hình khoa, bữa và chế độ ăn trước.
        </p>
      ) : (
        <form onSubmit={submit}>
          <div className={`grid gap-3 px-5 pt-4 ${data.departments.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {data.departments.length > 1 && <label className="text-sm font-medium text-[#24483f]">
              Khoa / phòng
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  selectOrder(e.target.value, mealTypeId);
                }}
                className="mt-1 w-full rounded-lg border border-[#8fa99e] bg-white px-3 py-2 text-sm text-[#123c36]"
              >
                {data.departments.map((d: Row) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>}
            <label className="text-sm font-medium text-[#24483f]">
              Bữa
              <select
                value={mealTypeId}
                onChange={(e) => {
                  setMealTypeId(e.target.value);
                  selectOrder(departmentId, e.target.value);
                }}
                className="mt-1 w-full rounded-lg border border-[#8fa99e] bg-white px-3 py-2 text-sm text-[#123c36]"
              >
                {data.mealTypes.map((m: Row) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · chốt {m.cutoffLocalTime}
                    {m.cutoffDaysBefore
                      ? ` trước ${m.cutoffDaysBefore} ngày`
                      : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-y border-[#123c36]/10 text-left text-xs text-neutral-500">
                  <th className="px-5 py-2 font-normal">Chế độ ăn</th>
                  {hasSuggestions && <th className="px-2 py-2 text-right font-normal">
                    Gợi ý từ chỉ định
                  </th>}
                  <th className="px-2 py-2 text-center font-normal">Số suất</th>
                  <th className="px-5 py-2 text-right font-normal">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {data.dietTypes.map((d: Row) => {
                  const q = Number(quantities[d.id] ?? 0);
                  const sug = hasSuggestions ? suggestionFor(d.id) : q;
                  const diff = q - sug;
                  return (
                    <tr
                      key={d.id}
                      className={`border-b border-[#123c36]/5 ${diff !== 0 ? "bg-amber-50" : ""}`}
                    >
                      <td className="px-5 py-2.5 font-medium text-[#24483f]">
                        {d.name}
                      </td>
                      {hasSuggestions && <td className="px-2 py-2.5 text-right tabular-nums text-neutral-500">
                        {sug}
                      </td>}
                      <td className="px-2 py-2.5 text-center">
                        <input
                          type="number"
                          min={0}
                          max={10000}
                          value={quantities[d.id] ?? 0}
                          onChange={(e) =>
                            setQuantities({
                              ...quantities,
                              [d.id]: Number(e.target.value),
                            })
                          }
                          className={`w-[76px] rounded-lg border bg-white px-2 py-1.5 text-center text-xl font-semibold tabular-nums text-[#123c36] ${hasSuggestions && diff !== 0 ? "border-amber-400" : "border-[#8fa99e]"}`}
                        />
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        {!hasSuggestions || diff === 0 ? (
                          <span className="text-xs text-emerald-700">
                            ✓ khớp
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-amber-700">
                            ⚠ lệch {diff > 0 ? `+${diff}` : diff}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-[#123c36]/10 bg-[#e1f5ee] px-5 py-3">
            <span className="text-sm text-[#085041]">Tổng suất</span>
            <span className="text-2xl font-semibold tabular-nums text-[#085041]">
              {total} suất
            </span>
          </div>
          <div className="border-t border-[#123c36]/10 px-5 py-4">
            <label
              className={`block text-sm ${mismatch ? "text-amber-700" : "text-[#24483f]"}`}
            >
              Ghi chú{mismatch ? " *" : ""}
              <input
                required={mismatch}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  mismatch
                    ? "Ghi rõ lý do lệch so với gợi ý…"
                    : "Ghi chú thêm (không bắt buộc)"
                }
                className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm ${mismatch ? "border-amber-400" : "border-[#8fa99e]"}`}
              />
            </label>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-neutral-500">
                Sau khi xác nhận vẫn sửa được đến giờ chốt.
              </span>
              <button
                disabled={busy || total === 0 || (mismatch && !note.trim())}
                className="rounded-lg bg-[#0f6e56] px-5 py-2.5 font-semibold text-white transition hover:bg-[#0c5a47] disabled:opacity-50"
              >
                Xác nhận báo suất
              </button>
            </div>
          </div>
        </form>
      )}
      <div className="border-t border-[#123c36]/10 px-5 py-4">
        <h3 className="text-sm font-semibold text-[#123c36]">
          Phiếu đã báo trong ngày
        </h3>
        <div className="mt-2">
          <OrderCards orders={data.orders} />
        </div>
      </div>
    </section>
  );
}

function ChangeRequestPanel({
  data,
  busy,
  act,
}: {
  data: Row;
  busy: boolean;
  act: (p: Row) => Promise<boolean>;
}) {
  const [orderId, setOrderId] = useState(data.orders[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  if (!data.orders.length) return null;
  const selected =
    data.orders.find((o: Row) => o.id === orderId) ?? data.orders[0];
  return (
    <section className={panel}>
      <h2 className="text-lg font-black text-[#6b4f08]">
        Yêu cầu thay đổi sau giờ chốt
      </h2>
      <p className="mt-1 text-sm text-neutral-600">
        Dùng khi phiếu không thể sửa trực tiếp. Bếp trưởng phải duyệt trước khi
        số liệu thay đổi.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void act({
            action: "requestChange",
            orderId: selected.id,
            reason,
            items: data.dietTypes.map((d: Row) => ({
              dietTypeId: d.id,
              quantity:
                quantities[d.id] ??
                selected.items.find((i: Row) => i.dietTypeId === d.id)
                  ?.quantity ??
                0,
            })),
          });
        }}
        className="mt-3 space-y-3"
      >
        <label className="block font-bold">
          Phiếu
          <select
            value={selected.id}
            onChange={(e) => setOrderId(e.target.value)}
            className={input}
          >
            {data.orders.map((o: Row) => (
              <option key={o.id} value={o.id}>
                {o.publicCode} · {o.department.name} · {o.mealType.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          {data.dietTypes.map((d: Row) => (
            <label key={d.id} className="font-bold">
              {d.name}
              <input
                type="number"
                min={0}
                value={
                  quantities[d.id] ??
                  selected.items.find((i: Row) => i.dietTypeId === d.id)
                    ?.quantity ??
                  0
                }
                onChange={(e) =>
                  setQuantities({
                    ...quantities,
                    [d.id]: Number(e.target.value),
                  })
                }
                className={input}
              />
            </label>
          ))}
        </div>
        <label className="block font-bold">
          Lý do
          <input
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={input}
          />
        </label>
        <button
          disabled={busy || !reason.trim()}
          className="rounded-lg bg-[#a77b10] px-4 py-2.5 font-bold text-white"
        >
          Gửi bếp trưởng duyệt
        </button>
      </form>
    </section>
  );
}

function Summary({
  data,
  date,
  busy,
  act,
}: {
  data: Row;
  date: string;
  busy: boolean;
  act: (p: Row) => Promise<boolean>;
}) {
  const totals = useMemo(
    () =>
      Object.fromEntries(
        data.dietTypes.map((d: Row) => [
          d.id,
          data.orders
            .filter((o: Row) => o.status !== "CANCELLED")
            .flatMap((o: Row) => o.items)
            .filter((i: Row) => i.dietTypeId === d.id)
            .reduce((s: number, i: Row) => s + i.quantity, 0),
        ]),
      ),
    [data],
  );
  return (
    <section className={panel}>
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h2 className="text-xl font-black text-[#123c36]">
            Tổng hợp ngày {date}
          </h2>
          <p className="text-sm text-neutral-600">
            Tự làm mới khi đổi ngày; dùng nút trình duyệt để tải lại dữ liệu mới
            nhất.
          </p>
        </div>
        <a
          href={`/api/admin/meal-orders/export?date=${date}`}
          className="rounded-lg border-2 border-[#123c36] px-3 py-2 font-bold text-[#123c36]"
        >
          Xuất Excel
        </a>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-[#e7f2ed] text-left">
              <th className="p-2">Khoa · bữa</th>
              {data.dietTypes.map((d: Row) => (
                <th key={d.id} className="p-2 text-right">
                  {d.name}
                </th>
              ))}
              <th className="p-2 text-right">Tổng</th>
              <th className="p-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {data.orders.map((o: Row) => (
              <tr key={o.id} className="border-b">
                <td className="p-2 font-bold">
                  {o.department.name} · {o.mealType.name}
                </td>
                {data.dietTypes.map((d: Row) => (
                  <td key={d.id} className="p-2 text-right">
                    {o.items.find((i: Row) => i.dietTypeId === d.id)
                      ?.quantity ?? 0}
                  </td>
                ))}
                <td className="p-2 text-right font-black">
                  {o.items.reduce((s: number, i: Row) => s + i.quantity, 0)}
                </td>
                <td className="p-2">
                  <span className="mr-2 rounded-full bg-neutral-100 px-2 py-1 text-xs font-bold">
                    {o.status}
                  </span>
                  {["ADMIN", "KITCHEN_MANAGER"].includes(data.user.role) &&
                    o.status !== "LOCKED" && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          void act({ action: "lockOrder", id: o.id })
                        }
                        className="text-xs font-bold text-[#0c5f4d] underline"
                      >
                        Khóa
                      </button>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#123c36] font-black text-white">
              <td className="p-2">TỔNG</td>
              {data.dietTypes.map((d: Row) => (
                <td key={d.id} className="p-2 text-right">
                  {totals[d.id]}
                </td>
              ))}
              <td className="p-2 text-right">
                {Object.values(totals).reduce(
                  (a: number, b) => a + Number(b),
                  0,
                )}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function ChangeApprovals({
  data,
  busy,
  act,
}: {
  data: Row;
  busy: boolean;
  act: (p: Row) => Promise<boolean>;
}) {
  if (!["ADMIN", "KITCHEN_MANAGER"].includes(data.user.role)) return null;
  const pending = data.orders.flatMap((order: Row) =>
    order.changeRequests.map((request: Row) => ({ order, request })),
  );
  if (!pending.length) return null;
  return (
    <section className={panel}>
      <h2 className="text-xl font-black text-[#6b4f08]">
        Thay đổi chờ bếp trưởng duyệt
      </h2>
      <div className="mt-3 space-y-2">
        {pending.map(({ order, request }: Row) => (
          <article
            key={request.id}
            className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3"
          >
            <b>
              {order.publicCode} · {order.department.name} ·{" "}
              {order.mealType.name}
            </b>
            <p className="mt-1 text-sm">Lý do: {request.reason}</p>
            <div className="mt-2 flex gap-2">
              <button
                disabled={busy}
                onClick={() =>
                  void act({
                    action: "resolveChange",
                    id: request.id,
                    decision: "APPROVED",
                    reviewNote: "Bếp trưởng chấp thuận",
                  })
                }
                className="rounded-lg bg-[#0c5f4d] px-3 py-2 text-sm font-bold text-white"
              >
                Chấp thuận
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void act({
                    action: "resolveChange",
                    id: request.id,
                    decision: "REJECTED",
                    reviewNote: "Bếp trưởng từ chối",
                  })
                }
                className="rounded-lg border-2 border-rose-400 bg-white px-3 py-2 text-sm font-bold text-rose-700"
              >
                Từ chối
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ConfigPanel({
  data,
  busy,
  act,
}: {
  data: Row;
  busy: boolean;
  act: (p: Row) => Promise<boolean>;
}) {
  const [kind, setKind] = useState("department");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [service, setService] = useState("11:00");
  const [cutoff, setCutoff] = useState("08:30");
  const [userId, setUserId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  return (
    <section className={panel}>
      <h2 className="text-xl font-black text-[#123c36]">Cấu hình ban đầu</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await act({
              action: "configure",
              kind,
              code,
              name,
              serviceLocalTime: service,
              cutoffLocalTime: cutoff,
              userId,
              departmentId,
            })
          ) {
            setCode("");
            setName("");
          }
        }}
        className="mt-3 grid gap-3 sm:grid-cols-3"
      >
        <label className="font-bold">
          Loại
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className={input}
          >
            <option value="department">Khoa/phòng</option>
            <option value="mealType">Bữa ăn</option>
            <option value="dietType">Chế độ ăn</option>
            <option value="membership">Gán nhân viên vào khoa</option>
          </select>
        </label>
        {kind === "membership" ? (
          <>
            <label className="font-bold">
              Nhân viên
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className={input}
              >
                <option value="">Chọn…</option>
                {data.users.map((u: Row) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName} · {u.role}
                  </option>
                ))}
              </select>
            </label>
            <label className="font-bold">
              Khoa
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className={input}
              >
                <option value="">Chọn…</option>
                {data.departments.map((d: Row) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label className="font-bold">
              Mã
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={input}
              />
            </label>
            <label className="font-bold">
              Tên
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={input}
              />
            </label>
            {kind === "mealType" && (
              <>
                <label className="font-bold">
                  Giờ phục vụ
                  <input
                    type="time"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className={input}
                  />
                </label>
                <label className="font-bold">
                  Giờ chốt
                  <input
                    type="time"
                    value={cutoff}
                    onChange={(e) => setCutoff(e.target.value)}
                    className={input}
                  />
                </label>
              </>
            )}
          </>
        )}
        <button
          disabled={busy}
          className="self-end rounded-lg bg-[#123c36] px-4 py-2.5 font-bold text-white"
        >
          Lưu cấu hình
        </button>
      </form>
    </section>
  );
}

function SnapshotMenuPanel({ data, date, busy, uploadPhoto }: { data: Row; date: string; busy: boolean; uploadPhoto: (itemId: string, file: File) => Promise<boolean> }) {
  if (!["ADMIN", "DIETITIAN", "KITCHEN_MANAGER", "KITCHEN_STAFF"].includes(data.user.role)) return null;
  const labelGroups = buildMealLabelGroups(data.orders);
  const labels = expandMealLabels(labelGroups);
  function printLabels() {
    document.body.classList.add("print-meal-labels");
    window.addEventListener("afterprint", () => document.body.classList.remove("print-meal-labels"), { once: true });
    window.print();
  }
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
      <section className="overflow-hidden rounded-2xl border border-[#123c36]/15 bg-white">
        <div className="border-b border-[#123c36]/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#123c36]">Thực đơn đã duyệt</h2>
          <p className="mt-1 text-sm text-neutral-600">Chỉ đọc bản chụp từ Tính khẩu phần; không nhập món hoặc gram tại đây.</p>
        </div>
        <div className="grid gap-3 px-5 py-4">
          {data.menus.length ? data.menus.map((menu: Row) => (
            <article key={menu.id} className="overflow-hidden rounded-xl border border-[#123c36]/10">
              <div className="border-b border-[#123c36]/10 px-4 py-3 font-medium text-[#123c36]">{menu.mealType.name}</div>
              <div className="grid gap-2 p-3">
                {menu.items.map((item: Row) => (
                  <div key={item.id} className="rounded-lg bg-[#e1f5ee] px-3 py-2 text-sm">
                    <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-[#085041]">{item.dietType.name}</span>
                    <p className="mt-1 text-[#24483f]">{item.dishName}</p>
                    <p className="mt-1 text-xs text-neutral-500">Duyệt {item.approvedAt ? new Date(item.approvedAt).toLocaleString("vi-VN") : "—"}{item.approvedBy?.displayName ? " · " + item.approvedBy.displayName : ""}</p>
                    {item.photoUrl && <div className="mt-2 overflow-hidden rounded-lg border border-[#123c36]/10 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.photoUrl} alt={`Ảnh đối chứng ${item.dietType.name}`} className="aspect-[4/3] w-full object-cover" />
                    </div>}
                    {["DIETITIAN", "KITCHEN_MANAGER", "KITCHEN_STAFF"].includes(data.user.role) && <form className="mt-2 flex flex-wrap items-center gap-2" onSubmit={(event) => {
                      event.preventDefault();
                      const file = new FormData(event.currentTarget).get("photo");
                      if (file instanceof File && file.size > 0) void uploadPhoto(item.id, file);
                    }}>
                      <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required className="min-w-0 flex-1 rounded-lg border border-[#8fa99e] bg-white px-2 py-1.5 text-xs" />
                      <button disabled={busy} className="rounded-lg bg-[#0f6e56] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{item.photoUrl ? "Đổi ảnh" : "Tải ảnh đối chứng"}</button>
                    </form>}
                  </div>
                ))}
              </div>
            </article>
          )) : <p className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">Chưa có thực đơn nào được duyệt cho ngày này.</p>}
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-[#123c36]/15 bg-white">
        <div className="border-b border-[#123c36]/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#123c36]">Bảng đi chợ toàn viện</h2>
          <p className="mt-1 text-sm text-neutral-600">Sống sạch = gram/người × tổng suất các khoa. Số mua có tính tỷ lệ thải bỏ.</p>
        </div>
        <div className="grid gap-3 px-5 py-4">
          {data.shoppingLists.map((list: Row) => (
            <article key={list.mealType.id} className="overflow-hidden rounded-xl border border-[#123c36]/10">
              <div className="flex items-center justify-between gap-3 bg-[#e1f5ee] px-5 py-3">
                <span className="font-medium text-[#085041]">{list.mealType.name}</span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#085041]">Đi chợ</span>
              </div>
              {list.items.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead><tr className="border-y border-[#123c36]/10 text-left text-xs text-neutral-500"><th className="px-4 py-2 font-normal">Thực phẩm</th><th className="px-4 py-2 text-right font-normal">Sống sạch</th><th className="px-4 py-2 text-right font-normal">Mua</th></tr></thead>
                    <tbody>{list.items.map((item: Row) => <tr key={item.foodId} className="border-b border-[#123c36]/5 last:border-b-0"><td className="px-4 py-2.5 font-medium text-[#24483f]">{item.foodName}</td><td className="px-4 py-2.5 text-right tabular-nums">{Math.round(item.edibleGrams).toLocaleString("vi-VN")} g</td><td className="px-4 py-2.5 text-right font-medium tabular-nums text-[#085041]">{item.rawGrams == null ? "—" : Math.round(item.rawGrams).toLocaleString("vi-VN") + " g"}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : <p className="px-5 py-4 text-sm text-neutral-600">Chưa có nguyên liệu đủ điều kiện tính.</p>}
              {list.incomplete.length > 0 && <div className="border-t border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900"><span className="font-medium">Cảnh báo — không đoán số thiếu:</span><ul className="mt-1 list-disc pl-5">{list.incomplete.map((warning: Row, index: number) => <li key={warning.menuItemId + "-" + index}>{warning.dishName}: {warning.reason}</li>)}</ul></div>}
            </article>
          ))}
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-[#123c36]/15 bg-white xl:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#123c36]/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#123c36]">Tem dán suất ăn</h2>
            <p className="mt-1 text-sm text-neutral-600">Mỗi suất đã chốt tạo một tem, chỉ gồm ngày, bữa, khoa và chế độ ăn.</p>
          </div>
          <button type="button" onClick={printLabels} disabled={!labels.length} className="rounded-lg bg-[#0f6e56] px-4 py-2 font-semibold text-white hover:bg-[#0c5a47] disabled:opacity-50">
            In {labels.length.toLocaleString("vi-VN")} tem A4
          </button>
        </div>
        <div className="px-5 py-4">
          {labelGroups.length ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {labelGroups.map((group: Row) => (
                <div key={group.key} className="flex items-center justify-between gap-3 rounded-lg border border-[#123c36]/10 px-3 py-2 text-sm">
                  <div><span className="font-medium text-[#123c36]">{group.department}</span><span className="text-neutral-500"> · {group.mealType} · {group.dietType}</span></div>
                  <span className="rounded-full bg-[#e1f5ee] px-2.5 py-1 font-medium tabular-nums text-[#085041]">{group.quantity} tem</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-neutral-600">Chưa có suất đã chốt để in tem trong ngày này.</p>}
        </div>
      </section>
      <section className="meal-label-sheet" aria-hidden="true">
        {labels.map((label: Row) => (
          <article key={`${label.key}-${label.index}`} className="meal-label">
            <p className="meal-label-brand">DINH DƯỠNG 2598</p>
            <p className="meal-label-diet">{label.dietType}</p>
            <p className="meal-label-department">{label.department}</p>
            <div className="meal-label-meta"><span>{label.mealType}</span><span>{date.split("-").reverse().join("/")}</span></div>
          </article>
        ))}
      </section>
    </div>
  );
}

function ShiftPanel({
  data,
  date,
  busy,
  act,
}: {
  data: Row;
  date: string;
  busy: boolean;
  act: (p: Row) => Promise<boolean>;
}) {
  const [name, setName] = useState("Ca sáng");
  const [startsAt, setStartsAt] = useState("05:00");
  const [endsAt, setEndsAt] = useState("13:00");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [task, setTask] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  if (!["ADMIN", "KITCHEN_MANAGER"].includes(data.user.role)) return null;
  const kitchenUsers = data.users.filter((u: Row) =>
    ["KITCHEN_MANAGER", "KITCHEN_STAFF", "ADMIN"].includes(u.role),
  );
  return (
    <section className={panel}>
      <h2 className="text-xl font-black text-[#123c36]">
        Lịch trực và nhiệm vụ
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void act({
            action: "saveShift",
            shiftDate: date,
            name,
            startsAt,
            endsAt,
            memberIds,
          });
        }}
        className="mt-3 grid gap-3 sm:grid-cols-4"
      >
        <label className="font-bold">
          Tên ca
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={input}
          />
        </label>
        <label className="font-bold">
          Bắt đầu
          <input
            type="time"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={input}
          />
        </label>
        <label className="font-bold">
          Kết thúc
          <input
            type="time"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className={input}
          />
        </label>
        <label className="font-bold">
          Nhân viên
          <select
            multiple
            value={memberIds}
            onChange={(e) =>
              setMemberIds([...e.target.selectedOptions].map((o) => o.value))
            }
            className={input}
          >
            {kitchenUsers.map((u: Row) => (
              <option key={u.id} value={u.id}>
                {u.displayName}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={busy}
          className="rounded-lg bg-[#123c36] px-4 py-2.5 font-bold text-white"
        >
          Tạo ca trực
        </button>
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void act({
            action: "createTask",
            shiftId,
            title: task,
            assignedToId,
          });
        }}
        className="mt-4 grid gap-3 sm:grid-cols-3"
      >
        <label className="font-bold">
          Ca
          <select
            value={shiftId}
            onChange={(e) => setShiftId(e.target.value)}
            className={input}
          >
            <option value="">Chọn…</option>
            {data.shifts.map((s: Row) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="font-bold">
          Nhiệm vụ
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            className={input}
          />
        </label>
        <label className="font-bold">
          Giao cho
          <select
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            className={input}
          >
            <option value="">Cả ca</option>
            {kitchenUsers.map((u: Row) => (
              <option key={u.id} value={u.id}>
                {u.displayName}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={busy || !shiftId || !task}
          className="rounded-lg bg-[#0c5f4d] px-4 py-2.5 font-bold text-white"
        >
          Giao nhiệm vụ
        </button>
      </form>
      <KitchenPanel data={data} busy={busy} act={act} />
    </section>
  );
}

function KitchenPanel({
  data,
  busy,
  act,
}: {
  data: Row;
  busy: boolean;
  act: (p: Row) => Promise<boolean>;
}) {
  return (
    <div className="grid gap-3">
      {data.shifts.map((s: Row) => (
        <article
          key={s.id}
          className="rounded-xl border-2 border-[#9bb9ad] bg-[#f7faf8] p-4"
        >
          <h3 className="font-black text-[#123c36]">
            {s.name} ·{" "}
            {new Date(s.startsAt).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Ho_Chi_Minh",
            })}
            –
            {new Date(s.endsAt).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Ho_Chi_Minh",
            })}
          </h3>
          <p className="mt-1 text-sm">
            Trực:{" "}
            {s.members
              .map(
                (m: Row) =>
                  `${m.user.displayName}${m.role === "LEAD" ? " (trưởng ca)" : ""}`,
              )
              .join(", ") || "Chưa phân công"}
          </p>
          <div className="mt-3 space-y-2">
            {s.tasks.map((t: Row) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3"
              >
                <div>
                  <b>{t.title}</b>
                  <p className="text-xs text-neutral-600">
                    {t.assignedTo?.displayName ?? "Cả ca"} · {t.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  {t.status === "TODO" && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void act({
                          action: "taskStatus",
                          id: t.id,
                          status: "ACKNOWLEDGED",
                        })
                      }
                      className="rounded border border-[#0c5f4d] px-2 py-1 text-xs font-bold text-[#0c5f4d]"
                    >
                      Đã nhận
                    </button>
                  )}
                  {t.status !== "COMPLETED" && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void act({
                          action: "taskStatus",
                          id: t.id,
                          status: "COMPLETED",
                        })
                      }
                      className="rounded bg-[#123c36] px-2 py-1 text-xs font-bold text-white"
                    >
                      Hoàn thành
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
      {!data.shifts.length && (
        <p className="rounded-xl border border-dashed border-[#8fa99e] p-5 text-center text-neutral-600">
          Chưa có ca trực trong ngày.
        </p>
      )}
    </div>
  );
}

function OrderCards({ orders }: { orders: Row[] }) {
  return (
    <div className="mt-2 grid gap-2">
      {orders.map((o) => (
        <article
          key={o.id}
          className="rounded-xl border border-[#c9d9d2] bg-[#f7faf8] p-3"
        >
          <div className="flex justify-between gap-2">
            <b>
              {o.publicCode} · {o.department.name} · {o.mealType.name}
            </b>
            <span className="text-xs font-bold">{o.status}</span>
          </div>
          <p className="mt-1 text-sm">
            {o.items
              .map((i: Row) => `${i.dietType.name}: ${i.quantity}`)
              .join(" · ")}{" "}
            · Tổng {o.items.reduce((s: number, i: Row) => s + i.quantity, 0)}
          </p>
        </article>
      ))}
    </div>
  );
}

function WorkflowHint({ role }: { role: "nurse" | "manager" }) {
  const steps =
    role === "nurse"
      ? ["Chọn khoa & bữa", "Nhập số suất", "Kiểm tra tổng", "Xác nhận"]
      : ["Theo dõi khoa", "Duyệt thay đổi", "Khóa số", "Bàn giao bếp"];
  return (
    <nav
      aria-label="Quy trình nhanh"
      className="grid grid-cols-2 gap-2 rounded-2xl border border-[#b8cbc3] bg-[#eef6f2] p-3 sm:grid-cols-4"
    >
      {steps.map((step, index) => (
        <div
          key={step}
          className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#123c36]"
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#123c36] text-xs text-white">
            {index + 1}
          </span>
          {step}
        </div>
      ))}
    </nav>
  );
}

function PublicNoteReview({
  data,
  busy,
  act,
}: {
  data: Row;
  busy: boolean;
  act: (p: Row) => Promise<boolean>;
}) {
  if (!["ADMIN", "DIETITIAN", "DEPARTMENT_STAFF"].includes(data.user.role))
    return null;
  const notes = (data.publicNotes ?? []).filter(
    (note: Row) => note.status === "RECEIVED",
  );
  if (!notes.length)
    return (
      <section className={panel}>
        <h2 className="text-lg font-black text-[#123c36]">
          Ghi chú người bệnh chờ duyệt
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Không có ghi chú mới trong ngày.
        </p>
      </section>
    );
  return (
    <section className={panel}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[#123c36]">
            Ghi chú người bệnh chờ duyệt
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Kiểm tra trực tiếp với người bệnh khi nội dung liên quan dị ứng hoặc
            an toàn.
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-900">
          {notes.length} chờ
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {notes.map((note: Row) => (
          <article
            key={note.id}
            className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <b className="text-[#123c36]">
                {note.departmentName} ·{" "}
                {note.roomBed || "Chưa ghi phòng/giường"}
              </b>
              <span className="text-xs font-bold text-neutral-600">
                {note.publicCode}
              </span>
            </div>
            <p className="mt-2 text-base font-semibold text-neutral-900">
              {note.note}
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              Người gửi: {note.reporterName} ·{" "}
              {new Date(note.createdAt).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                disabled={busy}
                onClick={() =>
                  void act({
                    action: "resolvePublicNote",
                    id: note.id,
                    decision: "APPROVED",
                  })
                }
                className="rounded-lg bg-[#123c36] px-4 py-2 font-bold text-white"
              >
                Duyệt gửi bếp
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void act({
                    action: "resolvePublicNote",
                    id: note.id,
                    decision: "REJECTED",
                    reviewNote: "Không chuyển bếp",
                  })
                }
                className="rounded-lg border-2 border-neutral-400 bg-white px-4 py-2 font-bold text-neutral-700"
              >
                Không chuyển
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ApprovedPublicNotes({ data }: { data: Row }) {
  const notes = (data.publicNotes ?? []).filter(
    (note: Row) => note.status === "APPROVED",
  );
  return (
    <section className={panel}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#123c36]">
            Ghi chú đã được điều dưỡng duyệt
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Chỉ thực hiện các ghi chú đã qua xác nhận của khoa.
          </p>
        </div>
        <span className="rounded-full bg-[#e7f2ed] px-3 py-1 text-sm font-black text-[#123c36]">
          {notes.length}
        </span>
      </div>
      {notes.length ? (
        <div className="mt-4 grid gap-2">
          {notes.map((note: Row) => (
            <article
              key={note.id}
              className="rounded-xl border-l-4 border-[#123c36] bg-[#f3f8f6] p-4"
            >
              <b>
                {note.departmentName} ·{" "}
                {note.roomBed || "Chưa ghi phòng/giường"}
              </b>
              <p className="mt-1 text-base">{note.note}</p>
              <p className="mt-1 text-xs text-neutral-600">
                Duyệt bởi {note.reviewedByName || "điều dưỡng"}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-neutral-600">
          Không có ghi chú đã duyệt trong ngày.
        </p>
      )}
    </section>
  );
}

function DoctorPanel({
  data,
  date,
  busy,
  act,
}: {
  data: Row;
  date: string;
  busy: boolean;
  act: (p: Row) => Promise<boolean>;
}) {
  const [form, setForm] = useState({
    patientCode: "",
    departmentId: data.departments[0]?.id ?? "",
    room: "",
    dietTypeId: data.dietTypes[0]?.id ?? "",
    effectiveDate: date,
    endDate: "",
    clinicalNote: "",
    critical: false,
  });
  if (data.user.role !== "CLINICIAN")
    return (
      <section className="overflow-hidden rounded-2xl border border-[#123c36]/15 bg-white">
        <div className="border-b border-[#123c36]/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-rose-800">Không đúng vai trò</h2>
        </div>
        <p className="px-5 py-4">
          Màn hình này chỉ dành cho tài khoản bác sĩ có vai trò CLINICIAN.
        </p>
      </section>
    );
  const active = (data.dietOrders ?? []).filter(
    (order: Row) => order.status === "ACTIVE",
  );
  const doctorInput =
    "mt-1 w-full rounded-lg border border-[#8fa99e] bg-white px-3 py-2 text-sm";
  async function submit(e: FormEvent) {
    e.preventDefault();
    const ok = await act({
      action: "createDietOrder",
      ...form,
      endDate: form.endDate || null,
    });
    if (ok)
      setForm((old) => ({
        ...old,
        patientCode: "",
        room: "",
        clinicalNote: "",
        critical: false,
      }));
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,440px)_1fr]">
      <section className="overflow-hidden rounded-2xl border border-[#123c36]/15 bg-white">
        <div className="border-b border-[#123c36]/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#123c36]">Tạo chỉ định</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Chỉ nhập mã người bệnh nội bộ. Không nhập họ tên, chẩn đoán, CCCD hoặc
            bệnh án.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3 px-5 py-4">
          <label className="block text-sm font-medium text-[#24483f]">
            Mã người bệnh *
            <input
              required
              maxLength={80}
              value={form.patientCode}
              onChange={(e) =>
                setForm({ ...form, patientCode: e.target.value.toUpperCase() })
              }
              className={doctorInput}
              placeholder="Ví dụ: NB-00125"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-[#24483f]">
              Khoa *
              <select
                required
                value={form.departmentId}
                onChange={(e) =>
                  setForm({ ...form, departmentId: e.target.value })
                }
                className={doctorInput}
              >
                {data.departments.map((item: Row) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-[#24483f]">
              Phòng
              <input
                maxLength={80}
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                className={doctorInput}
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-[#24483f]">
            Chế độ ăn *
            <select
              required
              value={form.dietTypeId}
              onChange={(e) => setForm({ ...form, dietTypeId: e.target.value })}
              className={doctorInput}
            >
              {data.dietTypes.map((item: Row) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-[#24483f]">
              Hiệu lực từ *
              <input
                required
                type="date"
                value={form.effectiveDate}
                onChange={(e) =>
                  setForm({ ...form, effectiveDate: e.target.value })
                }
                className={doctorInput}
              />
            </label>
            <label className="text-sm font-medium text-[#24483f]">
              Kết thúc dự kiến
              <input
                type="date"
                min={form.effectiveDate}
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className={doctorInput}
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-[#24483f]">
            Ghi chú chuyên môn
            <textarea
              maxLength={500}
              rows={3}
              value={form.clinicalNote}
              onChange={(e) =>
                setForm({ ...form, clinicalNote: e.target.value })
              }
              className={doctorInput}
            />
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 font-medium text-amber-900">
            <input
              type="checkbox"
              checked={form.critical}
              onChange={(e) => setForm({ ...form, critical: e.target.checked })}
              className="mt-1 h-5 w-5"
            />
            <span>
              Cần xác minh trực tiếp
              <span className="mt-1 block text-xs font-normal">
                Dùng cho trường hợp cần điều dưỡng kiểm tra trực tiếp; không
                thay thế cảnh báo khẩn cấp.
              </span>
            </span>
          </label>
          <button
            disabled={
              busy ||
              !form.patientCode ||
              !form.departmentId ||
              !form.dietTypeId
            }
            className="w-full rounded-lg bg-[#0f6e56] px-5 py-2.5 font-semibold text-white transition hover:bg-[#0c5a47] disabled:opacity-50"
          >
            Lưu chỉ định
          </button>
        </form>
      </section>
      <section className="overflow-hidden rounded-2xl border border-[#123c36]/15 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-[#123c36]/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#123c36]">
              Chỉ định đang hoạt động
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Tạo chỉ định mới cho cùng mã chỉ sau khi kết thúc chỉ định cũ.
            </p>
          </div>
          <span className="rounded-full bg-[#e1f5ee] px-3 py-1 text-xs font-medium text-[#085041]">
            {active.length}
          </span>
        </div>
        <div className="grid gap-3 px-5 py-4">
          {active.map((order: Row) => (
            <article
              key={order.id}
              className={`rounded-xl border px-4 py-3 ${order.critical ? "border-amber-400 bg-amber-50 text-amber-900" : "border-[#123c36]/10 bg-white"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="text-lg font-semibold text-[#123c36]">{order.patientCode}</span>
                  <p className="text-sm">
                    {order.department.name} · {order.room || "Chưa ghi phòng"}
                  </p>
                </div>
                {order.critical && (
                  <span className="rounded-full border border-amber-400 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    XÁC MINH TRỰC TIẾP
                  </span>
                )}
              </div>
              <p className="mt-2 font-medium">{order.dietType.name}</p>
              <p className="mt-1 text-sm text-neutral-600">
                Hiệu lực {String(order.effectiveDate).slice(0, 10)}
                {order.endDate
                  ? ` đến ${String(order.endDate).slice(0, 10)}`
                  : " · không thời hạn"}{" "}
                · BS {order.prescribedBy.displayName}
              </p>
              {order.clinicalNote && (
                <p className="mt-2 rounded-lg bg-white p-2 text-sm">
                  {order.clinicalNote}
                </p>
              )}
              <button
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      `Kết thúc chỉ định của ${order.patientCode}?`,
                    )
                  )
                    void act({
                      action: "endDietOrder",
                      id: order.id,
                      endDate:
                        String(order.effectiveDate).slice(0, 10) > date
                          ? String(order.effectiveDate).slice(0, 10)
                          : date,
                    });
                }}
                className="mt-3 rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-50 disabled:opacity-50"
              >
                Kết thúc chỉ định
              </button>
            </article>
          ))}
          {!active.length && (
            <p className="rounded-xl border border-dashed border-[#8fa99e] p-5 text-center text-neutral-600">
              Chưa có chỉ định đang hoạt động trong ngày.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
