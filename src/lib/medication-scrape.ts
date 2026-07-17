// Lấy DỮ KIỆN (tên, phân loại, ảnh) từ 1 trang sản phẩm công khai của Nhà
// thuốc Long Châu — KHÔNG lấy mô tả/hướng dẫn dùng nguyên văn (bản quyền nội
// dung viết là của nguồn). Chỉ nhận link đúng domain, không dùng làm proxy
// fetch chung chung.
const ALLOWED_HOST = "nhathuoclongchau.com.vn";
const LONG_CHAU_ORIGIN = "https://nhathuoclongchau.com.vn";

export const MEDICATION_CATALOG_SOURCES = {
  drug: {
    label: "Thuốc",
    sitemapUrl: `${LONG_CHAU_ORIGIN}/sitemap_thuoc.xml`,
    pathPrefix: "/thuoc/",
  },
  supplement: {
    label: "Thực phẩm chức năng",
    sitemapUrl: `${LONG_CHAU_ORIGIN}/sitemap_thuc-pham-chuc-nang.xml`,
    pathPrefix: "/thuc-pham-chuc-nang/",
  },
} as const;

export type MedicationCatalogSource = keyof typeof MEDICATION_CATALOG_SOURCES;

export type MedicationScrapeResult = {
  name: string;
  category: string | null;
  imageUrl: string | null;
  sourceUrl: string;
  sourceLabel: string;
};

export function isAllowedMedicationSourceUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (url.hostname !== ALLOWED_HOST && !url.hostname.endsWith(`.${ALLOWED_HOST}`)) return null;
    return url;
  } catch {
    return null;
  }
}

/** Only product pages in the two explicitly approved catalogues are accepted. */
export function isAllowedMedicationProductUrl(raw: string): URL | null {
  const url = isAllowedMedicationSourceUrl(raw);
  if (!url || !url.pathname.endsWith(".html")) return null;
  const path = url.pathname.toLowerCase();
  if (!path.startsWith("/thuoc/") && !path.startsWith("/thuc-pham-chuc-nang/")) return null;
  return url;
}

