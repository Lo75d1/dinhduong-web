import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

/**
 * Lớp chặn chỉ dành cho kiểm tra nội bộ. Mặc định bị tắt để tránh vô tình
 * công khai bằng mật khẩu mẫu. Website chính thức phải dùng phiên ADMIN.
 */
export function hasPreviewAdminAccess(request: NextRequest) {
  const password = process.env.ADMIN_PREVIEW_PASSWORD;
  const supplied = request.headers.get("x-admin-preview-pass");
  if (process.env.ENABLE_PREVIEW_ADMIN !== "true" || !password || password.length < 12 || !supplied) return false;
  const expectedBuffer = Buffer.from(password);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export function previewAdminDenied() {
  return Response.json({ error: "Khu kiểm tra nội bộ chưa được bật hoặc thông tin truy cập không hợp lệ." }, { status: 401 });
}
