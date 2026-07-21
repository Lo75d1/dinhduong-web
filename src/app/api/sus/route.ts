import { prisma } from "@/lib/prisma";
import { cleanPublicText } from "@/lib/site-settings";
import { scoreSus } from "@/lib/sus";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const role = cleanPublicText(body?.role, 60);
  const useFreq = cleanPublicText(body?.useFreq, 10);
  const comment = cleanPublicText(body?.comment, 2000);

  const answers: number[] = [];
  for (let i = 1; i <= 10; i++) {
    const raw = body?.[`q${i}`];
    const n = typeof raw === "number" ? raw : Number(raw);
    answers.push(n);
  }
  const susScore = scoreSus(answers);
  if (susScore === null) {
    return Response.json({ error: "Vui lòng trả lời đủ 10 câu, mỗi câu chọn mức 1–5." }, { status: 400 });
  }

  try {
    await prisma.susResponse.create({
      data: {
        role: role || null,
        useFreq: useFreq || null,
        q1: answers[0], q2: answers[1], q3: answers[2], q4: answers[3], q5: answers[4],
        q6: answers[5], q7: answers[6], q8: answers[7], q9: answers[8], q10: answers[9],
        susScore,
        comment: comment || null,
      },
    });
    return Response.json({ ok: true, susScore }, { status: 201 });
  } catch {
    return Response.json({ error: "Chưa thể gửi khảo sát. Vui lòng thử lại sau." }, { status: 503 });
  }
}