export async function scrapeMedicationPage(rawUrl: string): Promise<MedicationScrapeResult> {
  const url = isAllowedMedicationProductUrl(rawUrl);
  if (!url) throw new Error("Chỉ chấp nhận link sản phẩm trên nhathuoclongchau.com.vn.");

  const response = await fetch(url.toString(), {
    headers: { "user-agent": "Mozilla/5.0 (compatible; DinhDuong2598/1.0; +clinical nutrition reference)" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Trang nguồn trả về HTTP ${response.status}.`);
  const html = await response.text();

  const nameMatch = html.match(/<h1 data-test="product_name"[^>]*>([^<]+)<\/h1>/);
  const name = nameMatch ? decodeHtmlEntities(nameMatch[1]).trim() : "";
  if (!name) throw new Error("Không tìm thấy tên sản phẩm trên trang này — có thể không phải trang chi tiết thuốc.");

  const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
  const imageUrl = ogImageMatch ? ogImageMatch[1] : null;

  const crumbBlockMatch = html.match(/<ol data-lcpr="prr-id-product-detail-breadcrumb"[^>]*>([\s\S]*?)<\/ol>/);
  let category: string | null = null;
  if (crumbBlockMatch) {
    const links = [...crumbBlockMatch[1].matchAll(/<a[^>]*>(?:<span[^>]*>)?([^<]+)/g)]
      .map((m) => decodeHtmlEntities(m[1]).trim())
      .filter(Boolean);
    const real = links.filter((text) => text !== "Trang chủ");
    category = real.length ? real[real.length - 1] : null;
  }

  return {
    name,
    category,
    imageUrl,
    sourceUrl: url.toString(),
    sourceLabel: `Nhà thuốc Long Châu — ${name}`,
  };
}

// Quét 1 trang danh mục (VD: /thuoc/thuoc-tri-tieu-duong) để lấy nhanh danh
// sách link sản phẩm trong danh mục đó, thay vì admin phải tự dò từng link.
// CHỈ đọc đúng 1 trang đã tải sẵn từ server (không tự động bấm "xem thêm"/gọi
// API nội bộ để vét toàn bộ catalogue) — số sản phẩm lấy được là số hiển thị
// sẵn trong HTML gốc của trang đó, giữ phạm vi quét có chủ đích, không phải
// crawler tự do khắp site.
export function discoverProductLinks(categoryUrl: string, html: string): string[] {
  const base = new URL(categoryUrl);
  const links = new Set<string>();
  for (const match of html.matchAll(/href="([^"]+\.html)"/g)) {
    try {
      const url = new URL(match[1], base);
      if (isAllowedMedicationProductUrl(url.toString())) links.add(url.toString());
    } catch {
      // bỏ qua href không hợp lệ
    }
  }
  return [...links];
}

/**
 * Creates a review-only product URL list from Long Chau's public sitemaps.
 * It never writes to the database or touches categories other than drugs and
 * functional supplements. Product details are requested only after the admin
 * explicitly starts the import.
 */
export async function collectMedicationCatalogLinks(rawSources: unknown): Promise<{
  links: string[];
  sourceCounts: Array<{ source: MedicationCatalogSource; label: string; count: number }>;
}> {
  const selected = normalizeCatalogSources(rawSources);
  if (!selected.length) throw new Error("Chọn ít nhất một danh mục: Thuốc hoặc Thực phẩm chức năng.");

  const sourceCounts: Array<{ source: MedicationCatalogSource; label: string; count: number }> = [];
  const links = new Set<string>();

  // One sitemap request at a time to keep the public source load low.
  for (const source of selected) {
    const definition = MEDICATION_CATALOG_SOURCES[source];
    const response = await fetch(definition.sitemapUrl, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; DinhDuong2598/1.0; +clinical nutrition reference)" },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Sitemap ${definition.label} trả về HTTP ${response.status}.`);

    const xml = await response.text();
    const sourceLinks = new Set<string>();
    for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      const url = isAllowedMedicationProductUrl(decodeHtmlEntities(match[1]));
      if (url && url.pathname.toLowerCase().startsWith(definition.pathPrefix)) sourceLinks.add(url.toString());
    }
    if (!sourceLinks.size) throw new Error(`Không tìm thấy URL sản phẩm hợp lệ trong sitemap ${definition.label}.`);
    for (const link of sourceLinks) links.add(link);
    sourceCounts.push({ source, label: definition.label, count: sourceLinks.size });
  }

  if (links.size > 20_000) throw new Error("Sitemap trả về số lượng URL bất thường; đã dừng để bảo vệ hệ thống.");
  return { links: [...links], sourceCounts };
}

function normalizeCatalogSources(rawSources: unknown): MedicationCatalogSource[] {
  if (!Array.isArray(rawSources)) return [];
  const seen = new Set<MedicationCatalogSource>();
  for (const value of rawSources) {
    if (value === "drug" || value === "supplement") seen.add(value);
  }
  return [...seen];
}

export async function fetchCategoryHtml(rawUrl: string): Promise<{ url: URL; html: string }> {
  const url = isAllowedMedicationSourceUrl(rawUrl);
  if (!url) throw new Error("Chỉ chấp nhận link danh mục trên nhathuoclongchau.com.vn.");
  const response = await fetch(url.toString(), {
    headers: { "user-agent": "Mozilla/5.0 (compatible; DinhDuong2598/1.0; +clinical nutrition reference)" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Trang danh mục trả về HTTP ${response.status}.`);
  return { url, html: await response.text() };
}

// Tìm kiếm theo đúng trang tìm kiếm công khai của Long Châu. Không gọi API nội
// bộ, không dò toàn catalogue và chỉ trả các URL sản phẩm đang hiển thị trong
// kết quả; Admin vẫn là người chọn rồi mới nhập vào danh mục dùng chung.
export async function searchMedicationProductLinks(rawQuery: string): Promise<string[]> {
  const query = rawQuery.trim().replace(/\s+/g, " ");
  if (query.length < 2) throw new Error("Nhập tối thiểu 2 ký tự để tìm sản phẩm.");
  if (query.length > 100) throw new Error("Từ khóa tìm kiếm quá dài.");

  const url = new URL("https://nhathuoclongchau.com.vn/tim-kiem");
  url.searchParams.set("s", query);
  const { html } = await fetchCategoryHtml(url.toString());
  return discoverProductLinks(url.toString(), html).slice(0, 60);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
