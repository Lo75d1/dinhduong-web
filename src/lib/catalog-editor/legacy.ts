import { requireDataEditor } from "@/lib/admin-permissions";
export async function retiredCatalogWrite() {
  try {
    await requireDataEditor();
    return Response.json(
      {
        error:
          "Đường ghi trực tiếp đã đóng. Soạn đề xuất trong cổng biên tập và chờ quản trị viên duyệt.",
        editorUrl: "/quan-tri/bien-tap",
      },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      { error: "Cần tài khoản có quyền biên tập." },
      {
        status:
          error instanceof Error && error.message === "UNAUTHORIZED"
            ? 401
            : 403,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
