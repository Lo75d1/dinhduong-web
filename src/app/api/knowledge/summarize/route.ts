import { getGeminiConfig } from "@/lib/gemini-settings";

const MAX_TITLE_LENGTH = 500;
const MAX_ABSTRACT_LENGTH = 6_000;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { title?: unknown; abstract?: unknown; sourceUrl?: unknown }
    | null;
  const title = cleanText(body?.title, MAX_TITLE_LENGTH);
  const abstract = cleanText(body?.abstract, MAX_ABSTRACT_LENGTH);
  const sourceUrl = cleanText(body?.sourceUrl, 1_000);

  if (!title || abstract.length < 80) {
    return Response.json(
      { error: "Bài này chưa có đủ abstract để tạo tóm tắt tiếng Việt." },
      { status: 400 },
    );
  }

  const config = await getGeminiConfig().catch(() => null);
  if (!config) {
    return Response.json(
      { error: "Chức năng tóm tắt AI chưa được quản trị viên cấu hình." },
      { status: 503 },
    );
  }

  const schema = {
    type: "OBJECT",
    properties: {
      question: { type: "STRING" },
      keyFinding: { type: "STRING" },
      limitations: { type: "STRING" },
    },
    required: ["question", "keyFinding", "limitations"],
  };
  const prompt = `Bạn là trợ lý đọc nghiên cứu dinh dưỡng. Chỉ dùng nội dung trong tiêu đề và abstract dưới đây; tuyệt đối không thêm số liệu, kết luận hoặc khuyến cáo điều trị không có trong nguồn. Viết tiếng Việt dễ hiểu:
- question: nghiên cứu hỏi điều gì, tối đa 45 từ.
- keyFinding: kết quả chính, nêu rõ đây là kết quả của nghiên cứu, tối đa 80 từ.
- limitations: giới hạn có thể xác định trực tiếp từ abstract; nếu abstract không đủ thông tin, ghi đúng "Abstract chưa cung cấp đủ thông tin để đánh giá giới hạn nghiên cứu."
Không biến mối liên hệ thành quan hệ nhân quả. Không đưa lời khuyên cá nhân.

Tiêu đề: ${title}
Nguồn: ${sourceUrl}
Abstract: ${abstract}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": config.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 1_024,
            response_mime_type: "application/json",
            response_schema: schema,
          },
        }),
        signal: AbortSignal.timeout(25_000),
      },
    );
    if (!response.ok) throw new Error("Gemini request failed");
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
    const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "")) as {
      question?: unknown;
      keyFinding?: unknown;
      limitations?: unknown;
    };
    const summary = {
      question: cleanText(parsed.question, 500),
      keyFinding: cleanText(parsed.keyFinding, 900),
      limitations: cleanText(parsed.limitations, 700),
    };
    if (!summary.question || !summary.keyFinding || !summary.limitations) throw new Error("Invalid schema");
    return Response.json({ summary, model: config.model });
  } catch {
    return Response.json(
      { error: "Chưa thể tạo tóm tắt lúc này. Bạn vẫn có thể mở abstract và bài gốc." },
      { status: 502 },
    );
  }
}

