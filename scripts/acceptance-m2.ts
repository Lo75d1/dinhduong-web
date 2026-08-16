import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";

const base = process.env.ACCEPTANCE_BASE_URL ?? "http://127.0.0.1:3102";
const password = "Acceptance-Only-2026";
const date = "2026-08-17";

type Session = { cookie: string };
type ApiBody = { error?: unknown; item?: { id: string; status?: string }; [key: string]: unknown };
type Context = {
  departments: Array<{ id: string; code: string }>;
  mealTypes: Array<{ id: string; code: string }>;
  dietTypes: Array<{ id: string; code: string }>;
  menus: Array<{ id: string; mealTypeId: string; status: string; items: Array<{ dishId: string | null; servingWeightG: number | null; dishName: string }> }>;
  shoppingLists: Array<{
    menuId: string;
    items: Array<{ foodId: string; foodName: string; edibleGrams: number; rawGrams: number | null; wastePercent: number | null }>;
    incomplete: Array<{ menuItemId: string; dishName: string; reason: string }>;
  }>;
};

async function login(email: string): Promise<Session> {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200, `Login failed for ${email}: ${await response.text()}`);
  const cookie = response.headers.get("set-cookie")?.split(";")[0] ?? "";
  assert.ok(cookie.includes("dinhduong_session="));
  return { cookie };
}

async function post(session: Session, body: Record<string, unknown>) {
  const response = await fetch(`${base}/api/meal-operations`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: session.cookie },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() as ApiBody };
}

async function context(session: Session): Promise<Context> {
  const response = await fetch(`${base}/api/meal-operations?date=${date}`, {
    headers: { cookie: session.cookie },
  });
  if (response.status !== 200) {
    assert.fail(`Context failed (${response.status}): ${await response.text()}`);
  }
  return response.json() as Promise<Context>;
}

function pass(id: number, label: string, detail: string) {
  console.log(`PASS ${id}/6 — ${label}: ${detail}`);
}

async function main() {
  const dietitian = await login("dietitian@acceptance.test");
  const nurse = await login("nurse.a@acceptance.test");
  const kitchen = await login("kitchen@acceptance.test");
  const dietContext = await context(dietitian);
  const department = dietContext.departments.find((item) => item.code === "TEST-A");
  const breakfast = dietContext.mealTypes.find((item) => item.code === "TEST-SANG");
  const lunch = dietContext.mealTypes.find((item) => item.code === "TEST-TRUA-M2");
  const normal = dietContext.dietTypes.find((item) => item.code === "TEST-THUONG");
  assert.ok(department && breakfast && lunch && normal, "Acceptance base seed is incomplete");
  const completeDish = await prisma.dish.findFirstOrThrow({ where: { sourceCode: "M2-COMPLETE" } });
  const incompleteDish = await prisma.dish.findFirstOrThrow({ where: { sourceCode: "M2-INCOMPLETE" } });

  const saved = await post(dietitian, {
    action: "saveMenu",
    mealDate: date,
    mealTypeId: breakfast.id,
    title: "Thực đơn cấu trúc M2 nghiệm thu",
    items: [
      { dietTypeId: normal.id, dishId: completeDish.id, servingWeightG: 200 },
      { dietTypeId: normal.id, dishId: incompleteDish.id, servingWeightG: 150 },
    ],
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.ok(saved.body.item);
  const savedMenu = (await context(dietitian)).menus.find((menu) => menu.id === saved.body.item?.id);
  assert.equal(savedMenu?.status, "DRAFT");
  assert.deepEqual(savedMenu?.items.map((item) => [item.dishId, item.servingWeightG]), [
    [completeDish.id, 200],
    [incompleteDish.id, 150],
  ]);
  pass(1, "Soạn thực đơn cấu trúc", "DIETITIAN chọn Dish từ kho và lưu gram/suất; menu ở trạng thái DRAFT.");

  assert.equal((await context(kitchen)).menus.some((menu) => menu.id === saved.body.item?.id), false);
  pass(2, "Ẩn bản nháp với bếp", "KITCHEN_STAFF không nhận menu DRAFT trong operationsContext.");

  const approved = await post(dietitian, { action: "approveMenu", id: saved.body.item.id });
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal(approved.body.item?.status, "APPROVED");

  const submitted = await post(nurse, {
    action: "submitOrder",
    departmentId: department.id,
    mealTypeId: breakfast.id,
    mealDate: date,
    requestKey: crypto.randomUUID(),
    note: "Nghiệm thu M2 — số suất giả",
    items: [{ dietTypeId: normal.id, quantity: 10 }],
  });
  assert.equal(submitted.status, 201, JSON.stringify(submitted.body));
  const kitchenAfterApproval = await context(kitchen);
  const visibleMenu = kitchenAfterApproval.menus.find((menu) => menu.id === saved.body.item?.id);
  assert.equal(visibleMenu?.status, "APPROVED");
  const shopping = kitchenAfterApproval.shoppingLists.find((list) => list.menuId === saved.body.item?.id);
  assert.ok(shopping);
  const fish = shopping.items.find((item) => item.foodName === "Cá tươi M2 nghiệm thu");
  const sauce = shopping.items.find((item) => item.foodName === "Nước mắm M2 nghiệm thu");
  assert.equal(fish?.edibleGrams, 1500);
  assert.equal(fish?.rawGrams, 1875);
  assert.equal(fish?.wastePercent, 20);
  assert.equal(sauce?.edibleGrams, 100);
  assert.equal(sauce?.rawGrams, null);
  assert.equal(sauce?.wastePercent, null);
  pass(3, "Duyệt và tính bảng đi chợ", "10 suất × công thức scale 200/400: cá sống sạch 1.500 g, mua 1.875 g; nước mắm 100 g và mua=— do thiếu % thải bỏ.");

  assert.ok(shopping.incomplete.some((item) => item.reason.includes("chưa đủ liên kết/định lượng")));
  assert.equal(shopping.items.some((item) => item.foodName.includes("Rau chưa nối")), false);
  pass(4, "Không đoán dữ liệu thiếu", "Nguyên liệu thiếu liên kết/gram vào khối cảnh báo và không sinh số lượng giả.");

  const draftLunch = await post(dietitian, {
    action: "saveMenu",
    mealDate: date,
    mealTypeId: lunch.id,
    title: "Menu DRAFT không được lộ cho bếp",
    items: [{ dietTypeId: normal.id, dishId: completeDish.id, servingWeightG: 200 }],
  });
  assert.equal(draftLunch.status, 200, JSON.stringify(draftLunch.body));
  assert.equal((await context(kitchen)).menus.some((menu) => menu.id === draftLunch.body.item?.id), false);
  pass(5, "Phân quyền menu", "Bếp thấy menu APPROVED nhưng không thấy menu DRAFT cùng ngày.");

  const publicResponse = await fetch(`${base}/thuc-don/acceptance-khoa-a`);
  assert.equal(publicResponse.status, 200);
  const html = await publicResponse.text();
  assert.match(html, /Cơm|cá kho|canh rau/i);
  const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'kitchen_menu_items'
  `;
  const names = columns.map((column) => column.column_name);
  assert.ok(names.includes("dishId") && names.includes("servingWeightG"));
  pass(6, "Tương thích M1 và migration", "Trang bệnh nhân vẫn render dishName cũ; hai cột M2 tồn tại sau migration.");

  console.log("M2_ACCEPTANCE_RESULT=6/6 PASS");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
