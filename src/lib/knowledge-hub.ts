import "server-only";

export type KnowledgeKind = "legal" | "guideline" | "research" | "official-news";

export type KnowledgeItem = {
  id: string;
  kind: KnowledgeKind;
  title: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt?: string;
  authors?: string;
  summary: string;
  topics: string[];
  doi?: string;
  openAccess?: boolean;
  abstractForSummary?: string;
  summaryMode: "biên tập" | "trích từ tóm tắt nghiên cứu";
};

export type KnowledgeSource = {
  name: string;
  scope: string;
  url: string;
  mode: "API" | "Theo dõi nguồn chính thức";
};

export const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  {
    name: "Europe PMC / PubMed",
    scope: "Nghiên cứu khoa học y sinh và dinh dưỡng",
    url: "https://europepmc.org/RestfulWebService",
    mode: "API",
  },
  {
    name: "Cổng Pháp luật quốc gia",
    scope: "Văn bản pháp luật và tình trạng hiệu lực",
    url: "https://phapluat.gov.vn/",
    mode: "Theo dõi nguồn chính thức",
  },
  {
    name: "Bộ Y tế / Cục Quản lý Khám, chữa bệnh",
    scope: "Quyết định, hướng dẫn chuyên môn và thông báo",
    url: "https://kcb.vn/",
    mode: "Theo dõi nguồn chính thức",
  },
  {
    name: "Viện Dinh dưỡng",
    scope: "Khuyến nghị, tài liệu và thông tin dinh dưỡng tại Việt Nam",
    url: "https://viendinhduong.vn/",
    mode: "Theo dõi nguồn chính thức",
  },
  {
    name: "World Health Organization",
    scope: "Hướng dẫn và chuẩn tham chiếu quốc tế",
    url: "https://www.who.int/health-topics/nutrition",
    mode: "Theo dõi nguồn chính thức",
  },
];

