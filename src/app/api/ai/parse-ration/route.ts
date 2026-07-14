import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeVi } from "@/lib/normalize";
import { CORE_CALC_FIELDS } from "@/lib/nutrient-fields";
import { CLASSIFY_SELECT_KEYS } from "@/lib/food-classify";
import { getSessionUser } from "@/lib/auth";

const MAX_TEXT_LENGTH = 6_000;
const FOOD_SELECT = {
  id: true, name: true, nameNormalized: true, source: true, wastePercent: true,
  ...Object.fromEntries(CORE_CALC_FIELDS.map((field) => [field.key, true])),
  ...Object.fromEntries(CLASSIFY_SELECT_KEYS.map((key) => [key, true])),
} as const;

type ParsedItem = { meal?: unknown; dishName?: unknown; foodName?: unknown; edibleGrams?: unknown; note?: unknown };
const asText = (value: unknown, max = 160) => typeof value === "string" ? value.trim().slice(0, max) : "";
const asGrams = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 20_000 ? value : 0;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { text?: unknown; personalApiKey?: unknown; externalProcessingConsent?: unknown } | null;
  const text = asText(body?.text, MAX_TEXT_LENGTH);
  const personalApiKey = asText(body?.personalApiKey, 300);
  if (text.length < 8) return Response.json({ error: "Nhập mô tả khẩu phần tối thiểu 8 ký tự." }, { status: 400 });
  if (body?.externalProcessingConsent !== true) return Response.json({ error: "Cần xác nhận trước khi gửi mô tả khẩu phần sang dịch vụ AI bên ngoài." }, { status: 400 });

  // Key riêng chỉ được dùng cho request này, không ghi vào log/database/localStorage.
  const sessionUser = personalApiKey ? null : await getSessionUser();
  const apiKey = personalApiKey || (sessionUser ? process.env.GEMINI_API_KEY?.trim() : "");
  if (!apiKey) return Response.json({ error: "Hãy dán key Gemini riêng cho phiên này, hoặc đăng nhập để dùng key chung của hệ thống." }, { status: 401 });

  const schema = {
    type: "OBJECT",
    properties: {
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            meal: { type: "STRING" }, dishName: { type: "STRING" }, foodName: { type: "STRING" },
            edibleGrams: { type: "NUMBER" }, note: { type: "STRING" },
          },
          required: ["meal", "dishName", "foodName", "edibleGrams", "note"],
        },
      },
    },
    required: ["items"],
  };
  const prompt = `Bạn là công cụ BÓC TÁCH dữ liệu cho phiếu khẩu phần dinh dưỡng, không chẩn đoán hay tư vấn điều trị.\n\nTừ mô tả người dùng, tạo các dòng: Bữa -> Món -> nguyên liệu/thực phẩm. Chỉ lấy lượng ghi rõ; thiếu lượng thì edibleGrams = 0. Không tự ước tính, không bịa dinh dưỡng. foodName phải là nguyên liệu hoặc thực phẩm cụ thể, không phải tên món hỗn hợp. Giữ tên món ở dishName. meal rỗng nếu không rõ. note nêu đơn vị hoặc điểm chưa chắc (nếu có). Chỉ trả JSON đúng schema.\n\nMô tả người dùng:\n${text}`;

  let payload: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash")}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, response_mime_type: "application/json", response_schema: schema } }),
    });
    if (!response.ok) return Response.json({ error: "Gemini chưa thể xử lý yêu cầu. Kiểm tra lại key, hạn mức hoặc cấu hình model." }, { status: 502 });
    payload = await response.json() as typeof payload;
  } catch {
    return Response.json({ error: "Không thể kết nối Gemini. Vui lòng thử lại." }, { status: 502 });
  }
  const responseText = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  let parsed: { items?: ParsedItem[] };
  try { parsed = JSON.parse(responseText) as { items?: ParsedItem[] }; } catch { return Response.json({ error: "Gemini trả về dữ liệu không đúng định dạng. Vui lòng thử lại." }, { status: 502 }); }
  const items = (Array.isArray(parsed.items) ? parsed.items : []).slice(0, 40).map((item) => ({ meal: asText(item.meal), dishName: asText(item.dishName), foodName: asText(item.foodName), edibleGrams: asGrams(item.edibleGrams), note: asText(item.note, 300) })).filter((item) => item.foodName);
  const names = [...new Set(items.map((item) => normalizeVi(item.foodName)).filter(Boolean))];
  const foods = names.length ? await prisma.food.findMany({ where: { OR: names.map((nameNormalized) => ({ nameNormalized: { contains: nameNormalized } })) }, take: 100, select: FOOD_SELECT }) : [];
  const matches = items.map((item) => {
    const normalized = normalizeVi(item.foodName);
    const words = normalized.split(" ").filter((word) => word.length >= 2);
    const candidates = foods.map((candidate) => {
      const candidateWords = candidate.nameNormalized.split(" ");
      let score = 0;
      if (candidate.nameNormalized === normalized) score += 1_000;
      if (candidate.nameNormalized.startsWith(normalized) || normalized.startsWith(candidate.nameNormalized)) score += 200;
      if (candidate.nameNormalized.includes(normalized) || normalized.includes(candidate.nameNormalized)) score += 100;
      score += words.filter((word) => candidateWords.includes(word)).length * 20;
      return { candidate, score };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 5).map((item) => item.candidate);
    const exact = candidates.find((candidate) => candidate.nameNormalized === normalized) ?? null;
    return { ...item, food: exact, matchType: exact ? "exact" : "none", candidates };
  });
  return Response.json({ items: matches, keyMode: personalApiKey ? "personal" : "system" });
}
