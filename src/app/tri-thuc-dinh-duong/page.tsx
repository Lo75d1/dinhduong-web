import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import {
  getKnowledgeItems,
  KNOWLEDGE_SOURCES,
  type KnowledgeItem,
  type KnowledgeKind,
} from "@/lib/knowledge-hub";
import AiSummaryButton from "./AiSummaryButton";

export const metadata: Metadata = {
  title: "Trung tâm Tri thức Dinh dưỡng | Dinh dưỡng 2598",
  description:
    "Tìm nghiên cứu khoa học, văn bản pháp luật và hướng dẫn dinh dưỡng từ các nguồn có thể truy lại.",
  alternates: { canonical: "/tri-thuc-dinh-duong" },
  openGraph: {
    title: "Trung tâm Tri thức Dinh dưỡng",
    description:
      "Nghiên cứu, văn bản và hướng dẫn dinh dưỡng — tóm tắt có nguồn gốc để kiểm tra lại.",
    url: "/tri-thuc-dinh-duong",
    images: [
      {
        url: "/tri-thuc-dinh-duong-og.png",
        width: 1200,
        height: 630,
        alt: "Trung tâm Tri thức Dinh dưỡng 2598",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trung tâm Tri thức Dinh dưỡng",
    description: "Nghiên cứu, văn bản và hướng dẫn có nguồn gốc.",
    images: ["/tri-thuc-dinh-duong-og.png"],
  },
};

const TYPE_OPTIONS: Array<{ value: KnowledgeKind | "all"; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "legal", label: "Văn bản pháp luật" },
  { value: "guideline", label: "Hướng dẫn" },
  { value: "research", label: "Nghiên cứu" },
  { value: "official-news", label: "Tin chính thống" },
];

const QUICK_SEARCHES = [
  "suy dinh dưỡng",
  "dinh dưỡng trẻ em",
  "người cao tuổi",
  "đái tháo đường",
  "nuôi ăn qua ống",
];

const KIND_LABEL: Record<KnowledgeKind, string> = {
  legal: "Văn bản pháp luật",
  guideline: "Hướng dẫn",
  research: "Nghiên cứu khoa học",
  "official-news": "Tin chính thống",
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function displayDate(value?: string) {
  if (!value) return "Không ghi ngày";
  const [year, month, day] = value.slice(0, 10).split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

export default async function KnowledgeHubPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; type?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = firstParam(params.q).trim().slice(0, 120);
  const rawType = firstParam(params.type);
  const kind = TYPE_OPTIONS.some((option) => option.value === rawType)
    ? (rawType as KnowledgeKind | "all")
    : "all";
  const items = await getKnowledgeItems({ query, kind });
  const researchCount = items.filter((item) => item.kind === "research").length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="overflow-hidden rounded-2xl border-2 border-[#123c36] bg-gradient-to-br from-[#123c36] via-[#185247] to-[#2f7b68] px-6 py-8 text-white shadow-[0_14px_34px_rgba(18,60,54,.18)] sm:px-9">
        <p className="text-xs font-semibold tracking-[.16em] text-[#d7eee6]">
          TRUNG TÂM TRI THỨC DINH DƯỠNG
        </p>
        <h1 className="mt-2 max-w-4xl text-3xl font-semibold leading-tight sm:text-4xl">
          Tìm thông tin mới, đọc tóm tắt, luôn quay lại được nguồn gốc.
        </h1>
        <p className="mt-3 max-w-3xl text-[#f0faf6]">
          Một cửa tìm nghiên cứu khoa học, văn bản, hướng dẫn và tài liệu dinh dưỡng.
          Hệ thống ưu tiên nguồn chính thức, không hứa “tìm hết Internet” và không thay
          thế thẩm định chuyên môn.
        </p>

        <Form
          action="/tri-thuc-dinh-duong"
          className="mt-6 grid gap-3 rounded-xl bg-white p-3 text-neutral-950 sm:grid-cols-[1fr_13rem_auto]"
        >
          <label className="sr-only" htmlFor="knowledge-query">
            Nội dung cần tìm
          </label>
          <input
            id="knowledge-query"
            name="q"
            defaultValue={query}
            maxLength={120}
            placeholder="Ví dụ: suy dinh dưỡng người cao tuổi"
            className="min-h-12 rounded-md border border-[#9bb6ab] px-4"
          />
          <label className="sr-only" htmlFor="knowledge-type">
            Loại tài liệu
          </label>
          <select
            id="knowledge-type"
            name="type"
            defaultValue={kind}
            className="min-h-12 rounded-md border border-[#9bb6ab] px-3"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="min-h-12 rounded-md bg-[#123c36] px-5 font-semibold text-white hover:bg-[#0b302b]"
          >
            Tìm thông tin
          </button>
        </Form>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_SEARCHES.map((term) => (
            <Link
              key={term}
              href={`/tri-thuc-dinh-duong?q=${encodeURIComponent(term)}&type=all`}
              className="rounded-full border border-white/50 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
            >
              {term}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric value={String(items.length)} label="kết quả đang hiển thị" />
        <Metric value={String(researchCount)} label="nghiên cứu lấy trực tiếp từ API" />
        <Metric value={String(KNOWLEDGE_SOURCES.length)} label="nhóm nguồn ưu tiên" />
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[#123c36] pb-3">
            <div>
              <p className="text-xs font-semibold tracking-[.14em] text-[#123c36]">MỚI CẬP NHẬT</p>
              <h2 className="mt-1 text-2xl font-semibold">
                {query ? `Kết quả cho “${query}”` : "Thông tin mới và tài liệu nền"}
              </h2>
            </div>
            <p className="text-sm text-neutral-700">Sắp xếp theo ngày nguồn công bố</p>
          </div>

          {items.length ? (
            <div className="mt-4 space-y-4">
              {items.map((item) => (
                <KnowledgeCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border-2 border-dashed border-[#8fa99e] bg-white p-7">
              <h3 className="text-xl font-semibold">Chưa tìm thấy kết quả phù hợp</h3>
              <p className="mt-2">
                Thử từ khóa ngắn hơn hoặc chọn “Tất cả”. Không có kết quả không có nghĩa là
                không tồn tại tài liệu; hệ thống hiện chỉ tìm trong các nguồn đã kết nối.
              </p>
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-5">
          <div className="rounded-xl border-2 border-[#123c36] bg-white p-5">
            <h2 className="text-xl font-semibold text-[#123c36]">Nguồn đang theo dõi</h2>
            <div className="mt-3 divide-y divide-[#c8d7d0]">
              {KNOWLEDGE_SOURCES.map((source) => (
                <a
                  key={source.name}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block py-3 hover:text-[#0f5c51]"
                >
                  <span className="font-semibold">{source.name}</span>
                  <span className="mt-0.5 block text-sm">{source.scope}</span>
                  <span className="mt-1 inline-block rounded bg-[#edf4f0] px-2 py-0.5 text-xs font-semibold text-[#123c36]">
                    {source.mode}
                  </span>
                </a>
              ))}
            </div>
          </div>
          <div className="rounded-xl border-2 border-[#a77b10] bg-[#fff9e8] p-5">
            <h2 className="font-semibold">Nguyên tắc an toàn</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
              <li>Mỗi kết quả phải có liên kết nguồn gốc.</li>
              <li>Tóm tắt AI được gắn nhãn và không phải kết luận chuyên môn.</li>
              <li>Văn bản phải kiểm tra bản gốc, hiệu lực và phạm vi áp dụng.</li>
            </ul>
          </div>
          <Link
            href="/tai-lieu-tham-khao"
            className="block rounded-md border-2 border-[#123c36] bg-white px-4 py-3 text-center font-semibold text-[#123c36]"
          >
            Xem danh mục tài liệu nền
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-[#9bb6ab] bg-white p-4 shadow-sm">
      <span className="text-2xl font-semibold text-[#123c36]">{value}</span>
      <span className="ml-2 text-sm text-neutral-700">{label}</span>
    </div>
  );
}

function KnowledgeCard({ item }: { item: KnowledgeItem }) {
  return (
    <article className="rounded-xl border-2 border-[#a9bdb4] bg-white p-5 shadow-[0_7px_20px_rgba(18,60,54,.05)]">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="rounded-full bg-[#123c36] px-2.5 py-1 text-white">
          {KIND_LABEL[item.kind]}
        </span>
        <span className="rounded-full border border-[#9bb6ab] px-2.5 py-1 text-[#123c36]">
          {item.sourceName}
        </span>
        <span className="text-neutral-700">{displayDate(item.publishedAt)}</span>
        {item.openAccess && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-900">Mở</span>
        )}
      </div>
      <h3 className="mt-3 text-xl font-semibold leading-snug">{item.title}</h3>
      {item.authors && <p className="mt-1 text-sm text-neutral-700">{item.authors}</p>}
      <p className="mt-3 leading-7">{item.summary}</p>
      <p className="mt-2 text-xs text-neutral-700">
        {item.summaryMode === "biên tập"
          ? "Tóm tắt biên tập từ nguồn công bố."
          : "Đoạn trích tự động từ abstract; có thể giữ nguyên tiếng Anh để tránh dịch sai."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.topics.slice(0, 4).map((topic) => (
          <span key={topic} className="rounded bg-[#edf4f0] px-2 py-1 text-xs text-[#123c36]">
            #{topic}
          </span>
        ))}
      </div>
      {item.abstractForSummary && (
        <AiSummaryButton
          title={item.title}
          abstract={item.abstractForSummary}
          sourceUrl={item.sourceUrl}
        />
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-[#123c36] px-4 py-2 font-semibold text-white"
        >
          Mở nguồn gốc ↗
        </a>
        {item.doi && <span className="text-sm text-neutral-700">DOI: {item.doi}</span>}
      </div>
    </article>
  );
}