const CURATED_ITEMS: KnowledgeItem[] = [
  {
    id: "qd-1986-2026",
    kind: "legal",
    title: "Quyết định 1986/QĐ-BYT ngày 01/07/2026",
    sourceName: "Cục Quản lý Khám, chữa bệnh – Bộ Y tế",
    sourceUrl:
      "https://kcb.vn/tin-tuc/sua-doi-quy-dinh-ve-hieu-luc-thi-hanh-thoi-diem-ap-dung-tai-mot-so-quyet-dinh-cua-bo-truong-bo-y-te-ban-hanh-tai-lieu-ch.html",
    publishedAt: "2026-07-01",
    summary:
      "Sửa thời điểm áp dụng tài liệu Hướng dẫn quy trình kỹ thuật về Dinh dưỡng lâm sàng ban hành kèm Quyết định 2598/QĐ-BYT. Khi sử dụng cần mở nguồn gốc để kiểm tra đầy đủ phạm vi và hiệu lực.",
    topics: ["dinh dưỡng lâm sàng", "quy trình kỹ thuật", "hiệu lực"],
    summaryMode: "biên tập",
  },
  {
    id: "qd-2598-2025",
    kind: "legal",
    title: "Quyết định 2598/QĐ-BYT ngày 18/08/2025",
    sourceName: "Bộ Y tế",
    sourceUrl:
      "https://syt.bacninh.gov.vn/documents/184573/14187101/2025.08.19.tri%E1%BB%83n%20khai%20h%C6%B0%E1%BB%9Bng%20d%E1%BA%ABn%20quy%20tr%C3%ACnh%20k%E1%BB%B9%20thu%E1%BA%ADt%20v%E1%BB%81%20dinh%20d%C6%B0%E1%BB%A1ng%20l%C3%A2m%20s%C3%A0ng__19082025171940_signed.pdf",
    publishedAt: "2025-08-18",
    summary:
      "Ban hành tài liệu chuyên môn Hướng dẫn quy trình kỹ thuật về Dinh dưỡng lâm sàng gồm 36 quy trình kỹ thuật. Đây là căn cứ về quy trình, không phải bảng nhu cầu dinh dưỡng.",
    topics: ["dinh dưỡng lâm sàng", "quy trình kỹ thuật", "bệnh viện"],
    summaryMode: "biên tập",
  },
  {
    id: "who-nutrition-news-may-june-2026",
    kind: "official-news",
    title: "Nutrition and Food Safety News – May–June 2026",
    sourceName: "World Health Organization",
    sourceUrl:
      "https://www.who.int/publications/m/item/nutrition-and-food-safety-news---may-june-2026",
    publishedAt: "2026-07-07",
    summary:
      "Bản tin của Khoa Dinh dưỡng và An toàn thực phẩm WHO tổng hợp các hoạt động chuyên môn nổi bật trong tháng 5 và 6 năm 2026.",
    topics: ["WHO", "an toàn thực phẩm", "bản tin dinh dưỡng"],
    summaryMode: "biên tập",
  },
  {
    id: "who-healthy-school-food-2026",
    kind: "official-news",
    title: "WHO urges schools worldwide to promote healthy eating for children",
    sourceName: "World Health Organization",
    sourceUrl:
      "https://www.who.int/news/item/27-01-2026-who-urges-schools-worldwide-to-promote-healthy-eating-for-children",
    publishedAt: "2026-01-27",
    summary:
      "WHO kêu gọi các trường học xây dựng môi trường thực phẩm lành mạnh hơn cho trẻ em, đồng thời công bố hướng dẫn toàn cầu về chính sách thực phẩm học đường.",
    topics: ["trẻ em", "trường học", "ăn uống lành mạnh"],
    summaryMode: "biên tập",
  },
  {
    id: "who-child-growth-standards",
    kind: "guideline",
    title: "WHO Child Growth Standards",
    sourceName: "World Health Organization",
    sourceUrl: "https://www.who.int/tools/child-growth-standards",
    summary:
      "Bộ chuẩn tăng trưởng của WHO dùng để đối chiếu các chỉ số nhân trắc và Z-score ở trẻ nhỏ. Kết quả hỗ trợ sàng lọc, cần được diễn giải theo bối cảnh lâm sàng.",
    topics: ["trẻ em", "tăng trưởng", "Z-score", "nhân trắc"],
    summaryMode: "biên tập",
  },
  {
    id: "who-breastfeeding-guideline-2017",
    kind: "guideline",
    title: "WHO guideline: breastfeeding in maternity and newborn facilities",
    sourceName: "World Health Organization",
    sourceUrl: "https://www.who.int/publications/i/item/9789241550086",
    publishedAt: "2017-11-02",
    summary:
      "Khuyến nghị bảo vệ, thúc đẩy và hỗ trợ nuôi con bằng sữa mẹ tại các cơ sở cung cấp dịch vụ sản khoa và sơ sinh.",
    topics: ["sữa mẹ", "sơ sinh", "sản khoa"],
    summaryMode: "biên tập",
  },
  {
    id: "qd-2879-2006",
    kind: "guideline",
    title: "Hướng dẫn chế độ ăn bệnh viện – Quyết định 2879/QĐ-BYT",
    sourceName: "Bộ Y tế",
    sourceUrl:
      "https://thuvienphapluat.vn/van-ban/The-thao-Y-te/Quyet-dinh-2879-QD-BYT-nam-2006-huong-dan-che-do-an-benh-vien-do-Bo-truong-Bo-Y-te-ban-hanh-2377.aspx",
    publishedAt: "2006-08-10",
    summary:
      "Tài liệu nền về nguyên tắc xây dựng chế độ ăn bệnh viện. Cần đối chiếu văn bản và hướng dẫn mới hơn trước khi áp dụng tại cơ sở.",
    topics: ["bệnh viện", "chế độ ăn", "suất ăn"],
    summaryMode: "biên tập",
  },
  {
    id: "vien-dinh-duong-rni",
    kind: "guideline",
    title: "Khuyến nghị cho người Việt Nam – Nhu cầu dinh dưỡng",
    sourceName: "Viện Dinh dưỡng",
    sourceUrl: "https://viendinhduong.vn/",
    summary:
      "Nguồn tham khảo cho nhu cầu dinh dưỡng theo nhóm tuổi, giới và tình trạng sinh lý. Khi áp dụng cần ghi rõ phiên bản, đối tượng và đơn vị.",
    topics: ["RNI", "nhu cầu dinh dưỡng", "người Việt Nam"],
    summaryMode: "biên tập",
  },
];

const VIETNAMESE_QUERY_MAP: Array<[RegExp, string]> = [
  [/suy dinh duong|thieu dinh duong/, "malnutrition"],
  [/tre em|nhi khoa/, "child nutrition"],
  [/nguoi cao tuoi|lao khoa/, "older adults nutrition"],
  [/dai thao duong|tieu duong/, "diabetes nutrition"],
  [/beo phi|thua can/, "obesity diet"],
  [/nuoi an qua ong|dinh duong duong ruot/, "enteral nutrition"],
  [/dinh duong tinh mach/, "parenteral nutrition"],
  [/benh than|suy than/, "renal nutrition"],
  [/ung thu/, "cancer nutrition"],
  [/sua me|nuoi con bang sua me/, "breastfeeding"],
];

