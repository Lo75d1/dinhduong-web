import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";

// Harness nghiệm thu chiếu aggregate JSON động từ API/Prisma để assert nhiều tầng relation.
/* eslint-disable @typescript-eslint/no-explicit-any */

const base = process.env.ACCEPTANCE_BASE_URL ?? "http://127.0.0.1:3102";
const password = "Acceptance-Only-2026";
const mealDate = "2026-08-18";
const today = "2026-08-16";

async function login(email: string) {
  const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  assert.equal(response.status, 200, `Không đăng nhập được ${email}: ${await response.text()}`);
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}
async function post(cookie: string, url: string, body: unknown) {
  const response = await fetch(`${base}${url}`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}
async function context(cookie: string) {
  const response = await fetch(`${base}/api/meal-operations?date=${mealDate}`, { headers: { cookie } });
  if (!response.ok) throw new Error(`Context ${response.status}: ${await response.text()}`);
  return response.json() as Promise<Record<string, any>>;
}
function pass(id: number, text: string) { console.log(`PASS ${id}/8 — ${text}`); }

async function main() {
  const [departmentA, departmentB, dietitian, nurseA, nurseB] = await Promise.all([
    prisma.department.findUniqueOrThrow({ where: { code: "TEST-A" } }),
    prisma.department.findUniqueOrThrow({ where: { code: "TEST-B" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "dietitian@acceptance.test" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "nurse.a@acceptance.test" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "nurse.b@acceptance.test" } }),
  ]);
  const mealType = await prisma.mealType.upsert({ where: { code: "TEST-M2" }, update: { name: "Bữa M2 nghiệm thu", status: "ACTIVE" }, create: { code: "TEST-M2", name: "Bữa M2 nghiệm thu", serviceLocalTime: "11:30", cutoffLocalTime: "09:00", cutoffDaysBefore: 0, status: "ACTIVE", sortOrder: 90 } });
  const dietA = await prisma.kitchenDietType.upsert({ where: { code: "TEST-M2-A" }, update: { name: "M2 Cơm thường", status: "ACTIVE" }, create: { code: "TEST-M2-A", name: "M2 Cơm thường", status: "ACTIVE", sortOrder: 90 } });
  const dietB = await prisma.kitchenDietType.upsert({ where: { code: "TEST-M2-B" }, update: { name: "M2 Chưa duyệt", status: "ACTIVE" }, create: { code: "TEST-M2-B", name: "M2 Chưa duyệt", status: "ACTIVE", sortOrder: 91 } });
  await prisma.mealOrder.deleteMany({ where: { mealDate: new Date(`${mealDate}T00:00:00.000Z`), mealTypeId: mealType.id } });
  await prisma.kitchenMenu.deleteMany({ where: { mealTypeId: mealType.id, mealDate: { in: [new Date(`${mealDate}T00:00:00.000Z`), new Date(`${today}T00:00:00.000Z`)] } } });

  const dietitianCookie = await login("dietitian@acceptance.test");
  const nurseACookie = await login("nurse.a@acceptance.test");
  const nurseBCookie = await login("nurse.b@acceptance.test");
  const kitchenCookie = await login("kitchen@acceptance.test");

  const v1 = { dishes: [{ dish: "Cá kho M2", foods: [{ foodId: "m2-fish", foodName: "Cá lóc M2", gramsPerServing: 80, wastePercent: 20 }] }] };
  const approved1 = await post(dietitianCookie, "/api/kitchen-menu/approve", { mealDate, dietTypeId: dietA.id, meals: [{ mealTypeId: mealType.id, snapshot: v1 }] });
  assert.equal(approved1.status, 200, JSON.stringify(approved1.body));
  const menu = await prisma.kitchenMenu.findUniqueOrThrow({ where: { mealDate_mealTypeId: { mealDate: new Date(`${mealDate}T00:00:00.000Z`), mealTypeId: mealType.id } } });
  const itemA1 = await prisma.kitchenMenuItem.findFirstOrThrow({ where: { menuId: menu.id, dietTypeId: dietA.id } });
  assert.ok(itemA1.approvedAt && itemA1.approvedById === dietitian.id);
  assert.deepEqual(itemA1.snapshotJson, v1);
  pass(1, "Duyệt ngày × chế độ ghi approvedAt/approvedById và đóng băng snapshotJson.");

  const itemB = await prisma.kitchenMenuItem.create({ data: { menuId: menu.id, dietTypeId: dietB.id, dishName: "Món B chưa duyệt", snapshotJson: { dishes: [{ dish: "Món B", foods: [{ foodId: "m2-b", foodName: "Thực phẩm B", gramsPerServing: 999, wastePercent: 0 }] }] } } });
  const v2 = { dishes: [{ dish: "Cá kho M2 điều chỉnh", foods: [{ foodId: "m2-fish", foodName: "Cá lóc M2", gramsPerServing: 100, wastePercent: 20 }, { foodId: "m2-salt", foodName: "Muối M2", gramsPerServing: 2, wastePercent: null }] }, { dish: "Canh thiếu gram", foods: [] }] };
  const approved2 = await post(dietitianCookie, "/api/kitchen-menu/approve", { mealDate, dietTypeId: dietA.id, meals: [{ mealTypeId: mealType.id, snapshot: v2 }] });
  assert.equal(approved2.status, 200, JSON.stringify(approved2.body));
  const [itemA2, itemBAfter] = await Promise.all([prisma.kitchenMenuItem.findUniqueOrThrow({ where: { id: itemA1.id } }), prisma.kitchenMenuItem.findUniqueOrThrow({ where: { id: itemB.id } })]);
  assert.deepEqual(itemA2.snapshotJson, v2);
  assert.equal(itemBAfter.approvedAt, null);
  assert.equal(itemBAfter.snapshotJson && (itemBAfter.snapshotJson as any).dishes[0].foods[0].gramsPerServing, 999);
  pass(2, "Duyệt lại A ghi đè đúng A; không thay snapshot/trạng thái B cùng bữa.");

  for (const [cookie, departmentId, a, b] of [[nurseACookie, departmentA.id, 2, 3], [nurseBCookie, departmentB.id, 4, 1]] as const) {
    const result = await post(cookie, "/api/meal-operations", { action: "submitOrder", departmentId, mealTypeId: mealType.id, mealDate, requestKey: crypto.randomUUID(), note: "Dữ liệu giả nghiệm thu M2", items: [{ dietTypeId: dietA.id, quantity: a }, { dietTypeId: dietB.id, quantity: b }] });
    assert.equal(result.status, 201, JSON.stringify(result.body));
  }
  const kitchen = await context(kitchenCookie);
  const shopping = kitchen.shoppingLists.find((row: any) => row.mealType.id === mealType.id);
  assert.ok(shopping);
  const fish = shopping.items.find((row: any) => row.foodId === "m2-fish");
  const salt = shopping.items.find((row: any) => row.foodId === "m2-salt");
  assert.equal(fish.edibleGrams, 600);
  assert.equal(fish.rawGrams, 750);
  assert.equal(salt.edibleGrams, 12);
  assert.equal(salt.rawGrams, null);
  pass(3, "Đi chợ cộng 2+4 suất toàn viện: cá 600 g sống sạch, 750 g mua; thiếu % thải bỏ để —.");
  assert.ok(shopping.incomplete.some((row: any) => String(row.reason).includes("chưa có thực đơn")));
  assert.ok(shopping.incomplete.some((row: any) => String(row.reason).includes("chưa có thực phẩm/gram")));
  assert.equal(shopping.items.some((row: any) => row.foodId === "m2-b"), false);
  pass(4, "Chế độ có suất nhưng chưa duyệt và món thiếu gram đều cảnh báo, không tính số đoán.");

  const visibleMenu = kitchen.menus.find((row: any) => row.id === menu.id);
  assert.deepEqual(visibleMenu.items.map((row: any) => row.dietTypeId), [dietA.id]);
  pass(5, "KITCHEN_STAFF chỉ nhận item approvedAt khác null.");

  const publicMenu = await prisma.kitchenMenu.create({ data: { mealDate: new Date(`${today}T00:00:00.000Z`), mealTypeId: mealType.id, status: "APPROVED", title: "M2 patient", items: { create: [{ dietTypeId: dietA.id, dishName: "M2 món đã duyệt", snapshotJson: v2, approvedAt: new Date(), approvedById: dietitian.id }, { dietTypeId: dietB.id, dishName: "M2 món chưa duyệt", snapshotJson: v1 }] } } });
  await prisma.mealOrder.deleteMany({ where: { mealDate: new Date(`${today}T00:00:00.000Z`), mealTypeId: mealType.id } });
  await Promise.all([[departmentA.id, nurseA.id, 2, 3], [departmentB.id, nurseB.id, 4, 1]].map(([departmentId, submittedById, a, b], index) => prisma.mealOrder.create({ data: { publicCode: `M2-SCREEN-${index}`, departmentId: String(departmentId), mealDate: new Date(`${today}T00:00:00.000Z`), mealTypeId: mealType.id, status: "SUBMITTED", submittedById: String(submittedById), submittedAt: new Date(), lastRequestKey: crypto.randomUUID(), items: { create: [{ dietTypeId: dietA.id, quantity: Number(a) }, { dietTypeId: dietB.id, quantity: Number(b) }] } } })));
  const page = await fetch(`${base}/thuc-don/acceptance-khoa-a`);
  const html = await page.text();
  assert.equal(page.status, 200);
  assert.match(html, /M2 món đã duyệt/);
  assert.doesNotMatch(html, /M2 món chưa duyệt/);
  pass(6, "Trang bệnh nhân chỉ hiện item được duyệt.");

  const audits = await prisma.mealOperationAudit.findMany({ where: { entityType: "KITCHEN_MENU_ITEM", entityId: itemA1.id, action: "APPROVE" } });
  assert.equal(audits.length, 2);
  assert.equal(publicMenu.status, "APPROVED");
  pass(7, "Duyệt và duyệt lại đều có audit ở item; KitchenMenu.status chỉ là trạng thái hiển thị.");

  const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`SELECT column_name FROM information_schema.columns WHERE table_name = 'kitchen_menu_items'`;
  for (const expected of ["snapshotJson", "approvedAt", "approvedById"]) assert.ok(columns.some((row) => row.column_name === expected));
  pass(8, "Migration M2 có đủ snapshotJson/approvedAt/approvedById trên DB thử cô lập.");
  console.log("ACCEPTANCE_M2_RESULT=8/8 PASS");
  await prisma.$disconnect();
}

main().catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exitCode = 1; });
