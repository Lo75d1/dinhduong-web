"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useMemo, useState } from "react";
import MenuFoodSearch from "@/app/tinh-khau-phan/MenuFoodSearch";

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
        <DoctorPanel data={data} date={date} busy={busy} act={act} />
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
          <MenuPanel data={data} date={date} busy={busy} act={act} />
          <KitchenShoppingPanel data={data} />
          <ShiftPanel data={data} date={date} busy={busy} act={act} />
        </>
      )}
      {mode === "kitchen" && (
        <>
          <ApprovedPublicNotes data={data} />
          <KitchenShoppingPanel data={data} />
          <KitchenPanel data={data} busy={busy} act={act} />
        </>
      )}
    </main>
  );
}

function KitchenShoppingPanel({ data }: { data: Row }) {
  const fmt = (value: number | null) => value == null ? "—" : value >= 1000 ? `${(value / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} kg` : `${Math.round(value)} g`;
  if (!data.menus?.length) return <section className={panel}><h2 className="text-xl font-black text-[#123c36]">Bảng đi chợ / xuất kho</h2><p className="mt-2 text-neutral-600">Chưa có thực đơn cho ngày đã chọn.</p></section>;
  return (
    <section className={panel}>
      <h2 className="text-xl font-black text-[#123c36]">Bảng đi chợ / xuất kho theo số suất</h2>
      <p className="mt-1 text-sm text-neutral-600">Tự động lấy gram mỗi suất × tổng số suất điều dưỡng đã chốt. Lượng mua có tính tỷ lệ thải bỏ khi kho thực phẩm có dữ liệu.</p>
      <div className="mt-4 grid gap-4">
        {data.menus.map((menu: Row) => {
          const list = data.shoppingLists?.find((item: Row) => item.menuId === menu.id);
          return <article key={menu.id} className="overflow-hidden rounded-xl border border-[#b8cbc3]">
            <div className="bg-[#eef6f2] px-4 py-3"><b className="text-[#123c36]">{menu.mealType.name} · {menu.title}</b><span className="ml-2 text-xs font-bold">{menu.status}</span></div>
            {list?.items?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b text-left"><th className="px-3 py-2">Thực phẩm</th><th className="px-3 py-2 text-right">Sống sạch</th><th className="px-3 py-2 text-right">Mua / xuất kho</th><th className="px-3 py-2 text-right">Thải bỏ</th></tr></thead><tbody>{list.items.map((item: Row) => <tr key={item.foodId} className="border-b border-neutral-100"><td className="px-3 py-2 font-medium">{item.foodName}</td><td className="px-3 py-2 text-right tabular-nums">{fmt(item.edibleGrams)}</td><td className="px-3 py-2 text-right tabular-nums">{fmt(item.rawGrams)}</td><td className="px-3 py-2 text-right">{item.wastePercent == null ? "—" : `${item.wastePercent}%`}</td></tr>)}</tbody></table></div> : <p className="p-4 text-sm text-neutral-600">Chưa có số suất hoặc chưa có món đủ dữ liệu để tính.</p>}
            {!!list?.incomplete?.length && <div className="border-t border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><b>Cần hoàn thiện dữ liệu:</b><ul className="mt-1 list-disc pl-5">{list.incomplete.slice(0, 10).map((item: Row, index: number) => <li key={`${item.menuItemId}-${index}`}>{item.dishName}: {item.reason}</li>)}</ul></div>}
          </article>;
        })}
      </div>
    </section>
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
  const suggestionFor = (dietTypeId: string) =>
    data.dietOrderSuggestions?.[`${departmentId}:${dietTypeId}`] ?? 0;
  const mismatch = data.dietTypes.some(
    (d: Row) => (quantities[d.id] ?? 0) !== suggestionFor(d.id),
  );
  const criticalOrders = (data.dietOrders ?? []).filter(
    (order: Row) => order.departmentId === departmentId && order.critical,
  );
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
  return (
    <section className={panel}>
      <h2 className="text-xl font-black text-[#123c36]">Phiếu báo suất</h2>
      {criticalOrders.length > 0 && (
        <div className="mt-3 rounded-xl border-2 border-amber-500 bg-amber-50 p-3 text-amber-950">
          <b>Cần xác minh trực tiếp ({criticalOrders.length})</b>
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
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900">
          Quản trị viên cần cấu hình khoa, bữa và chế độ ăn trước.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="font-bold">
              Khoa/phòng
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  selectOrder(e.target.value, mealTypeId);
                }}
                className={input}
              >
                {data.departments.map((d: Row) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="font-bold">
              Bữa
              <select
                value={mealTypeId}
                onChange={(e) => {
                  setMealTypeId(e.target.value);
                  selectOrder(departmentId, e.target.value);
                }}
                className={input}
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
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.dietTypes.map((d: Row) => (
              <label
                key={d.id}
                className="rounded-xl border-2 border-[#c9d9d2] bg-[#f6faf8] p-3 font-bold text-[#24483f]"
              >
                <span className="flex items-center justify-between gap-2">
                  <span>{d.name}</span>
                  <span className="rounded-full bg-[#dcebe5] px-2 py-1 text-xs">
                    Gợi ý {suggestionFor(d.id)}
                  </span>
                </span>
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
                  className="mt-2 w-full rounded-lg border-2 border-[#8fa99e] bg-white px-3 py-3 text-center text-xl font-black"
                />
              </label>
            ))}
          </div>
          {mismatch && (
            <p className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3 font-bold text-amber-950">
              Số nhập đang khác số gợi ý từ chỉ định. Hãy kiểm tra lại và ghi rõ
              lý do trước khi xác nhận.
            </p>
          )}
          <label className="block font-bold">
            Ghi chú {mismatch && "*"}
            <input
              required={mismatch}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={input}
            />
          </label>
          <div className="flex items-center justify-between rounded-xl bg-[#e7f2ed] p-4">
            <b className="text-lg text-[#123c36]">Tổng: {total} suất</b>
            <button
              disabled={busy || total === 0 || (mismatch && !note.trim())}
              className="rounded-xl bg-[#123c36] px-5 py-3 font-black text-white disabled:opacity-50"
            >
              Xác nhận báo suất
            </button>
          </div>
        </form>
      )}
      <h3 className="mt-6 font-black">Phiếu đã báo trong ngày</h3>
      <OrderCards orders={data.orders} />
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

function MenuPanel({
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
  const [mealTypeId, setMealTypeId] = useState(data.mealTypes[0]?.id ?? "");
  const [title, setTitle] = useState("Thực đơn trong ngày");
  const [selectedDietTypeId, setSelectedDietTypeId] = useState(data.dietTypes[0]?.id ?? "");
  const [menuRows, setMenuRows] = useState<Row[]>([]);
  useEffect(() => {
    const existing = data.menus.find((menu: Row) => menu.mealTypeId === mealTypeId);
    setTitle(existing?.title ?? "Thực đơn trong ngày");
    setMenuRows((existing?.items ?? []).filter((item: Row) => item.dishId).map((item: Row) => ({
      localId: item.id,
      dietTypeId: item.dietTypeId,
      dishId: item.dishId,
      dishName: item.dishName,
      servingWeightG: item.servingWeightG ?? item.dish?.totalWeightG ?? 0,
      ingredientCount: item.dish?.ingredients?.length ?? 0,
      linkedIngredientCount: item.dish?.ingredients?.filter((ingredient: Row) => ingredient.food).length ?? 0,
    })));
  }, [mealTypeId, data.menus]);
  if (!["ADMIN", "DIETITIAN", "KITCHEN_MANAGER"].includes(data.user.role))
    return null;
  return (
    <section className={panel}>
      <h2 className="text-xl font-black text-[#123c36]">Thực đơn vận hành</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void act({
            action: "saveMenu",
            mealDate: date,
            mealTypeId,
            title,
            items: menuRows.map((row) => ({
              dietTypeId: row.dietTypeId,
              dishId: row.dishId,
              servingWeightG: Number(row.servingWeightG),
            })),
          });
        }}
        className="mt-3 space-y-3"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="font-bold">
            Bữa
            <select
              value={mealTypeId}
              onChange={(e) => setMealTypeId(e.target.value)}
              className={input}
            >
              {data.mealTypes.map((m: Row) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="font-bold">
            Tên thực đơn
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={input}
            />
          </label>
        </div>
        <div className="rounded-xl border border-[#b8cbc3] bg-[#f7faf8] p-3">
          <label className="font-bold">
            Chế độ ăn đang thêm món
            <select value={selectedDietTypeId} onChange={(e) => setSelectedDietTypeId(e.target.value)} className={input}>
              {data.dietTypes.map((diet: Row) => <option key={diet.id} value={diet.id}>{diet.name}</option>)}
            </select>
          </label>
          <div className="mt-3">
            <MenuFoodSearch
              kind="dish"
              placeholder="Tìm món trong kho công thức…"
              onPickDish={(dish) => setMenuRows((rows) => [...rows, {
                localId: crypto.randomUUID(),
                dietTypeId: selectedDietTypeId,
                dishId: dish.id,
                dishName: dish.name,
                servingWeightG: dish.totalWeightG ?? 0,
                ingredientCount: dish.ingredients.length,
                linkedIngredientCount: dish.ingredients.filter((ingredient) => ingredient.food).length,
              }])}
            />
          </div>
        </div>
        <div className="grid gap-2">
          {menuRows.map((row) => (
            <div key={row.localId} className="grid gap-2 rounded-xl border border-[#c9d9d2] p-3 sm:grid-cols-[1fr_1fr_10rem_auto] sm:items-end">
              <div><b>{row.dishName}</b><p className="text-xs text-neutral-600">{row.linkedIngredientCount}/{row.ingredientCount} nguyên liệu đã nối dữ liệu</p></div>
              <label className="font-bold">Chế độ ăn<select value={row.dietTypeId} onChange={(e) => setMenuRows((rows) => rows.map((item) => item.localId === row.localId ? { ...item, dietTypeId: e.target.value } : item))} className={input}>{data.dietTypes.map((diet: Row) => <option key={diet.id} value={diet.id}>{diet.name}</option>)}</select></label>
              <label className="font-bold">Gram/suất<input type="number" min={1} max={5000} step="1" value={row.servingWeightG} onChange={(e) => setMenuRows((rows) => rows.map((item) => item.localId === row.localId ? { ...item, servingWeightG: e.target.value } : item))} className={input} /></label>
              <button type="button" onClick={() => setMenuRows((rows) => rows.filter((item) => item.localId !== row.localId))} className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-bold text-rose-700">Bỏ</button>
            </div>
          ))}
          {!menuRows.length && <p className="rounded-lg border border-dashed border-[#8fa99e] p-3 text-sm text-neutral-600">Chọn chế độ ăn rồi tìm món để tạo thực đơn có cấu trúc.</p>}
        </div>
        {["ADMIN", "DIETITIAN"].includes(data.user.role) && (
          <button
            disabled={busy || !menuRows.length}
            className="rounded-lg bg-[#123c36] px-4 py-2.5 font-bold text-white"
          >
            Lưu bản nháp
          </button>
        )}
      </form>
      <div className="mt-4 grid gap-2">
        {data.menus.map((m: Row) => (
          <article
            key={m.id}
            className="rounded-xl border border-[#c9d9d2] p-3"
          >
            <div className="flex justify-between">
              <b>
                {m.mealType.name} · {m.title}
              </b>
              <span>{m.status}</span>
            </div>
            <p className="mt-1 text-sm">
              {m.items
                .map((i: Row) => `${i.dietType.name}: ${i.dishName}${i.servingWeightG ? ` (${Math.round(i.servingWeightG)} g/suất)` : ""}`)
                .join(" · ")}
            </p>
            {["ADMIN", "DIETITIAN"].includes(data.user.role) &&
              m.status !== "APPROVED" && (
                <button
                  onClick={() => void act({ action: "approveMenu", id: m.id })}
                  className="mt-2 text-sm font-bold text-[#0c5f4d] underline"
                >
                  Duyệt thực đơn
                </button>
              )}
          </article>
        ))}
      </div>
    </section>
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
      <section className={panel}>
        <h2 className="text-xl font-black text-rose-800">Không đúng vai trò</h2>
        <p className="mt-2">
          Màn hình này chỉ dành cho tài khoản bác sĩ có vai trò CLINICIAN.
        </p>
      </section>
    );
  const active = (data.dietOrders ?? []).filter(
    (order: Row) => order.status === "ACTIVE",
  );
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
      <section className={panel}>
        <h2 className="text-xl font-black text-[#123c36]">Tạo chỉ định</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Chỉ nhập mã người bệnh nội bộ. Không nhập họ tên, chẩn đoán, CCCD hoặc
          bệnh án.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block font-bold">
            Mã người bệnh *
            <input
              required
              maxLength={80}
              value={form.patientCode}
              onChange={(e) =>
                setForm({ ...form, patientCode: e.target.value.toUpperCase() })
              }
              className={input}
              placeholder="Ví dụ: NB-00125"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="font-bold">
              Khoa *
              <select
                required
                value={form.departmentId}
                onChange={(e) =>
                  setForm({ ...form, departmentId: e.target.value })
                }
                className={input}
              >
                {data.departments.map((item: Row) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="font-bold">
              Phòng
              <input
                maxLength={80}
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                className={input}
              />
            </label>
          </div>
          <label className="block font-bold">
            Chế độ ăn *
            <select
              required
              value={form.dietTypeId}
              onChange={(e) => setForm({ ...form, dietTypeId: e.target.value })}
              className={input}
            >
              {data.dietTypes.map((item: Row) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="font-bold">
              Hiệu lực từ *
              <input
                required
                type="date"
                value={form.effectiveDate}
                onChange={(e) =>
                  setForm({ ...form, effectiveDate: e.target.value })
                }
                className={input}
              />
            </label>
            <label className="font-bold">
              Kết thúc dự kiến
              <input
                type="date"
                min={form.effectiveDate}
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className={input}
              />
            </label>
          </div>
          <label className="block font-bold">
            Ghi chú chuyên môn
            <textarea
              maxLength={500}
              rows={3}
              value={form.clinicalNote}
              onChange={(e) =>
                setForm({ ...form, clinicalNote: e.target.value })
              }
              className={input}
            />
          </label>
          <label className="flex items-start gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-3 font-bold text-amber-950">
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
            className="w-full rounded-xl bg-[#123c36] px-5 py-3 font-black text-white disabled:opacity-50"
          >
            Lưu chỉ định
          </button>
        </form>
      </section>
      <section className={panel}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[#123c36]">
              Chỉ định đang hoạt động
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Tạo chỉ định mới cho cùng mã chỉ sau khi kết thúc chỉ định cũ.
            </p>
          </div>
          <span className="rounded-full bg-[#e7f2ed] px-3 py-1 font-black text-[#123c36]">
            {active.length}
          </span>
        </div>
        <div className="mt-4 grid gap-3">
          {active.map((order: Row) => (
            <article
              key={order.id}
              className={`rounded-xl border-2 p-4 ${order.critical ? "border-amber-500 bg-amber-50" : "border-[#c9d9d2] bg-[#f7faf8]"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <b className="text-lg text-[#123c36]">{order.patientCode}</b>
                  <p className="text-sm">
                    {order.department.name} · {order.room || "Chưa ghi phòng"}
                  </p>
                </div>
                {order.critical && (
                  <span className="rounded-full bg-amber-600 px-3 py-1 text-xs font-black text-white">
                    XÁC MINH TRỰC TIẾP
                  </span>
                )}
              </div>
              <p className="mt-2 font-bold">{order.dietType.name}</p>
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
                className="mt-3 rounded-lg border-2 border-rose-700 px-3 py-2 text-sm font-bold text-rose-800"
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
