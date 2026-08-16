import { requireSessionUser, unauthorizedResponse } from "@/lib/auth";
import { audit, requireManager } from "@/lib/meal-operations";
import {
  mealPhotoPath,
  mealPhotoPublicUrl,
  uploadMealPhoto,
  validateMealPhoto,
} from "@/lib/meal-photo-storage";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      return Response.json({ error: "Nguồn gửi yêu cầu không hợp lệ." }, { status: 403 });
    const user = await requireSessionUser();
    requireManager(user, ["DIETITIAN", "KITCHEN_MANAGER", "KITCHEN_STAFF"]);
    const form = await request.formData();
    const itemId = String(form.get("itemId") ?? "").trim();
    const file = form.get("photo");
    if (!itemId || !(file instanceof File)) throw new Error("Cần chọn ảnh đối chứng.");
    const extension = validateMealPhoto(file);
    const item = await prisma.kitchenMenuItem.findUnique({
      where: { id: itemId },
      include: { menu: { select: { mealDate: true, mealTypeId: true } } },
    });
    if (!item?.approvedAt) throw new Error("Chỉ được tải ảnh cho thực đơn đã duyệt.");
    const storagePath = mealPhotoPath({
      mealDate: item.menu.mealDate,
      mealTypeId: item.menu.mealTypeId,
      dietTypeId: item.dietTypeId,
      extension,
    });
    await uploadMealPhoto(storagePath, file);
    const saved = await prisma.kitchenMenuItem.update({
      where: { id: item.id },
      data: {
        photoStoragePath: storagePath,
        photoUploadedById: user.id,
        photoUploadedAt: new Date(),
      },
    });
    await audit({
      entityType: "KITCHEN_MENU_ITEM",
      entityId: item.id,
      action: "PHOTO_UPLOAD",
      user,
      before: { photoStoragePath: item.photoStoragePath },
      after: { photoStoragePath: saved.photoStoragePath },
      reason: "Tải ảnh đối chứng suất ăn",
    });
    return Response.json({
      item: { id: saved.id, photoUrl: mealPhotoPublicUrl(saved.photoStoragePath) },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return unauthorizedResponse();
    return Response.json({ error: error instanceof Error ? error.message : "Chưa thể tải ảnh đối chứng." }, { status: 400 });
  }
}
