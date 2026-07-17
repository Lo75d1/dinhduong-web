// Lấy DỮ KIỆN (tên, phân loại, ảnh) từ 1 trang sản phẩm công khai của Nhà
// thuốc Long Châu — KHÔNG lấy mô tả/hướng dẫn dùng nguyên văn (bản quyền nội
// dung viết là của nguồn). Chỉ nhận link đúng domain, không dùng làm proxy
// fetch chung chung.
const ALLOWED_HOST = "nhathuoclongchau.com.vn";

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

export async function scrapeMedicationPage(rawUrl: string): Promise<MedicationScrapeResult> {
  const url = isAllowedMedicationSourceUrl(rawUrl);
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
      if (isAllowedMedicationSourceUrl(url.toString())) links.add(url.toString());
    } catch {
      // bỏ qua href không hợp lệ
    }
  }
  return [...links];
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

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
