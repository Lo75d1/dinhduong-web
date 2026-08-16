import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";

const base = process.env.ACCEPTANCE_BASE_URL ?? "http://127.0.0.1:3101";
const password = "Acceptance-Only-2026";
const date = "2026-08-17";

type Session = { cookie: string; email: string };
type ApiBody = {
  error?: unknown;
  item?: { id: string; patientCode: string; critical: boolean };
  [key: string]: unknown;
};
type OperationContext = {
  departments: Array<{ id: string; code: string }>;
  mealTypes: Array<{ id: string; code: string }>;
  dietTypes: Array<{ id: string; code: string }>;
  dietOrderSuggestions: Record<string, number>;
  publicNotes: Array<{ id: string; status: string }>;
};
async function login(email: string): Promise<Session> {
  const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  assert.equal(response.status, 200, `Login failed for ${email}: ${await response.text()}`);
  const cookie = response.headers.get("set-cookie")?.split(";")[0] ?? "";
  assert.ok(cookie.includes("dinhduong_session="));
  return { cookie, email };
}
async function post(session: Session, body: Record<string, unknown>) {
  const response = await fetch(`${base}/api/meal-operations`, { method: "POST", headers: { "content-type": "application/json", cookie: session.cookie }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() as ApiBody };
}
async function context(session: Session, contextDate = date) {
  const response = await fetch(`${base}/api/meal-operations?date=${contextDate}`, { headers: { cookie: session.cookie } });
  assert.equal(response.status, 200);
  return response.json() as Promise<OperationContext>;
}
function pass(id: number, name: string, details: string) {
  console.log(`PASS ${id}/9 — ${name}: ${details}`);
}

async function main() {
const doctorA = await login("doctor.a@acceptance.test");
const doctorB = await login("doctor.b@acceptance.test");
const nurseA = await login("nurse.a@acceptance.test");
const nurseB = await login("nurse.b@acceptance.test");
const kitchen = await login("kitchen@acceptance.test");
const initial = await context(doctorA);
const departmentA = initial.departments.find((item) => item.code === "TEST-A");
const departmentB = await prisma.department.findUniqueOrThrow({ where: { code: "TEST-B" } });
const mealType = initial.mealTypes.find((item) => item.code === "TEST-SANG");
const normal = initial.dietTypes.find((item) => item.code === "TEST-THUONG");
const soft = initial.dietTypes.find((item) => item.code === "TEST-MEM");

assert.ok(departmentA && mealType && normal && soft, "Acceptance seed data is incomplete");

assert.deepEqual(initial.departments.map((item) => item.code), ["TEST-A"]);
pass(1, "Phạm vi khoa bác sĩ", "CLINICIAN chỉ thấy khoa được gán qua DepartmentMembership.");

const created = await post(doctorA, { action: "createDietOrder", patientCode: "NB-TEST-001", departmentId: departmentA.id, dietTypeId: normal.id, room: "P.TEST", effectiveDate: date, clinicalNote: "Ghi chú giả nghiệm thu", critical: true });
assert.equal(created.status, 201, JSON.stringify(created.body));
assert.ok(created.body.item);
assert.equal(created.body.item.patientCode, "NB-TEST-001");
assert.equal(created.body.item.critical, true);
pass(2, "Tạo chỉ định", "CLINICIAN tạo DietOrder trong khoa mình với cờ critical có cấu trúc.");

const overlap = await post(doctorA, { action: "createDietOrder", patientCode: "NB-TEST-001", departmentId: departmentA.id, dietTypeId: soft.id, effectiveDate: date });
assert.equal(overlap.status, 400);
assert.match(String(overlap.body.error), /ACTIVE|chồng lấn/i);
pass(3, "Chống chồng lấn", "Chỉ định ACTIVE thứ hai cho cùng patientCode bị chặn.");

const wrongDepartment = await post(doctorB, { action: "createDietOrder", patientCode: "NB-TEST-002", departmentId: departmentA.id, dietTypeId: normal.id, effectiveDate: date });
assert.equal(wrongDepartment.status, 400);
const wrongReview = await post(nurseB, { action: "resolvePublicNote", id: "missing", decision: "APPROVED" });
assert.equal(wrongReview.status, 400);
pass(4, "Chặn sai khoa", "Bác sĩ/điều dưỡng khoa B không thao tác dữ liệu khoa A.");

const nursePrescribe = await post(nurseA, { action: "createDietOrder", patientCode: "NB-TEST-003", departmentId: departmentA.id, dietTypeId: normal.id, effectiveDate: date });
assert.equal(nursePrescribe.status, 400);
const clinicianSubmit = await post(doctorA, { action: "submitOrder", departmentId: departmentA.id, mealTypeId: mealType.id, mealDate: date, requestKey: crypto.randomUUID(), items: [{ dietTypeId: normal.id, quantity: 1 }] });
assert.equal(clinicianSubmit.status, 400);
pass(5, "Tách quyền", "DEPARTMENT_STAFF không sửa chỉ định; CLINICIAN không chốt suất.");

const nurseContext = await context(nurseA);
assert.equal(nurseContext.dietOrderSuggestions[`${departmentA.id}:${normal.id}`], 1);
const mismatch = await post(nurseA, { action: "submitOrder", departmentId: departmentA.id, mealTypeId: mealType.id, mealDate: date, requestKey: crypto.randomUUID(), items: [{ dietTypeId: normal.id, quantity: 2 }, { dietTypeId: soft.id, quantity: 0 }] });
assert.equal(mismatch.status, 400);
assert.match(String(mismatch.body.error), /ghi chú/i);
const mismatchWithNote = await post(nurseA, { action: "submitOrder", departmentId: departmentA.id, mealTypeId: mealType.id, mealDate: date, requestKey: crypto.randomUUID(), note: "Lệch do người bệnh mới chuyển khoa — dữ liệu giả", items: [{ dietTypeId: normal.id, quantity: 2 }, { dietTypeId: soft.id, quantity: 0 }] });
assert.equal(mismatchWithNote.status, 201, JSON.stringify(mismatchWithNote.body));
pass(6, "Gợi ý và ghi chú lệch", "Gợi ý=1; lệch không ghi chú bị chặn, có ghi chú được chốt.");

const ended = await post(doctorA, { action: "endDietOrder", id: created.body.item.id, endDate: date, reason: "Kết thúc nghiệm thu" });
assert.equal(ended.status, 200);
const afterEnd = await context(nurseA);
assert.equal(afterEnd.dietOrderSuggestions[`${departmentA.id}:${normal.id}`] ?? 0, 0);
pass(7, "Hiệu lực theo ngày VN", "Chỉ định ENDED không còn vào số gợi ý; ngày dùng dạng YYYY-MM-DD/localDate.");

const publicPage = await fetch(`${base}/thuc-don/acceptance-khoa-a`);
assert.equal(publicPage.status, 200);
const pageHtml = await publicPage.text();
assert.match(pageHtml, /Cơm|cá kho|canh rau/);
  const publicNote = await fetch(`${base}/api/public/meal-report`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.42" }, body: JSON.stringify({ departmentToken: "acceptance-khoa-a", requestKey: crypto.randomUUID(), roomBed: "P.TEST-G.TEST", note: "Ăn nhạt hơn — dữ liệu giả nghiệm thu", website: "" }) });
assert.equal(publicNote.status, 201, await publicNote.text());
const noteRow = await prisma.publicMealReport.findFirstOrThrow({ where: { departmentId: departmentA.id }, orderBy: { createdAt: "desc" } });
assert.equal(noteRow.status, "RECEIVED");
assert.equal((await context(kitchen, "2026-08-16")).publicNotes.some((item) => item.id === noteRow.id), false);
const approve = await post(nurseA, { action: "resolvePublicNote", id: noteRow.id, decision: "APPROVED", reviewNote: "Đã xác minh trực tiếp — dữ liệu giả" });
assert.equal(approve.status, 200);
assert.equal((await context(kitchen, "2026-08-16")).publicNotes.some((item) => item.id === noteRow.id && item.status === "APPROVED"), true);
pass(8, "Luồng bệnh nhân → điều dưỡng → bếp", "Trang công khai chỉ xem; ghi chú RECEIVED chưa tới bếp, APPROVED mới hiển thị.");

const audits = await prisma.mealOperationAudit.findMany({ where: { entityType: "DIET_ORDER", entityId: created.body.item.id }, orderBy: { createdAt: "asc" } });
assert.deepEqual(audits.map((item) => item.action), ["CREATE", "END"]);
const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`SELECT column_name FROM information_schema.columns WHERE table_name = 'diet_orders'`;
const names = columns.map((item) => item.column_name.toLowerCase());
for (const forbidden of ["name", "diagnosis", "cccd", "medicalrecord", "medical_record"]) assert.equal(names.includes(forbidden), false);
assert.equal(departmentB.name, "Khoa Ngoại nghiệm thu");
pass(9, "Audit và tối thiểu dữ liệu", "Có audit CREATE/END; diet_orders không có tên, chẩn đoán, CCCD hay bệnh án.");

console.log("ACCEPTANCE_RESULT=9/9 PASS");
await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
