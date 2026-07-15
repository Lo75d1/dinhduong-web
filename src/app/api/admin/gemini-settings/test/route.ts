import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";
import { getGeminiConfig } from "@/lib/gemini-settings";

export async function POST() {
  try {
    const user = await requireSessionUser(); if (user.role !== "ADMIN") return Response.json({ error: "Bạn không có quyền quản trị." }, { status: 403 });
    const config = await getGeminiConfig(); if (!config) return Response.json({ error: "Chưa có API key Gemini dùng chung." }, { status: 400 });
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey }, body: JSON.stringify({ contents: [{ parts: [{ text: "Trả lời đúng một từ: OK" }] }], generationConfig: { temperature: 0, maxOutputTokens: 8 } }) });
    if (!response.ok) return Response.json({ error: "Gemini không phản hồi. Kiểm tra key, model hoặc hạn mức." }, { status: 502 });
    return Response.json({ ok: true, message: `Kết nối Gemini thành công (${config.model}).` });
  } catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse(); return Response.json({ error: "Không thể kiểm tra Gemini." }, { status: 503 }); }
}
