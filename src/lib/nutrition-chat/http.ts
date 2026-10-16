import { NutritionSecurityError } from "./oauth-validation";

/** Bounded streaming read, including chunked requests with no Content-Length. */
export async function readNutritionText(request: Request, maxBytes = 1_048_576, timeoutMs = 10_000): Promise<string> {
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 4_194_304 || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) throw new NutritionSecurityError("server_error", 503);
  const length = request.headers.get("content-length");
  if (length && (!/^\d{1,12}$/.test(length) || Number(length) > maxBytes)) throw new NutritionSecurityError("request_too_large", 413, "Yêu cầu vượt dung lượng cho phép.");
  if (!request.body) throw new NutritionSecurityError("invalid_request");
  const reader = request.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new NutritionSecurityError("request_timeout", 408, "Hết thời gian nhận yêu cầu.")), timeoutMs); });
  try {
    let bytes = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new NutritionSecurityError("request_too_large", 413, "Yêu cầu vượt dung lượng cho phép.");
      chunks.push(value);
    }
    try { return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)); }
    catch { throw new NutritionSecurityError("invalid_request", 400, "Nội dung phải dùng UTF-8 hợp lệ."); }
  } finally {
    if (timer) clearTimeout(timer);
    void reader.cancel().catch(() => undefined);
  }
}

export async function readNutritionJson(request: Request, maxBytes = 1_048_576): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new NutritionSecurityError("unsupported_media_type", 415, "Yêu cầu phải là application/json.");
  const text = await readNutritionText(request, maxBytes);
  try { return JSON.parse(text); } catch { throw new NutritionSecurityError("invalid_request", 400, "JSON không hợp lệ."); }
}

export async function readNutritionForm(request: Request, maxBytes = 8192): Promise<URLSearchParams> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/x-www-form-urlencoded") throw new NutritionSecurityError("unsupported_media_type", 415);
  return new URLSearchParams(await readNutritionText(request, maxBytes));
}
