import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeVi } from "@/lib/normalize";
import { searchTokens } from "@/lib/search";
import { CORE_CALC_FIELDS } from "@/lib/nutrient-fields";
import { CLASSIFY_SELECT_KEYS } from "@/lib/food-classify";

const MAX_TEXT_LENGTH = 3_000;
const FOOD_SELECT = {
  id: true, name: true, nameNormalized: true, source: true, wastePercent: true,
  aliases: { select: { aliasNormalized: true } },
  ...Object.fromEntries(CORE_CALC_FIELDS.map((field) => [field.key, true])),
  ...Object.fromEntries(CLASSIFY_SELECT_KEYS.map((key) => [key, true])),
} as const;

type ParsedItem = { meal?: unknown; dishName?: unknown; foodName?: unknown; edibleGrams?: unknown; note?: unknown };
type FoodRecord = { id: string; name: string; nameNormalized: string; source: string; wastePercent: number | null; aliases: Array<{ aliasNormalized: string }> } & Record<string, unknown>;
const asText = (value: unknown, max = 160) => typeof value === "string" ? value.trim().slice(0, max) : "";
const asGrams = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 20_000 ? value : 0;

function rankCandidate(candidate: FoodRecord, query: string) {
  const names = [candidate.nameNormalized, ...candidate.aliases.map((alias) => alias.aliasNormalized)];
  const tokens = searchTokens(query);
  let best = 0;
  for (const name of names) {
    let score = 0;
    if (name === query) score += 1_000;
    else if (name.startsWith(query) || query.startsWith(name)) score += 260;
    else if (name.includes(query) || query.includes(name)) score += 140;
    score += tokens.filter((token) => name.split(" ").includes(token)).length * 40;
    best = Math.max(best, score);
  }
  return best;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { text?: unknown; externalProcessingConsent?: unknown } | null;
  const text = asText(body?.text, MAX_TEXT_LENGTH);
  if (text.length < 8) return Response.json({ error: "Nhập mô tả khẩu phần tối thiểu 8 ký tự." }, { status: 400 });
  if (body?.externalProcessingConsent !== true) return Response.json({ error: "Cần xác nhận trước khi gửi mô tả khẩu phần sang dịch vụ AI bên ngoài." }, { status: 400 });

  // Key chung chỉ nằm ở máy chủ (GEMINI_API_KEY); tuyệt đối không gửi xuống trình duyệt.
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return Response.json({ error: "AI chưa được quản trị viên bật. Vui lòng liên hệ quản trị để cấu hình Gemini dùng chung." }, { status: 503 });

  const schema = { type: "OBJECT", properties: { items: { type: "ARRAY", items: { type: "OBJECT", properties: { meal: { type: "STRING" }, dishName: { type: "STRING" }, foodName: { type: "STRING" }, edibleGrams: { type: "NUMBER" }, note: { type: "STRING" } }, required: ["meal", "dishName", "foodName", "edibleGrams", "note"] } } }, required: ["items"] };
  const prompt = `Bóc tách khẩu phần thành JSON, không tư vấn điều trị. Mỗi dòng là một thực phẩm hoặc món có thể tra cứu. Giữ nguyên tên người dùng nói để foodName dễ khớp CSDL Việt Nam. Nếu chỉ nêu tên món (ví dụ “phở bò 350 g”) thì giữ 1 dòng foodName="phở bò"; KHÔNG tự bịa nguyên liệu. Chỉ tách nguyên liệu khi người dùng đã nêu rõ trong ngoặc/danh sách; khi đó KHÔNG thêm lại dòng món tổng để tránh đếm đôi. Chỉ lấy số lượng đã ghi; không rõ gram thì edibleGrams=0 và note="chưa rõ lượng". meal là bữa nếu có; dishName là tên món/nhóm món, rỗng nếu thực phẩm ăn trực tiếp. Không tạo số dinh dưỡng. Trả đúng JSON schema.\nDữ liệu: ${text}`;

  let payload: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash")}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0, maxOutputTokens: 2048, response_mime_type: "application/json", response_schema: schema } }),
    });
    if (!response.ok) return Response.json({ error: "Gemini chưa thể xử lý yêu cầu. Quản trị viên cần kiểm tra hạn mức hoặc cấu hình AI." }, { status: 502 });
    payload = await response.json() as typeof payload;
  } catch { return Response.json({ error: "Không thể kết nối Gemini. Vui lòng thử lại." }, { status: 502 }); }

  const responseText = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  let parsed: { items?: ParsedItem[] };
  try { parsed = JSON.parse(responseText) as { items?: ParsedItem[] }; } catch { return Response.json({ error: "Gemini trả về dữ liệu không đúng định dạng. Vui lòng thử lại." }, { status: 502 }); }
  const items = (Array.isArray(parsed.items) ? parsed.items : []).slice(0, 40).map((item) => ({ meal: asText(item.meal), dishName: asText(item.dishName), foodName: asText(item.foodName), edibleGrams: asGrams(item.edibleGrams), note: asText(item.note, 300) })).filter((item) => item.foodName);
  const queries = [...new Set(items.map((item) => normalizeVi(item.foodName)).filter(Boolean))];
  const foods = queries.length ? await prisma.food.findMany({ where: { OR: queries.map((query) => ({ AND: searchTokens(query).map((token) => ({ OR: [{ nameNormalized: { contains: token } }, { aliases: { some: { aliasNormalized: { contains: token } } } }] })) })) }, take: 250, select: FOOD_SELECT }) : [];
  const records = foods as unknown as FoodRecord[];
  const matches = items.map((item) => {
    const query = normalizeVi(item.foodName);
    const ranked = records.map((candidate) => ({ candidate, score: rankCandidate(candidate, query) })).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name, "vi"));
    const suggestions = ranked.slice(0, 5);
    const exact = suggestions[0]?.score >= 1_000 ? suggestions[0].candidate : null;
    const safeSuggestion = !exact && suggestions[0]?.score >= 220 && (suggestions.length === 1 || suggestions[0].score - suggestions[1].score >= 60) ? suggestions[0].candidate : null;
    return { ...item, food: exact ?? safeSuggestion, matchType: exact ? "exact" : safeSuggestion ? "suggested" : "none", candidates: suggestions.map((entry) => entry.candidate) };
  });
  return Response.json({ items: matches, keyMode: "system" });
}
