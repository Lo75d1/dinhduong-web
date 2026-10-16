export type NutritionDownload = { downloadUrl: string; expiresAt: string; filename: string };

export async function readNutritionResponse<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error("Bạn cần đăng nhập tài khoản để thực hiện thao tác này.");
    if (response.status === 429) {
      const seconds = Number(response.headers.get("Retry-After"));
      throw new Error(Number.isFinite(seconds) && seconds > 0 && seconds <= 86400 ? `Đã đến hạn mức xử lý. Thử lại sau ${Math.ceil(seconds)} giây.` : "Đã đến hạn mức xử lý. Vui lòng thử lại sau.");
    }
    const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
    const message = typeof record.message === "string" ? record.message : typeof record.error_description === "string" ? record.error_description : "Chưa xử lý được yêu cầu. Kiểm tra đầu vào hoặc thử lại sau.";
    const seconds = Number(response.headers.get("Retry-After"));
    throw new Error(response.status === 503 && Number.isFinite(seconds) && seconds > 0 && seconds <= 86400 ? `${message} Thử lại sau ${Math.ceil(seconds)} giây.` : message);
  }
  if (!data || typeof data !== "object") throw new Error("Hệ thống chưa trả được bản hợp lệ. Vui lòng thử lại.");
  return data as T;
}

export function sameSiteNutritionDownload(result: NutritionDownload): NutritionDownload {
  const url = new URL(result.downloadUrl, window.location.origin);
  if (url.origin !== window.location.origin || url.username || url.password || typeof result.filename !== "string" || !Number.isFinite(Date.parse(result.expiresAt))) throw new Error("Link tải chưa hợp lệ. Vui lòng xuất lại.");
  return { ...result, downloadUrl: url.href };
}
