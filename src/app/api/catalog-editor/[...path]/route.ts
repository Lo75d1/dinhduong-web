import { authenticateCatalog } from "@/lib/catalog-editor/auth";
import {
  catalogBatchAction,
  catalogKeys,
  createCatalogBatch,
  listCatalogBatches,
  listCatalogFoods,
  readCatalogBatch,
  saveCatalogBatch,
} from "@/lib/catalog-editor/service";
import { CatalogError, fail, id, object } from "@/lib/catalog-editor/policy";
import { catalogWorkflow } from "@/lib/catalog-editor/workflow";
import { readNutritionJson } from "@/lib/nutrition-chat/http";
import { NutritionSecurityError } from "@/lib/nutrition-chat/oauth-validation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
function reply(data: unknown, status = 200, retryAfter?: number) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
    },
  });
}
async function handle(request: Request, context: Context) {
  try {
    const { path } = await context.params;
    const actor = await authenticateCatalog(request, path[0] === "keys");
    const [area, target, action] = path;
    if (request.method === "GET") {
      if (path.length === 1 && area === "workflow")
        return reply(catalogWorkflow());
      if (path.length === 1 && area === "foods")
        return reply(
          await listCatalogFoods(actor, new URL(request.url).searchParams),
        );
      if (path.length === 1 && area === "batches")
        return reply(
          await listCatalogBatches(actor, new URL(request.url).searchParams),
        );
      if (path.length === 2 && area === "batches")
        return reply(await readCatalogBatch(actor, id(target)));
      if (path.length === 1 && area === "keys")
        return reply({ items: await catalogKeys(actor) });
    } else {
      const body = await readNutritionJson(request, 262144);
      if (area === "batches") {
        if (request.method === "POST" && path.length === 1)
          return reply({ batch: await createCatalogBatch(actor, body) }, 201);
        if (request.method === "PATCH" && path.length === 2)
          return reply({
            batch: await saveCatalogBatch(actor, id(target), body),
          });
        if (request.method === "POST" && path.length === 3)
          return reply({
            batch: await catalogBatchAction(actor, id(target), action, body),
          });
      }
      if (area === "keys" && request.method === "POST") {
        if (path.length === 1)
          return reply(await catalogKeys(actor, "create", body), 201);
        if (path.length === 3 && action === "revoke") {
          object(body, []);
          return reply({
            key: await catalogKeys(actor, "revoke", { id: id(target) }),
          });
        }
      }
    }
    fail("Không có đường dẫn hoặc thao tác này.", 404);
  } catch (error) {
    if (error instanceof CatalogError)
      return reply({ error: error.message }, error.status);
    if (error instanceof NutritionSecurityError)
      return reply(
        { error: error.description },
        error.status,
        error.retryAfter,
      );
    return reply(
      {
        error:
          "Cổng biên tập tạm thời chưa xử lý được. Bản nháp và kho chính được giữ nguyên; thử tải lại.",
      },
      503,
    );
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
// No DELETE, PUT or SQL endpoint. Next returns 405 for unsupported methods.
