// Thang đo mức độ khả dụng SUS (System Usability Scale, Brooke 1996) — 10 mục,
// mức 1 (rất không đồng ý) → 5 (rất đồng ý). Câu lẻ tính tích cực, câu chẵn nghịch;
// tổng quy về thang 0–100. SUS KHÔNG phải phần trăm.

export const SUS_ITEMS: string[] = [
  "Tôi muốn sử dụng hệ thống này thường xuyên.",
  "Tôi thấy hệ thống phức tạp không cần thiết.",
  "Tôi thấy hệ thống dễ sử dụng.",
  "Tôi cần người hỗ trợ kỹ thuật mới dùng được hệ thống.",
  "Tôi thấy các chức năng của hệ thống được tích hợp tốt.",
  "Tôi thấy hệ thống thiếu nhất quán.",
  "Tôi nghĩ hầu hết mọi người sẽ học dùng hệ thống rất nhanh.",
  "Tôi thấy hệ thống rườm rà khi sử dụng.",
  "Tôi cảm thấy tự tin khi sử dụng hệ thống.",
  "Tôi phải học nhiều thứ trước khi bắt đầu dùng hệ thống.",
];

export const SUS_ROLES = [
  "Bác sĩ",
  "Dinh dưỡng viên",
  "Điều dưỡng",
  "PT / huấn luyện viên",
  "Phụ huynh / người chăm sóc",
  "Khác",
];

export const SUS_USE_FREQ = ["1-2", "3-5", ">5"];

/**
 * Tính điểm SUS (0–100) từ 10 câu trả lời (mỗi câu 1–5). Trả null nếu không đủ
 * 10 câu hoặc có câu ngoài khoảng 1–5 — không đoán, không bù giá trị thiếu.
 */
export function scoreSus(answers: number[]): number | null {
  if (!Array.isArray(answers) || answers.length !== 10) return null;
  for (const a of answers) {
    if (!Number.isInteger(a) || a < 1 || a > 5) return null;
  }
  let sum = 0;
  answers.forEach((a, i) => {
    // i chẵn (0,2,4,6,8) = câu lẻ (1,3,…) tính a-1; i lẻ = câu chẵn tính 5-a
    sum += i % 2 === 0 ? a - 1 : 5 - a;
  });
  return Math.round(sum * 2.5 * 10) / 10;
}