function normalizeForSearch(value: string) {
  return value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanQuery(value: string) {
  return value
    .trim()
    .slice(0, 120)
    .replace(/[()[\]{}"'*:<>\\]/g, " ")
    .replace(/\b(AND|OR|NOT)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toEnglishResearchQuery(value: string) {
  const normalized = normalizeForSearch(value);
  for (const [pattern, replacement] of VIETNAMESE_QUERY_MAP) {
    if (pattern.test(normalized)) return replacement;
  }
  return cleanQuery(value);
}

function stripMarkup(value: string) {
  return value
    .replace(/<h\d[^>]*>/gi, ". ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .replace(/^\.\s*/, "")
    .trim();
}

function researchExcerpt(abstractText: string) {
  const text = stripMarkup(abstractText);
  if (!text) return "Chưa có abstract trong dữ liệu nguồn. Mở bài gốc để đọc nội dung.";
  const conclusionIndex = text.search(/\b(Conclusions?|Interpretation|Findings)\b[:.\s]/i);
  const preferred = conclusionIndex >= 0 ? text.slice(conclusionIndex) : text;
  const cut = preferred.slice(0, 430);
  const lastStop = cut.lastIndexOf(".");
  return `${lastStop > 170 ? cut.slice(0, lastStop + 1) : cut}${preferred.length > cut.length ? "…" : ""}`;
}

type EuropePmcResult = {
  id?: string;
  source?: string;
  pmid?: string;
  pmcid?: string;
  title?: string;
  authorString?: string;
  firstPublicationDate?: string;
  abstractText?: string;
  doi?: string;
  isOpenAccess?: string;
};

type EuropePmcPayload = {
  resultList?: { result?: EuropePmcResult[] };
};

function researchSourceUrl(result: EuropePmcResult) {
  if (result.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(result.pmid)}/`;
  if (result.pmcid) return `https://europepmc.org/article/PMC/${encodeURIComponent(result.pmcid)}`;
  if (result.doi) return `https://doi.org/${encodeURIComponent(result.doi)}`;
  return `https://europepmc.org/article/${encodeURIComponent(result.source || "MED")}/${encodeURIComponent(result.id || "")}`;
}

export async function searchEuropePmc(rawQuery: string, take = 10): Promise<KnowledgeItem[]> {
  const query = toEnglishResearchQuery(rawQuery) || "clinical nutrition";
  const today = new Date().toISOString().slice(0, 10);
  const yearFrom = Math.max(new Date().getUTCFullYear() - 2, 2000);
  const apiQuery = `("${query}") AND (nutrition OR diet OR malnutrition) AND FIRST_PDATE:[${yearFrom}-01-01 TO ${today}]`;
  const url = new URL("https://www.ebi.ac.uk/europepmc/webservices/rest/search");
  url.searchParams.set("query", apiQuery);
  url.searchParams.set("format", "json");
  url.searchParams.set("resultType", "core");
  url.searchParams.set("pageSize", String(Math.min(Math.max(take, 1), 20)));
  url.searchParams.set("sort_date", "y");

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 21_600 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as EuropePmcPayload;
    return (payload.resultList?.result || [])
      .filter((result) => result.id && result.title)
      .map((result) => {
        const abstract = stripMarkup(result.abstractText || "").slice(0, 6_000);
        return {
          id: `epmc-${result.source || "MED"}-${result.id}`,
          kind: "research" as const,
          title: stripMarkup(result.title || "Nghiên cứu chưa có tiêu đề"),
          sourceName: result.source === "MED" ? "PubMed / Europe PMC" : "Europe PMC",
          sourceUrl: researchSourceUrl(result),
          publishedAt: result.firstPublicationDate,
          authors: result.authorString,
          summary: researchExcerpt(result.abstractText || ""),
          topics: [query, "nghiên cứu khoa học"],
          doi: result.doi,
          openAccess: result.isOpenAccess === "Y",
          abstractForSummary: abstract || undefined,
          summaryMode: "trích từ tóm tắt nghiên cứu" as const,
        };
      });
  } catch {
    return [];
  }
}

function matchesCuratedQuery(item: KnowledgeItem, query: string) {
  if (!query) return true;
  const needle = normalizeForSearch(query);
  const haystack = normalizeForSearch(
    [item.title, item.sourceName, item.summary, ...item.topics].join(" "),
  );
  return needle.split(" ").filter(Boolean).every((token) => haystack.includes(token));
}

export async function getKnowledgeItems(options: {
  query?: string;
  kind?: KnowledgeKind | "all";
}) {
  const query = cleanQuery(options.query || "");
  const kind = options.kind || "all";
  const curated = CURATED_ITEMS.filter(
    (item) => (kind === "all" || item.kind === kind) && matchesCuratedQuery(item, query),
  );
  const shouldLoadResearch = kind === "all" || kind === "research";
  const research = shouldLoadResearch ? await searchEuropePmc(query, kind === "research" ? 14 : 9) : [];
  return [...curated, ...research].sort((a, b) =>
    (b.publishedAt || "0000-00-00").localeCompare(a.publishedAt || "0000-00-00"),
  );
}
