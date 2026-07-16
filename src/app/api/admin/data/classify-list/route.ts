import { prisma } from "@/lib/prisma";
import { requireDataEditor } from "@/lib/admin-permissions";
import { unauthorizedResponse } from "@/lib/auth";

// Toàn bộ thực phẩm cho trang sửa phân loại hàng loạt — tải hết 1 lần (cùng
// quy mô với ImageSourceSync đã tải 6192 dòng RNI client-side), lọc/chọn ở
// trình duyệt để không cần thao tác từng dòng một như DataManager cũ.
const select = {
  id: true, name: true, source: true, foodType: true, foodGroup: true,
  proteinOrigin: true, giLevel: true, purinLevel: true, cholesterolLevel: true,
};

export async function GET() {
  try {
    await requireDataEditor();
    const items = await prisma.food.findMany({ orderBy: { name: "asc" }, select });
    return Response.json({ items });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: "Không có quyền biên tập dữ liệu." }, { status: 403 });
  }
}
