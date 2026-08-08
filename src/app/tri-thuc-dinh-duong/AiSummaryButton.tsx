"use client";

import { useState } from "react";

type Summary = {
  question: string;
  keyFinding: string;
  limitations: string;
};

export default function AiSummaryButton({
  title,
  abstract,
  sourceUrl,
}: {
  title: string;
  abstract: string;
  sourceUrl: string;
}) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  async function summarize() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/knowledge/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, abstract, sourceUrl }),
      });
      const payload = (await response.json()) as { summary?: Summary; error?: string };
      if (!response.ok || !payload.summary) throw new Error(payload.error || "Không thể tóm tắt.");
      setSummary(payload.summary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tóm tắt.");
    } finally {
      setLoading(false);
    }
  }

  if (summary) {
    return (
      <div className="mt-4 rounded-lg border border-[#8da99d] bg-[#f2f8f5] p-4 text-sm">
        <p className="font-semibold text-[#123c36]">Tóm tắt AI có đối chiếu abstract</p>
        <dl className="mt-2 space-y-2">
          <div>
            <dt className="font-semibold">Câu hỏi:</dt>
            <dd>{summary.question}</dd>
          </div>
          <div>
            <dt className="font-semibold">Kết quả chính:</dt>
            <dd>{summary.keyFinding}</dd>
          </div>
          <div>
            <dt className="font-semibold">Giới hạn:</dt>
            <dd>{summary.limitations}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-neutral-700">
          Nội dung máy tạo, phải kiểm tra lại bài gốc trước khi sử dụng chuyên môn.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={summarize}
        disabled={loading}
        className="rounded-md border border-[#52786d] bg-white px-3 py-2 text-sm font-semibold text-[#123c36] disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Đang đọc abstract…" : "Tóm tắt tiếng Việt bằng AI"}
      </button>
      <p className="mt-1 text-xs text-neutral-700">
        Tiêu đề và abstract công khai sẽ được gửi tới dịch vụ Gemini để tóm tắt.
      </p>
      {error && <p className="mt-2 text-sm font-semibold text-red-800">{error}</p>}
    </div>
  );
}

