"use client";
import { useEffect, useId, useRef, useState } from "react";
import type {
  CatalogBatch,
  CatalogEntry,
  CatalogPrice,
} from "@/lib/catalog-editor/contracts";
import {
  CLASSIFY_LABELS,
  PRICE_LABELS,
  entryKinds,
  filterReview,
  priceChangeLabel,
  returnReviewNote,
  reviewProgress,
  type EntryReview,
  type ReviewKind,
} from "@/lib/catalog-editor/review";
const buttonBase =
  "min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const button = buttonBase + " border-[#819e93] bg-white text-[#123c36]";
const activeButton =
  buttonBase + " border-[#123c36] bg-[#edf6f0] text-[#123c36]";
const returnButton = buttonBase + " border-amber-500 bg-white text-amber-900";
const primaryButton = buttonBase + " border-[#123c36] bg-[#123c36] text-white";
const input =
  "w-full min-w-0 rounded-lg border border-[#819e93] bg-white px-3 py-2 text-base text-neutral-950";
const kinds: Record<ReviewKind, string> = {
  all: "Tất cả thay đổi",
  classification: "Phân loại",
  price: "Giá",
  image: "Ảnh",
};
const stateText = { checked: "Đã xem", needs_fix: "Cần sửa" };
export default function CatalogReview({
  batch,
  isAdmin,
  busy,
  onDecision,
  onEdit,
  onRemove,
  failure,
}: {
  batch: CatalogBatch;
  isAdmin: boolean;
  busy: boolean;
  onDecision: (action: "publish" | "return", note: string) => Promise<boolean>;
  onEdit?: (entry: CatalogEntry) => void;
  onRemove?: (entry: CatalogEntry) => void;
  failure?: string;
}) {
  const [kind, setKind] = useState<ReviewKind>("all"),
    [query, setQuery] = useState(""),
    [onlyUnchecked, setOnlyUnchecked] = useState(false),
    [filtersVisible, setFiltersVisible] = useState(false);
  const [selectedId, setSelectedId] = useState(
    batch.entriesJson[0]?.proposal.foodId ?? "",
  );
  const [reviews, setReviews] = useState<Record<string, EntryReview>>({}),
    [decision, setDecision] = useState<"publish" | "return" | null>(null);
  const filtered = filterReview(
      batch.entriesJson,
      kind,
      query,
      onlyUnchecked,
      reviews,
    ),
    active =
      filtered.find((e) => e.proposal.foodId === selectedId) ?? filtered[0];
  const index = active ? filtered.indexOf(active) : -1,
    progress = reviewProgress(batch.entriesJson, reviews),
    reviewing = isAdmin && batch.state === "SUBMITTED";
  const activeId = active?.proposal.foodId;
  const articleRef = useRef<HTMLElement>(null);
  const previousActiveId = useRef(activeId);
  useEffect(() => {
    if (activeId && previousActiveId.current !== activeId)
      articleRef.current?.scrollIntoView({ block: "start" });
    previousActiveId.current = activeId;
  }, [activeId]);
  const totals = {
    classification: batch.entriesJson.filter((e) => !!e.proposal.classification)
      .length,
    price: batch.entriesJson.filter((e) => !!e.proposal.prices?.length).length,
    image: batch.entriesJson.filter((e) => !!e.proposal.image).length,
  };
  function mark(status: "checked" | "needs_fix") {
    if (!active) return;
    const next = {
      ...reviews,
      [active.proposal.foodId]: {
        status,
        note: reviews[active.proposal.foodId]?.note ?? "",
      },
    };
    setReviews(next);
    if (status === "checked") {
      const remaining = filterReview(
        batch.entriesJson,
        kind,
        query,
        onlyUnchecked,
        next,
      ).filter((e) => next[e.proposal.foodId]?.status !== "checked");
      const following =
        remaining.find(
          (e) =>
            batch.entriesJson.indexOf(e) > batch.entriesJson.indexOf(active),
        ) ?? remaining[0];
      if (following) setSelectedId(following.proposal.foodId);
    }
  }
  function resetFilters() {
    setKind("all");
    setQuery("");
    setOnlyUnchecked(false);
  }
  return (
    <section aria-label="Đối chiếu và duyệt đợt" className="min-w-0 space-y-4">
      <div className="rounded-xl border border-[#b2c7bd] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Đối chiếu trước và sau</h2>
            <p className="mt-1 text-sm text-neutral-700">
              {batch.title} · phiên bản {batch.revision} · {progress.total} thực
              phẩm
            </p>
          </div>
          <span className="rounded-full bg-[#edf6f0] px-3 py-1 text-sm font-semibold text-[#123c36]">
            {batch.keyId
              ? "Đợt do AI khởi tạo"
              : "Đợt do người biên tập khởi tạo"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          {(["classification", "price", "image"] as const).map((k) => (
            <div key={k} className="rounded-lg bg-[#f4f7f5] p-2">
              <b>{totals[k]}</b> {kinds[k]}
            </div>
          ))}
        </div>
        {reviewing ? (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer">Hướng dẫn rà soát</summary>
            <p className="mt-2">
              Rà từng thực phẩm rồi đánh dấu đã xem. Mục cần sửa được gom vào lý
              do trả lại. Thao tác áp dụng cuối cùng bao gồm cả {progress.total}{" "}
              mục của đợt. Dấu đã xem chỉ lưu trong lần mở phiên bản này.
            </p>
          </details>
        ) : (
          <p className="mt-3 text-sm">
            Các đề xuất được giữ theo phiên bản. Chỉ đợt đã gửi duyệt mới có thể
            được quản trị viên áp dụng.
          </p>
        )}
      </div>
      <div className="rounded-xl border border-[#b2c7bd] bg-white p-3">
        <button
          type="button"
          className={button + " sm:hidden"}
          aria-expanded={filtersVisible}
          onClick={() => setFiltersVisible(!filtersVisible)}
        >
          Bộ lọc thay đổi · {kinds[kind]}
        </button>
        <div className={filtersVisible ? "mt-3 sm:mt-0" : "hidden sm:block"}>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Lọc loại thay đổi"
          >
            {(Object.keys(kinds) as ReviewKind[]).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={kind === k ? activeButton : button}
              >
                {kinds[k]} · {k === "all" ? progress.total : totals[k]}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Tìm thực phẩm trong đợt</span>
              <input
                aria-label="Tìm thực phẩm trong đợt"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm tên, mã hoặc căn cứ…"
                className={input}
              />
            </label>
            {reviewing ? (
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onlyUnchecked}
                  onChange={(e) => setOnlyUnchecked(e.target.checked)}
                  className="h-4 w-4"
                />
                Chỉ mục chưa xem
              </label>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          Đang hiển thị {filtered.length}/{progress.total} mục. Bộ lọc chỉ thay
          đổi phần xem.
        </p>
      </div>
      {!active ? (
        <div className="rounded-xl border border-dashed bg-white p-5">
          <p>
            {progress.total
              ? "Không còn mục phù hợp với bộ lọc."
              : "Bản nháp chưa có đề xuất."}
          </p>
          {progress.total ? (
            <button
              type="button"
              className={button + " mt-3"}
              onClick={resetFilters}
            >
              Hiện toàn bộ đợt
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <nav
            aria-label="Thực phẩm trong đợt"
            className="hidden max-h-[36rem] space-y-2 overflow-y-auto rounded-xl border bg-white p-2 lg:block"
          >
            {filtered.map((entry, i) => (
              <button
                type="button"
                key={entry.proposal.foodId}
                aria-current={
                  active.proposal.foodId === entry.proposal.foodId
                    ? "true"
                    : undefined
                }
                onClick={() => setSelectedId(entry.proposal.foodId)}
                className={`w-full rounded-lg border p-3 text-left ${active.proposal.foodId === entry.proposal.foodId ? "border-[#123c36] bg-[#edf6f0]" : "border-transparent"}`}
              >
                <b className="block break-words text-sm">
                  {i + 1}. {entry.before.name}
                </b>
                <span className="mt-1 block text-xs">
                  {entryKinds(entry)
                    .map((k) => kinds[k])
                    .join(" · ")}
                </span>
                {reviewing ? (
                  <span
                    className={`mt-1 block text-xs font-semibold ${reviews[entry.proposal.foodId]?.status === "needs_fix" ? "text-amber-900" : "text-[#123c36]"}`}
                  >
                    {reviews[entry.proposal.foodId]
                      ? stateText[reviews[entry.proposal.foodId].status]
                      : "Chưa xem"}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
          <article
            ref={articleRef}
            aria-label={`Đối chiếu ${active.before.name}`}
            className="min-w-0 space-y-4 rounded-xl border border-[#b2c7bd] bg-white p-3 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-neutral-600">
                Mục {index + 1}/{filtered.length}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={button}
                  disabled={index <= 0}
                  onClick={() =>
                    setSelectedId(filtered[index - 1].proposal.foodId)
                  }
                >
                  ← Trước
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={index >= filtered.length - 1}
                  onClick={() =>
                    setSelectedId(filtered[index + 1].proposal.foodId)
                  }
                >
                  Tiếp →
                </button>
              </div>
            </div>
            <label className="block text-sm lg:hidden">
              Thực phẩm đang xem
              <select
                aria-label="Thực phẩm đang xem"
                value={active.proposal.foodId}
                onChange={(e) => setSelectedId(e.target.value)}
                className={input + " mt-1"}
              >
                {filtered.map((e) => (
                  <option key={e.proposal.foodId} value={e.proposal.foodId}>
                    {e.before.name}
                    {reviewing
                      ? ` · ${reviews[e.proposal.foodId] ? stateText[reviews[e.proposal.foodId].status] : "Chưa xem"}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <h3 className="break-words text-xl font-semibold">
                {active.before.name}
              </h3>
              <p className="mt-1 break-words text-sm text-neutral-600">
                {active.before.source} ·{" "}
                {active.before.sourceCode || active.before.id}
              </p>
            </div>
            <div className="rounded-lg bg-[#f4f7f5] p-3">
              <h4 className="text-sm font-semibold">Lý do và căn cứ đề xuất</h4>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                {active.proposal.reason}
              </p>
            </div>
            <EntryComparison entry={active} />
            {reviewing ? (
              <div className="space-y-3 border-t pt-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    className={activeButton}
                    onClick={() => mark("checked")}
                  >
                    {reviews[active.proposal.foodId]?.status === "checked"
                      ? "Đã xem · xem mục tiếp"
                      : "Đã kiểm tra · xem mục tiếp"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className={returnButton}
                    onClick={() => mark("needs_fix")}
                  >
                    Đánh dấu cần sửa
                  </button>
                </div>
                {reviews[active.proposal.foodId]?.status === "needs_fix" ? (
                  <label className="block text-sm font-semibold text-amber-900">
                    Cần sửa gì ở {active.before.name}?
                    <textarea
                      aria-label={`Lý do cần sửa ${active.before.name}`}
                      value={reviews[active.proposal.foodId].note}
                      maxLength={1000}
                      onChange={(e) =>
                        setReviews((prev) => ({
                          ...prev,
                          [active.proposal.foodId]: {
                            status: "needs_fix",
                            note: e.target.value,
                          },
                        }))
                      }
                      rows={3}
                      className={input + " mt-1"}
                    />
                  </label>
                ) : null}
              </div>
            ) : null}
            {onEdit || onRemove ? (
              <div className="flex flex-wrap gap-2 border-t pt-3">
                {onEdit ? (
                  <button
                    type="button"
                    className={button}
                    onClick={() => onEdit(active)}
                  >
                    Sửa đề xuất
                  </button>
                ) : null}
                {onRemove ? (
                  <button
                    type="button"
                    className={button}
                    onClick={() => onRemove(active)}
                  >
                    Bỏ đề xuất khỏi nháp
                  </button>
                ) : null}
              </div>
            ) : null}
          </article>
        </div>
      )}
      {reviewing ? (
        <div className="sticky bottom-2 z-20 space-y-2 rounded-xl border-2 border-[#123c36] bg-white p-3 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div aria-live="polite">
              <p className="font-semibold">
                Đã xem {progress.checked}/{progress.total} · Cần sửa{" "}
                {progress.needsFix}
              </p>
              <p className="text-xs text-neutral-600">
                Áp dụng cả {progress.total} mục, gồm mục bị bộ lọc ẩn.
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              <button
                type="button"
                disabled={busy}
                className={returnButton}
                onClick={() => setDecision("return")}
              >
                Trả lại đợt
              </button>
              <button
                type="button"
                disabled={busy || !progress.ready}
                className={primaryButton}
                aria-label="Kiểm tra và duyệt cả đợt"
                onClick={() => setDecision("publish")}
              >
                Duyệt cả đợt
              </button>
            </div>
          </div>
          {progress.needsFix ? (
            <p className="text-sm text-amber-900">
              Có mục cần sửa: trả lại đợt với lý do để người biên tập xử lý.
            </p>
          ) : null}
        </div>
      ) : null}
      {decision ? (
        <DecisionDialog
          batch={batch}
          action={decision}
          initialNote={
            decision === "return"
              ? returnReviewNote(batch.entriesJson, reviews)
              : ""
          }
          busy={busy}
          ready={progress.ready}
          failure={failure}
          onClose={() => setDecision(null)}
          onConfirm={(note) => onDecision(decision, note)}
        />
      ) : null}
    </section>
  );
}
function sourceUrl(value: string | null | undefined) {
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
function PriceEvidence({
  price,
  label,
}: {
  price: CatalogPrice | undefined;
  label: string;
}) {
  const url = sourceUrl(price?.sourceUrl);
  return (
    <div className="min-w-0 rounded-lg border border-neutral-300 p-3">
      <h5 className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
        {label}
      </h5>
      {price ? (
        <>
          <p className="mt-2 text-xl font-semibold">
            {price.amountVnd.toLocaleString("vi-VN")} đ{" "}
            <span className="text-sm font-normal">
              {PRICE_LABELS[price.basis] || price.basis}
            </span>
          </p>
          <dl className="mt-2 grid gap-1 text-sm">
            <div>
              <dt className="inline text-neutral-600">Vùng: </dt>
              <dd className="inline">
                {price.region || "Chưa rõ / toàn quốc"}
              </dd>
            </div>
            <div>
              <dt className="inline text-neutral-600">Ngày ghi nhận: </dt>
              <dd className="inline">
                {price.asOfDate?.slice(0, 10) || "Chưa có"}
              </dd>
            </div>
            {price.packG ? (
              <div>
                <dt className="inline text-neutral-600">Khối lượng mua: </dt>
                <dd className="inline">{price.packG} g/đơn vị</dd>
              </div>
            ) : null}
          </dl>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-11 items-center break-words font-semibold text-[#123c36] underline"
            >
              Mở nguồn giá · {price.source || "Trang nguồn"} ↗
            </a>
          ) : (
            <p className="mt-2 text-sm">{price.source || "Chưa có nguồn"}</p>
          )}
          {price.note ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">
              {price.note}
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-sm">Chưa có ghi nhận giá này.</p>
      )}
    </div>
  );
}
function ImageEvidence({
  url,
  source,
  credit,
  license,
  label,
}: {
  url: string | null;
  source: string | null;
  credit: string | null;
  license: string | null;
  label: string;
}) {
  const image = sourceUrl(url),
    link = sourceUrl(source);
  return (
    <div className="min-w-0 rounded-lg border p-3">
      <h5 className="text-sm font-semibold">{label}</h5>
      {image ? (
        <a
          href={image}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Mở lớn ${label.toLowerCase()}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            referrerPolicy="no-referrer"
            loading="lazy"
            alt={label}
            className="mt-2 h-44 w-full rounded bg-neutral-100 object-contain"
          />
        </a>
      ) : (
        <p className="mt-2 text-sm">Chưa có ảnh xem được.</p>
      )}
      <p className="mt-2 break-words text-sm">
        {credit || "Chưa có thông tin ghi công"}
        {license ? ` · ${license}` : ""}
      </p>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex min-h-11 items-center font-semibold text-[#123c36] underline"
        >
          Mở trang nguồn ảnh ↗
        </a>
      ) : null}
    </div>
  );
}
function EntryComparison({ entry }: { entry: CatalogEntry }) {
  return (
    <div className="min-w-0 space-y-4">
      {entry.proposal.classification ? (
        <section>
          <h4 className="mb-2 font-semibold">Phân loại</h4>
          <div className="space-y-2">
            {Object.entries(entry.proposal.classification).map(
              ([key, value]) => {
                const old = entry.before[key as keyof typeof CLASSIFY_LABELS];
                return (
                  <div key={key} className="rounded-lg border p-3">
                    <h5 className="text-sm font-semibold">
                      {CLASSIFY_LABELS[key as keyof typeof CLASSIFY_LABELS]}
                    </h5>
                    <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">
                      <div>
                        <span className="block text-xs text-neutral-600">
                          Hiện tại
                        </span>
                        <p className="break-words">{old || "Chưa có"}</p>
                      </div>
                      <div
                        className={
                          old === value
                            ? "rounded bg-neutral-50 p-2"
                            : "rounded bg-emerald-50 p-2"
                        }
                      >
                        <span className="block text-xs text-neutral-600">
                          {old === value
                            ? "Đề xuất · giữ nguyên"
                            : "Đề xuất mới"}
                        </span>
                        <p className="break-words font-semibold">{value}</p>
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </section>
      ) : null}
      {entry.proposal.prices?.map((price, i) => {
        const old = entry.before.prices.find((p) => p.id === price.id);
        return (
          <section key={i}>
            <h4 className="font-semibold">Giá tham khảo {i + 1}</h4>
            <p className="mb-2 text-sm text-neutral-700">
              {priceChangeLabel(old, price)}
            </p>
            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              <PriceEvidence label="Hiện tại" price={old} />
              <PriceEvidence label="Đề xuất" price={price} />
            </div>
          </section>
        );
      })}
      {entry.proposal.image ? (
        <section>
          <h4 className="mb-2 font-semibold">Ảnh và quyền sử dụng</h4>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2">
            <ImageEvidence
              label="Ảnh hiện tại"
              url={entry.before.imageUrl}
              source={entry.before.imageSourceUrl}
              credit={entry.before.imageCredit}
              license={entry.before.imageLicense}
            />
            <ImageEvidence
              label="Ảnh đề xuất"
              url={entry.proposal.image.url}
              source={entry.proposal.image.sourceUrl}
              credit={entry.proposal.image.credit}
              license={entry.proposal.image.license}
            />
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-amber-50 p-3 text-sm">
            <b>Căn cứ sử dụng ảnh: </b>
            {entry.proposal.image.licenseNote}
          </p>
        </section>
      ) : null}
    </div>
  );
}
function DecisionDialog({
  batch,
  action,
  initialNote,
  busy,
  ready,
  onClose,
  onConfirm,
  failure,
}: {
  batch: CatalogBatch;
  action: "publish" | "return";
  initialNote: string;
  busy: boolean;
  ready: boolean;
  onClose: () => void;
  onConfirm: (note: string) => Promise<boolean>;
  failure?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    titleId = useId(),
    [note, setNote] = useState(initialNote),
    [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-xl border-2 border-[#123c36] p-0 text-neutral-950 shadow-xl backdrop:bg-black/40"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 id={titleId} className="text-xl font-semibold">
            {action === "publish"
              ? "Duyệt áp dụng cả đợt"
              : "Trả lại để chỉnh sửa"}
          </h3>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Đóng xác nhận duyệt"
            className={button}
          >
            Đóng
          </button>
        </div>
        <p className="mt-3 break-words font-semibold">{batch.title}</p>
        <p className="text-sm">
          Phiên bản {batch.revision} · toàn bộ {batch.entriesJson.length} thực
          phẩm
        </p>
        {failure ? (
          <p
            role="alert"
            className="mt-3 rounded border border-red-400 bg-red-50 p-3 text-sm text-red-900"
          >
            {failure}
          </p>
        ) : null}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (
              !busy &&
              note.trim() &&
              note.length <= 1500 &&
              (action === "return" || (ready && confirmed))
            )
              void onConfirm(note).then((success) => {
                if (success) onClose();
              });
          }}
          className="mt-4 space-y-4"
        >
          <label className="block text-sm font-semibold">
            {action === "publish" ? "Ghi chú duyệt" : "Lý do trả lại"}
            <textarea
              autoFocus
              aria-label={
                action === "publish" ? "Ghi chú duyệt" : "Lý do trả lại"
              }
              disabled={busy}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setConfirmed(false);
              }}
              required
              maxLength={1500}
              rows={5}
              className={input + " mt-1"}
            />
          </label>
          <p
            className={
              note.length > 1500
                ? "text-sm text-red-900"
                : "text-xs text-neutral-600"
            }
          >
            {note.length}/1500 ký tự.
            {note.length > 1500
              ? " Lý do được giữ đầy đủ; vui lòng rút gọn còn tối đa 1500 ký tự trước khi gửi."
              : ""}
          </p>
          {action === "publish" ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                disabled={busy}
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                Tôi đồng ý áp dụng cả {batch.entriesJson.length} mục của phiên
                bản {batch.revision}, bao gồm mục không hiển thị bởi bộ lọc.
              </span>
            </label>
          ) : (
            <p className="text-sm text-neutral-700">
              Kho chính giữ nguyên. Người biên tập nhận lý do này để sửa và gửi
              duyệt lại.
            </p>
          )}
          <button
            type="submit"
            disabled={
              busy ||
              !note.trim() ||
              note.length > 1500 ||
              (action === "publish" && (!ready || !confirmed))
            }
            className={primaryButton + " w-full"}
          >
            {busy
              ? "Đang xử lý…"
              : action === "publish"
                ? "Duyệt và áp dụng vào kho chính"
                : "Xác nhận trả lại đợt"}
          </button>
        </form>
      </div>
    </dialog>
  );
}
