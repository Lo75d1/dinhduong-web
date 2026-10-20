"use client";
import { useEffect, useRef, useState } from "react";
import {
  CATALOG_TYPES,
  QUEUE_LABELS,
  type CatalogQueuePage,
  type CatalogQueueState,
  FOOD_GROUP_ORDER,
  IMAGE_LICENSES,
  MAX_BATCH_ENTRIES,
  PROTEIN_ORIGIN_ORDER,
  type CatalogBatch,
  type CatalogBatchSummary,
  type CatalogFood,
  type CatalogKey,
  type CatalogPrice,
  type CatalogProposal,
} from "@/lib/catalog-editor/contracts";
import CatalogReview from "./CatalogReview";
const base = "/api/catalog-editor";
const field =
  "mt-1 w-full min-w-0 rounded-md border border-[#819e93] bg-white px-3 py-2 text-base text-neutral-950";
const primary =
  "min-h-11 rounded-md bg-[#123c36] px-4 py-2 font-semibold text-white disabled:opacity-50";
const secondary =
  "min-h-11 rounded-md border border-[#123c36] bg-white px-4 py-2 font-semibold text-[#123c36] disabled:opacity-50";
const stateLabel = {
  DRAFT: "Đang soạn",
  SUBMITTED: "Chờ duyệt",
  RETURNED: "Cần sửa lại",
  PUBLISHED: "Đã áp dụng",
  ARCHIVED: "Đã đóng bản nháp",
};
const classificationLabel = {
  foodType: "Loại thực phẩm",
  foodGroup: "Nhóm thực phẩm",
  proteinOrigin: "Nguồn đạm",
};
type History = {
  id: string;
  action: string;
  actorName: string;
  reason: string;
  createdAt: string;
};
type BatchReply = {
  batch: CatalogBatch;
  history: History[];
  canPublish: boolean;
};
export async function catalogRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(base + path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const value = await response.json();
  if (!response.ok)
    throw new Error(
      typeof value.error === "string"
        ? value.error
        : "Chưa xử lý được yêu cầu.",
    );
  return value as T;
}
export default function CatalogWorkspace({ isAdmin }: { isAdmin: boolean }) {
  const [batches, setBatches] = useState<CatalogBatchSummary[]>([]),
    [batch, setBatch] = useState<CatalogBatch | null>(null);
  const [view, setView] = useState<"review" | "edit" | "keys">(
    isAdmin ? "review" : "edit",
  );
  const [queueState, setQueueState] = useState<CatalogQueueState>(
    isAdmin ? "SUBMITTED" : "OPEN",
  );
  const [queueSearch, setQueueSearch] = useState("");
  const [queueQuery, setQueueQuery] = useState("");
  const [queueCursor, setQueueCursor] = useState<string | null>(null);
  const [queueCounts, setQueueCounts] = useState<CatalogQueuePage["counts"]>({
    ALL: 0,
    OPEN: 0,
    SUBMITTED: 0,
    DRAFT: 0,
    RETURNED: 0,
    PUBLISHED: 0,
    ARCHIVED: 0,
  });
  const [queueVisible, setQueueVisible] = useState(true);
  const [foodsLoaded, setFoodsLoaded] = useState(false);
  const busyRef = useRef(false);
  const [history, setHistory] = useState<History[]>([]),
    [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [q, setQ] = useState(""),
    [missing, setMissing] = useState("");
  const [foods, setFoods] = useState<CatalogFood[]>([]),
    [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<CatalogFood | null>(null),
    [edit, setEdit] = useState<CatalogProposal | null>(null);
  const [jsonText, setJsonText] = useState("[]");
  const [loading, setLoading] = useState(true);
  function receive(value: CatalogBatch) {
    window.history.replaceState(null, "", `?batch=${value.id}`);
    setBatch(value);
    setTitle(value.title);
    setJsonText(
      JSON.stringify(
        value.entriesJson.map((e) => e.proposal),
        null,
        2,
      ),
    );
  }
  useEffect(() => {
    let active = true;
    const state = isAdmin ? "SUBMITTED" : "OPEN";
    Promise.all([
      catalogRequest<CatalogQueuePage>(`/batches?state=${state}`),
      isAdmin
        ? Promise.resolve(null)
        : catalogRequest<{ items: CatalogFood[]; nextCursor: string | null }>(
            "/foods",
          ),
    ])
      .then(async ([list, lookup]) => {
        if (!active) return;
        setBatches(list.items);
        setQueueCounts(list.counts);
        setQueueCursor(list.nextCursor);
        if (lookup) {
          setFoods(lookup.items);
          setCursor(lookup.nextCursor);
          setFoodsLoaded(true);
        }
        const linked = new URLSearchParams(window.location.search).get("batch");
        const batchId =
          linked && /^[A-Za-z0-9_-]{1,100}$/.test(linked)
            ? linked
            : isAdmin
              ? list.items[0]?.id
              : null;
        if (batchId) {
          const result = await catalogRequest<BatchReply>(
            `/batches/${batchId}`,
          );
          if (active) {
            receive(result.batch);
            setHistory(result.history);
            setQueueVisible(false);
          }
        }
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Chưa tải được cổng biên tập.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);
  async function run(work: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Chưa xử lý được yêu cầu.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function reloadList(
    state = queueState,
    query = queueQuery,
    after?: string,
  ) {
    const params = new URLSearchParams({ state, q: query });
    if (after) params.set("after", after);
    const data = await catalogRequest<CatalogQueuePage>(`/batches?${params}`);
    setBatches((previous) =>
      after
        ? [
            ...new Map(
              [...previous, ...data.items].map((item) => [item.id, item]),
            ).values(),
          ]
        : data.items,
    );
    setQueueCounts(data.counts);
    setQueueCursor(data.nextCursor);
    setQueueState(state);
    setQueueQuery(query);
    setQueueSearch(query);
  }
  async function loadFoods() {
    const data = await catalogRequest<{
      items: CatalogFood[];
      nextCursor: string | null;
    }>("/foods");
    setFoods(data.items);
    setCursor(data.nextCursor);
    setFoodsLoaded(true);
  }
  function switchView(next: "review" | "edit" | "keys") {
    if (busyRef.current) return;
    setView(next);
    if (next !== "keys")
      void run(async () => {
        await Promise.all([
          reloadList(next === "review" ? "SUBMITTED" : "OPEN", ""),
          next === "edit" && !foodsLoaded ? loadFoods() : Promise.resolve(),
        ]);
      });
  }
  async function openBatch(id: string) {
    const result = await catalogRequest<BatchReply>(`/batches/${id}`);
    receive(result.batch);
    setHistory(result.history);
    setSelected(null);
    setEdit(null);
    setQueueVisible(false);
  }
  async function save(entries: CatalogProposal[]) {
    if (!batch) return;
    const result = await catalogRequest<{ batch: CatalogBatch }>(
      `/batches/${batch.id}`,
      "PATCH",
      { expectedRevision: batch.revision, title, entries },
    );
    receive(result.batch);
    await reloadList();
    setNotice("Đã lưu bản nháp. Kho chính chưa thay đổi.");
  }
  async function act(
    action: "submit" | "return" | "publish" | "rebase" | "archive",
    reviewNote = "",
  ) {
    if (!batch) return;
    const result = await catalogRequest<{ batch: CatalogBatch }>(
      `/batches/${batch.id}/${action}`,
      "POST",
      {
        expectedRevision: batch.revision,
        ...(action === "return" || action === "publish" ? { reviewNote } : {}),
        ...(action === "publish"
          ? { confirmation: "APPLY_REVIEWED_BATCH" }
          : {}),
      },
    );
    receive(result.batch);
    await reloadList();
    const detail = await catalogRequest<BatchReply>(`/batches/${batch.id}`);
    setHistory(detail.history);
    setNotice(
      action === "publish"
        ? "Đã áp dụng đúng đợt được duyệt; lịch sử trước/sau đã lưu."
        : action === "submit"
          ? "Đã gửi duyệt. Kho chính chưa thay đổi."
          : action === "rebase"
            ? "Đã đọc lại kho gốc. Kiểm tra các giá trị trước/sau rồi gửi duyệt lại."
            : action === "archive"
              ? "Đã đóng bản nháp; nội dung và lịch sử vẫn được giữ lại."
              : "Đã trả lại đợt để chỉnh sửa; kho chính chưa thay đổi.",
    );
  }
  const editable =
    !!batch && (batch.state === "DRAFT" || batch.state === "RETURNED");
  return (
    <div className="min-w-0 space-y-5 text-neutral-950">
      <header className="rounded-xl border-2 border-[#123c36] bg-[#f2f8f5] p-4 sm:p-6">
        <p className="text-sm font-semibold text-[#123c36]">
          KHO THỰC PHẨM · BIÊN TẬP CÓ DUYỆT
        </p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
          Biên tập và duyệt dữ liệu
        </h1>
        <p className="mt-2 max-w-4xl text-sm leading-6">
          Rà giá, phân loại và ảnh theo từng đợt. Dữ liệu chỉ cập nhật sau khi
          được duyệt áp dụng.
        </p>
        <nav
          aria-label="Khu vực quản trị dữ liệu"
          className="mt-4 flex flex-wrap gap-2"
        >
          {isAdmin ? (
            <button
              type="button"
              disabled={busy || loading}
              aria-pressed={view === "review"}
              onClick={() => switchView("review")}
              className={view === "review" ? primary : secondary}
            >
              Duyệt dữ liệu{!queueQuery ? ` · ${queueCounts.SUBMITTED}` : ""}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy || loading}
            aria-pressed={view === "edit"}
            onClick={() => switchView("edit")}
            className={view === "edit" ? primary : secondary}
          >
            Biên tập
          </button>
          {isAdmin ? (
            <button
              type="button"
              disabled={busy || loading}
              aria-pressed={view === "keys"}
              onClick={() => switchView("keys")}
              className={view === "keys" ? primary : secondary}
            >
              Khóa AI
            </button>
          ) : null}
          {view !== "review" ? (
            <a
              href="/quan-tri/du-lieu"
              className="inline-flex min-h-11 items-center px-2 text-sm underline"
            >
              Nguồn &amp; xuất dữ liệu
            </a>
          ) : null}
        </nav>
      </header>
      {error ? (
        <p
          role="alert"
          className="rounded border border-red-400 bg-red-50 p-3 text-red-900"
        >
          {error}{" "}
          <button
            type="button"
            className="ml-2 font-semibold underline"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (batch) await openBatch(batch.id);
                else await reloadList();
              })
            }
          >
            Tải lại bản đã lưu
          </button>
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="rounded border border-emerald-500 bg-emerald-50 p-3"
        >
          {notice}
        </p>
      ) : null}
      {loading ? <p role="status">Đang mở cổng biên tập…</p> : null}
      {view !== "keys" && (
        <fieldset disabled={busy || loading} className="contents">
          <button
            type="button"
            className={secondary + " mb-3 w-full xl:hidden"}
            aria-expanded={queueVisible}
            onClick={() => setQueueVisible((value) => !value)}
          >
            {queueVisible ? "Ẩn" : "Mở"} danh sách đợt ·{" "}
            {queueCounts[queueState]}
          </button>
          <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[19rem_minmax(0,1fr)]">
            <aside
              className={`min-w-0 space-y-4 rounded-xl border border-[#b2c7bd] bg-white p-4 ${queueVisible ? "block" : "hidden xl:block"}`}
            >
              <h2 className="text-xl font-semibold">Hàng đợi dữ liệu</h2>
              <form
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(() => reloadList(queueState, queueSearch));
                }}
              >
                <label className="block text-sm">
                  Tìm đợt
                  <input
                    aria-label="Tìm đợt dữ liệu"
                    value={queueSearch}
                    onChange={(event) => setQueueSearch(event.target.value)}
                    className={field}
                  />
                </label>
                <label className="block text-sm">
                  Trạng thái
                  <select
                    aria-label="Trạng thái đợt dữ liệu"
                    value={queueState}
                    onChange={(event) =>
                      void run(() =>
                        reloadList(
                          event.target.value as CatalogQueueState,
                          queueQuery,
                        ),
                      )
                    }
                    className={field}
                  >
                    {(Object.keys(QUEUE_LABELS) as CatalogQueueState[]).map(
                      (state) => (
                        <option key={state} value={state}>
                          {QUEUE_LABELS[state]} · {queueCounts[state]}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <button className={secondary}>Lọc danh sách đợt</button>
              </form>
              {view === "edit" && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    void run(async () => {
                      const result = await catalogRequest<{
                        batch: CatalogBatch;
                      }>("/batches", "POST", {
                        title: String(form.get("title") ?? ""),
                        requestKey: crypto.randomUUID(),
                      });
                      receive(result.batch);
                      setQueueVisible(false);
                      setHistory([]);
                      setSelected(null);
                      setEdit(null);
                      await reloadList();
                    });
                  }}
                  className="space-y-2"
                >
                  <label className="block text-sm">
                    Tên đợt mới
                    <input
                      name="title"
                      required
                      maxLength={160}
                      placeholder="Ví dụ: Giá rau miền Trung · đợt 1"
                      className={field}
                    />
                  </label>
                  <button className={primary}>Tạo bản nháp</button>
                </form>
              )}
              <button
                type="button"
                className="text-sm font-semibold underline"
                onClick={() => void run(() => reloadList())}
              >
                Làm mới danh sách
              </button>
              <div className="max-h-[28rem] space-y-2 overflow-y-auto">
                {batches.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void run(() => openBatch(item.id))}
                    aria-pressed={batch?.id === item.id}
                    className={`w-full rounded-lg border p-3 text-left ${batch?.id === item.id ? "border-[#123c36] bg-[#edf6f0]" : "border-neutral-300"}`}
                  >
                    <b className="block break-words">{item.title}</b>
                    <span className="mt-1 block text-sm">
                      {stateLabel[item.state]} · {item.entryCount} thực phẩm
                    </span>
                    <span className="block text-xs text-neutral-600">
                      {new Date(item.updatedAt).toLocaleString("vi-VN")}
                    </span>
                  </button>
                ))}
              </div>
              {queueCursor ? (
                <button
                  type="button"
                  className={secondary + " w-full"}
                  onClick={() =>
                    void run(() =>
                      reloadList(queueState, queueQuery, queueCursor),
                    )
                  }
                >
                  Tải thêm đợt dữ liệu
                </button>
              ) : null}
              {!batches.length && !loading ? (
                <p className="text-sm">
                  Không có đợt phù hợp. Đổi bộ lọc hoặc mở Biên tập để tạo đợt
                  mới.
                </p>
              ) : null}
            </aside>
            <main className="min-w-0 space-y-4">
              {!batch ? (
                <p className="rounded-xl border border-dashed p-6">
                  Chọn hoặc tạo một đợt dữ liệu. Mỗi đợt tối đa{" "}
                  {MAX_BATCH_ENTRIES} thực phẩm.
                </p>
              ) : (
                <>
                  {view === "edit" || batch.state !== "SUBMITTED" ? (
                    <section className="space-y-3 rounded-xl border border-[#b2c7bd] bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-xl font-semibold">
                          {stateLabel[batch.state]} · phiên bản {batch.revision}
                        </h2>
                        <span className="text-sm">
                          {batch.entriesJson.length}/{MAX_BATCH_ENTRIES} thực
                          phẩm
                        </span>
                      </div>
                      <label className="block text-sm">
                        Tên đợt
                        <input
                          value={title}
                          disabled={!editable || view !== "edit"}
                          onChange={(event) => setTitle(event.target.value)}
                          maxLength={160}
                          className={field}
                        />
                      </label>
                      {editable && view === "edit" ? (
                        <button
                          type="button"
                          className={secondary}
                          onClick={() =>
                            void run(() =>
                              save(batch.entriesJson.map((e) => e.proposal)),
                            )
                          }
                        >
                          Lưu tên đợt
                        </button>
                      ) : null}
                      {editable && view === "edit" ? (
                        <button
                          type="button"
                          className={secondary}
                          onClick={() => void run(() => act("archive"))}
                        >
                          Đóng bản nháp chưa dùng
                        </button>
                      ) : null}
                      {batch.reviewNote ? (
                        <p className="rounded bg-amber-50 p-3">
                          Ghi chú duyệt: {batch.reviewNote}
                        </p>
                      ) : null}
                      {batch.publishedAt ? (
                        <p>
                          Đã áp dụng lúc{" "}
                          {new Date(batch.publishedAt).toLocaleString("vi-VN")}.
                          Đợt này được giữ nguyên để đối chiếu.
                        </p>
                      ) : null}
                    </section>
                  ) : null}
                  {editable && view === "edit" ? (
                    <section className="space-y-3 rounded-xl border border-[#b2c7bd] bg-white p-4">
                      <h2 className="text-xl font-semibold">
                        Tìm thực phẩm để bổ sung
                      </h2>
                      <form
                        className="flex flex-wrap items-end gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void run(async () => {
                            const result = await catalogRequest<{
                              items: CatalogFood[];
                              nextCursor: string | null;
                            }>(
                              `/foods?q=${encodeURIComponent(q)}&missing=${missing}`,
                            );
                            setFoods(result.items);
                            setCursor(result.nextCursor);
                          });
                        }}
                      >
                        <label className="min-w-0 flex-1 text-sm">
                          Tên thực phẩm
                          <input
                            value={q}
                            onChange={(event) => setQ(event.target.value)}
                            className={field}
                          />
                        </label>
                        <label className="text-sm">
                          Ưu tiên
                          <select
                            className={field}
                            value={missing}
                            onChange={(event) => setMissing(event.target.value)}
                          >
                            <option value="">Tất cả</option>
                            <option value="classification">
                              Thiếu phân loại
                            </option>
                            <option value="price">Thiếu giá</option>
                            <option value="image">Thiếu ảnh</option>
                          </select>
                        </label>
                        <button className={primary}>Tìm</button>
                      </form>
                      <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
                        {foods.map((food) => (
                          <button
                            type="button"
                            key={food.id}
                            onClick={() => {
                              setSelected(food);
                              setEdit(null);
                            }}
                            className={`rounded border p-3 text-left ${selected?.id === food.id ? "border-[#123c36] bg-[#edf6f0]" : "border-neutral-300"}`}
                          >
                            <b>{food.name}</b>
                            <span className="mt-1 block text-sm text-neutral-700">
                              {food.source} · {food.sourceCode || food.id} ·{" "}
                              {food.foodGroup || "Chưa phân nhóm"}
                            </span>
                          </button>
                        ))}
                      </div>
                      {!foods.length ? <p>Chưa tìm thấy mục phù hợp.</p> : null}
                      {cursor ? (
                        <button
                          type="button"
                          className={secondary}
                          onClick={() =>
                            void run(async () => {
                              const result = await catalogRequest<{
                                items: CatalogFood[];
                                nextCursor: string | null;
                              }>(
                                `/foods?q=${encodeURIComponent(q)}&missing=${missing}&after=${cursor}`,
                              );
                              setFoods((previous) => [
                                ...previous,
                                ...result.items,
                              ]);
                              setCursor(result.nextCursor);
                            })
                          }
                        >
                          Xem thêm thực phẩm
                        </button>
                      ) : null}
                      {selected ? (
                        <ProposalForm
                          key={
                            selected.id + ":" + (edit ? batch.revision : "new")
                          }
                          food={selected}
                          existing={edit}
                          onSave={(proposal) =>
                            run(async () => {
                              const entries = batch.entriesJson
                                .map((e) => e.proposal)
                                .filter((e) => e.foodId !== proposal.foodId);
                              entries.push(proposal);
                              await save(entries);
                              setSelected(null);
                              setEdit(null);
                            })
                          }
                        />
                      ) : null}
                    </section>
                  ) : null}
                  <CatalogReview
                    key={`${batch.id}:${batch.revision}`}
                    batch={batch}
                    isAdmin={isAdmin && view === "review"}
                    busy={busy}
                    failure={error}
                    onDecision={async (action, note) => {
                      let success = false;
                      await run(async () => {
                        await act(action, note);
                        success = true;
                      });
                      return success;
                    }}
                    onEdit={
                      editable && view === "edit"
                        ? (entry) => {
                            if ((entry.proposal.prices?.length ?? 0) > 1) {
                              setError(
                                "Mục có nhiều giá; dùng phần JSON để giữ đủ các dòng khi sửa.",
                              );
                              return;
                            }
                            setSelected(entry.before);
                            setEdit(entry.proposal);
                          }
                        : undefined
                    }
                    onRemove={
                      editable && view === "edit"
                        ? (entry) => {
                            void run(() =>
                              save(
                                batch.entriesJson
                                  .filter(
                                    (e) =>
                                      e.proposal.foodId !==
                                      entry.proposal.foodId,
                                  )
                                  .map((e) => e.proposal),
                              ),
                            );
                          }
                        : undefined
                    }
                  />
                  {editable && view === "edit" ? (
                    <details className="rounded-xl border bg-white p-4">
                      <summary className="cursor-pointer font-semibold">
                        Nhập/sửa đề xuất theo JSON
                      </summary>
                      <p className="mt-2 text-sm">
                        Dùng khi nhận dữ liệu từ AI. Giữ đủ các mục muốn đề
                        xuất; phần này thay danh sách của bản nháp, không xóa
                        thực phẩm khỏi kho.
                      </p>
                      <textarea
                        aria-label="JSON đề xuất"
                        value={jsonText}
                        onChange={(event) => setJsonText(event.target.value)}
                        rows={12}
                        className={field + " font-mono text-sm"}
                      />
                      <button
                        type="button"
                        className={secondary + " mt-2"}
                        onClick={() =>
                          void run(() => save(JSON.parse(jsonText)))
                        }
                      >
                        Kiểm tra và lưu JSON vào nháp
                      </button>
                    </details>
                  ) : null}
                  {editable ? (
                    <section className="space-y-3 rounded-xl border-2 border-[#123c36] bg-[#f2f8f5] p-4">
                      <h2 className="text-xl font-semibold">
                        Chuẩn bị gửi duyệt
                      </h2>
                      {view === "edit" ? (
                        <>
                          <p>
                            Kiểm tra xong bản nháp rồi gửi đúng phiên bản này để
                            quản trị viên duyệt.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={!batch.entriesJson.length}
                              className={primary}
                              onClick={() => void run(() => act("submit"))}
                            >
                              Gửi đợt để duyệt
                            </button>
                            <button
                              type="button"
                              className={secondary}
                              onClick={() => void run(() => act("rebase"))}
                            >
                              Đọc lại kho gốc để đối chiếu
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          className={secondary}
                          onClick={() => switchView("edit")}
                        >
                          Mở Biên tập để tiếp tục bản nháp
                        </button>
                      )}
                    </section>
                  ) : batch.state === "SUBMITTED" && view !== "review" ? (
                    <section className="rounded-xl border bg-white p-4">
                      {isAdmin ? (
                        <button
                          type="button"
                          className={secondary}
                          onClick={() => switchView("review")}
                        >
                          Mở chế độ duyệt đợt này
                        </button>
                      ) : (
                        <p>
                          Đang chờ quản trị viên duyệt; kho chính chưa thay đổi.
                        </p>
                      )}
                    </section>
                  ) : batch.state === "PUBLISHED" ||
                    batch.state === "ARCHIVED" ? (
                    <p className="rounded-xl border bg-white p-4">
                      Đợt đã đóng; tạo bản nháp mới khi cần bổ sung tiếp.
                    </p>
                  ) : null}
                  <details className="rounded-xl border bg-white p-4">
                    <summary className="cursor-pointer font-semibold">
                      Lịch sử đợt dữ liệu
                    </summary>
                    <button
                      type="button"
                      className="my-2 underline"
                      onClick={() =>
                        void run(async () => {
                          const result = await catalogRequest<BatchReply>(
                            `/batches/${batch.id}`,
                          );
                          setHistory(result.history);
                        })
                      }
                    >
                      Tải lịch sử
                    </button>
                    <ol className="space-y-2">
                      {history.map((item) => (
                        <li key={item.id} className="border-t py-2 text-sm">
                          <b>
                            {item.actorName} · {item.action}
                          </b>
                          <p>
                            {new Date(item.createdAt).toLocaleString("vi-VN")}
                          </p>
                          <p className="break-words">{item.reason}</p>
                        </li>
                      ))}
                    </ol>
                  </details>
                </>
              )}
            </main>
          </div>
        </fieldset>
      )}
      {isAdmin && view === "keys" ? <CatalogKeys /> : null}
    </div>
  );
}
function ProposalForm({
  food,
  existing,
  onSave,
}: {
  food: CatalogFood;
  existing: CatalogProposal | null;
  onSave: (value: CatalogProposal) => Promise<void>;
}) {
  const [hasImage, setHasImage] = useState(!!existing?.image),
    [hasPrice, setHasPrice] = useState(!!existing?.prices?.length);
  const [oldPriceId, setOldPriceId] = useState(existing?.prices?.[0]?.id ?? "");
  const [price, setPrice] = useState<CatalogPrice>(
    existing?.prices?.[0] ?? {
      amountVnd: 0,
      basis: "per_kg",
      packG: null,
      region: null,
      source: "",
      sourceUrl: "",
      asOfDate: "",
      note: "",
    },
  );
  function selectPrice(value: string) {
    setOldPriceId(value);
    const source = food.prices.find((p) => p.id === value);
    if (source)
      setPrice({
        ...source,
        source: source.source ?? "",
        sourceUrl: source.sourceUrl ?? "",
        asOfDate: source.asOfDate?.slice(0, 10) ?? "",
        note: source.note ?? "",
      });
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget),
      get = (key: string) => String(values.get(key) ?? "").trim();
    const classification = Object.fromEntries(
      ["foodType", "foodGroup", "proteinOrigin"].flatMap((key) =>
        get(key) ? [[key, get(key)]] : [],
      ),
    );
    const proposal: CatalogProposal = {
      foodId: food.id,
      expectedUpdatedAt: food.updatedAt,
      reason: get("reason"),
      ...(Object.keys(classification).length ? { classification } : {}),
    };
    if (hasImage)
      proposal.image = {
        url: get("imageUrl"),
        sourceUrl: get("imageSourceUrl"),
        credit: get("imageCredit"),
        license: get("imageLicense") as (typeof IMAGE_LICENSES)[number],
        licenseNote: get("imageLicenseNote"),
      };
    if (hasPrice)
      proposal.prices = [
        {
          ...(oldPriceId ? { id: oldPriceId } : {}),
          amountVnd: Number(get("amountVnd")),
          basis: get("basis") as "per_kg",
          packG: get("packG") ? Number(get("packG")) : null,
          region: (get("region") || null) as "Trung" | null,
          source: get("priceSource"),
          sourceUrl: get("priceSourceUrl"),
          asOfDate: get("asOfDate"),
          note: get("priceNote"),
        },
      ];
    void onSave(proposal);
  }
  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border-2 border-[#123c36] bg-[#f6faf8] p-4"
    >
      <h3 className="text-xl font-semibold">Đề xuất cho {food.name}</h3>
      <p className="text-sm">
        {food.source} · {food.sourceCode || food.id}. Giữ nguyên dinh dưỡng và
        cơ sở nguồn.
      </p>
      <label className="block">
        Lý do và căn cứ đối chiếu
        <textarea
          name="reason"
          required
          maxLength={1500}
          defaultValue={existing?.reason ?? ""}
          rows={3}
          className={field}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["foodType", CATALOG_TYPES],
            ["foodGroup", FOOD_GROUP_ORDER],
            ["proteinOrigin", PROTEIN_ORIGIN_ORDER],
          ] as const
        ).map(([key, options]) => (
          <label key={key} className="min-w-0 text-sm">
            {classificationLabel[key]}
            <select
              name={key}
              defaultValue={existing?.classification?.[key] ?? ""}
              className={field}
            >
              <option value="">Giữ nguyên: {food[key] || "chưa có"}</option>
              {options.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={hasPrice}
          onChange={(event) => setHasPrice(event.target.checked)}
        />
        Bổ sung hoặc sửa giá tham khảo
      </label>
      {hasPrice ? (
        <div className="grid gap-3 rounded border p-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            Dòng giá
            <select
              className={field}
              value={oldPriceId}
              onChange={(event) => selectPrice(event.target.value)}
            >
              <option value="">Thêm một ghi nhận giá mới</option>
              {food.prices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.amountVnd.toLocaleString("vi-VN")} đ · {p.source} ·{" "}
                  {p.asOfDate?.slice(0, 10)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Giá VND
            <input
              name="amountVnd"
              type="number"
              min={0.01}
              max={1e9}
              step="any"
              required
              value={price.amountVnd || ""}
              onChange={(event) =>
                setPrice({ ...price, amountVnd: Number(event.target.value) })
              }
              className={field}
            />
          </label>
          <label>
            Đơn vị mua
            <select
              name="basis"
              value={price.basis}
              onChange={(event) =>
                setPrice({
                  ...price,
                  basis: event.target.value as typeof price.basis,
                })
              }
              className={field}
            >
              <option value="per_kg">Theo kg</option>
              <option value="per_100g">Theo 100 g</option>
              <option value="per_piece">Theo cái/quả</option>
              <option value="per_pack">Theo gói/hộp</option>
            </select>
          </label>
          <label>
            Khối lượng mỗi cái/gói (g)
            <input
              name="packG"
              type="number"
              min={0.000001}
              step="any"
              value={price.packG ?? ""}
              onChange={(event) =>
                setPrice({
                  ...price,
                  packG: event.target.value ? Number(event.target.value) : null,
                })
              }
              required={
                price.basis === "per_piece" || price.basis === "per_pack"
              }
              className={field}
            />
          </label>
          <label>
            Vùng ghi nhận
            <select
              name="region"
              value={price.region ?? ""}
              onChange={(event) =>
                setPrice({
                  ...price,
                  region: (event.target.value || null) as typeof price.region,
                })
              }
              className={field}
            >
              <option value="">Chưa rõ / toàn quốc</option>
              {["Bắc", "Trung", "Nam"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Nguồn giá
            <input
              name="priceSource"
              required
              value={price.source}
              onChange={(event) =>
                setPrice({ ...price, source: event.target.value })
              }
              className={field}
            />
          </label>
          <label>
            Link nguồn giá
            <input
              name="priceSourceUrl"
              type="url"
              required
              value={price.sourceUrl}
              onChange={(event) =>
                setPrice({ ...price, sourceUrl: event.target.value })
              }
              className={field}
            />
          </label>
          <label>
            Ngày ghi nhận
            <input
              name="asOfDate"
              type="date"
              required
              value={price.asOfDate}
              onChange={(event) =>
                setPrice({ ...price, asOfDate: event.target.value })
              }
              className={field}
            />
          </label>
          <label>
            Điều kiện giá / khuyến mãi
            <input
              name="priceNote"
              value={price.note}
              onChange={(event) =>
                setPrice({ ...price, note: event.target.value })
              }
              className={field}
            />
          </label>
        </div>
      ) : null}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={hasImage}
          onChange={(event) => setHasImage(event.target.checked)}
        />
        Bổ sung hoặc thay ảnh có nguồn
      </label>
      {hasImage ? (
        <div className="grid gap-3 rounded border p-3 sm:grid-cols-2">
          {[
            ["imageUrl", "URL ảnh", existing?.image?.url],
            ["imageSourceUrl", "Trang nguồn ảnh", existing?.image?.sourceUrl],
            ["imageCredit", "Tác giả / ghi công", existing?.image?.credit],
          ].map(([name, label, value]) => (
            <label key={name}>
              {label}
              <input
                name={name}
                type={name === "imageCredit" ? "text" : "url"}
                required
                defaultValue={value ?? ""}
                className={field}
              />
            </label>
          ))}
          <label>
            Quyền sử dụng
            <select
              name="imageLicense"
              required
              defaultValue={existing?.image?.license ?? ""}
              className={field}
            >
              <option value="">Chọn căn cứ</option>
              {IMAGE_LICENSES.map((license) => (
                <option key={license}>{license}</option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            Căn cứ cụ thể cho phép sử dụng ảnh
            <textarea
              name="imageLicenseNote"
              required
              defaultValue={existing?.image?.licenseNote ?? ""}
              className={field}
            />
          </label>
          <p className="text-sm sm:col-span-2">
            CC0: phạm vi công cộng; CC_BY/CC_BY_SA: ghi công theo giấy phép;
            OWNED: ảnh tự sở hữu; PERMISSION: có sự cho phép. Ghi nguồn ảnh kèm
            căn cứ cụ thể để người duyệt kiểm tra.
          </p>
        </div>
      ) : null}
      <button className={primary}>Lưu đề xuất vào bản nháp</button>
    </form>
  );
}
function CatalogKeys() {
  const [keys, setKeys] = useState<CatalogKey[]>([]),
    [token, setToken] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    catalogRequest<{ items: CatalogKey[] }>("/keys")
      .then((result) => {
        if (active) setKeys(result.items);
      })
      .catch((cause) => {
        if (active) setError(cause.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function work(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Chưa quản lý được khóa.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function reload() {
    const result = await catalogRequest<{ items: CatalogKey[] }>("/keys");
    setKeys(result.items);
  }
  return (
    <section className="space-y-3 rounded-xl border-2 border-[#a48236] bg-[#fffaf0] p-4">
      <h2 className="text-xl font-semibold">Khóa biên tập cho AI</h2>
      <p>
        Khóa chỉ tra kho, tạo/sửa bản nháp của khóa và gửi duyệt. Quyền duyệt,
        xóa và sửa dinh dưỡng bị chặn. Thu hồi bất cứ lúc nào; bản nháp đã tạo
        vẫn còn để người biên tập tiếp tục.
      </p>
      {error ? (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      ) : null}
      <fieldset disabled={busy} className="contents">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            void work(async () => {
              const result = await catalogRequest<{
                key: CatalogKey;
                token: string;
              }>("/keys", "POST", {
                label: String(values.get("label")),
                validDays: Number(values.get("days")),
              });
              setToken(result.token);
              await reload();
            });
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="min-w-0 flex-1">
            Tên khóa
            <input
              name="label"
              required
              maxLength={100}
              placeholder="Ví dụ: AI bổ sung giá và ảnh"
              className={field}
            />
          </label>
          <label>
            Thời hạn (ngày)
            <input
              name="days"
              type="number"
              min={1}
              max={30}
              defaultValue={7}
              required
              className={field}
            />
          </label>
          <button className={primary}>Tạo khóa giới hạn</button>
        </form>
        {token ? (
          <div className="space-y-2 rounded border border-amber-600 bg-white p-3">
            <label className="block">
              Khóa chỉ xuất hiện lần này
              <input
                type="password"
                autoComplete="off"
                readOnly
                value={token}
                className={field}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={secondary}
                onClick={() =>
                  void work(() => navigator.clipboard.writeText(token))
                }
              >
                Sao chép khóa
              </button>
              <button
                type="button"
                className={secondary}
                onClick={() => setToken("")}
              >
                Đã giữ khóa, đóng
              </button>
            </div>
            <p className="text-sm">
              Không đưa khóa vào link, ảnh chụp hoặc bản nháp. Nếu mất khóa, thu
              hồi và tạo khóa mới.
            </p>
          </div>
        ) : null}
        <ul className="space-y-2">
          {keys.map((key) => (
            <li
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border bg-white p-3"
            >
              <span className="min-w-0 break-words">
                <b>{key.label}</b>
                <span className="block text-sm">
                  {key.revokedAt
                    ? "Đã thu hồi"
                    : `Hết hạn: ${new Date(key.expiresAt).toLocaleString("vi-VN")}`}
                </span>
              </span>
              {!key.revokedAt ? (
                <button
                  type="button"
                  className={secondary}
                  onClick={() =>
                    void work(async () => {
                      await catalogRequest(
                        `/keys/${key.id}/revoke`,
                        "POST",
                        {},
                      );
                      setToken("");
                      await reload();
                    })
                  }
                >
                  Thu hồi
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </fieldset>
      <details className="rounded border bg-white p-3">
        <summary className="cursor-pointer font-semibold">
          Cách cho AI thao tác
        </summary>
        <p className="mt-2 break-words">
          Dùng khóa trong header Authorization: Bearer &lt;khóa&gt;. Đọc GET
          /api/catalog-editor/workflow để lấy quy tắc, danh mục trường và các
          bước soạn/gửi duyệt. Khóa này dành riêng cho API biên tập, không dùng
          thay khóa tính khẩu phần.
        </p>
      </details>
    </section>
  );
}
