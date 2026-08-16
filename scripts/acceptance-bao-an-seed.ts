import { randomBytes, scryptSync } from "node:crypto";
import { prisma } from "../src/lib/prisma";

const password = "Acceptance-Only-2026";
function passwordHash(value: string) {
  const salt = randomBytes(16);
  const derived = scryptSync(value, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

async function main() {
const hash = passwordHash(password);
const users = await Promise.all([
  prisma.user.create({ data: { email: "doctor.a@acceptance.test", displayName: "Bác sĩ Khoa A", passwordHash: hash, role: "CLINICIAN" } }),
  prisma.user.create({ data: { email: "doctor.b@acceptance.test", displayName: "Bác sĩ Khoa B", passwordHash: hash, role: "CLINICIAN" } }),
  prisma.user.create({ data: { email: "nurse.a@acceptance.test", displayName: "Điều dưỡng Khoa A", passwordHash: hash, role: "DEPARTMENT_STAFF" } }),
  prisma.user.create({ data: { email: "nurse.b@acceptance.test", displayName: "Điều dưỡng Khoa B", passwordHash: hash, role: "DEPARTMENT_STAFF" } }),
  prisma.user.create({ data: { email: "kitchen@acceptance.test", displayName: "Nhân viên bếp", passwordHash: hash, role: "KITCHEN_STAFF" } }),
  prisma.user.create({ data: { email: "dietitian@acceptance.test", displayName: "Dinh dưỡng", passwordHash: hash, role: "DIETITIAN" } }),
]);
const [doctorA, doctorB, nurseA, nurseB] = users;

const departmentA = await prisma.department.create({ data: { code: "TEST-A", name: "Khoa Nội nghiệm thu", publicToken: "acceptance-khoa-a", sortOrder: 1 } });
const departmentB = await prisma.department.create({ data: { code: "TEST-B", name: "Khoa Ngoại nghiệm thu", publicToken: "acceptance-khoa-b", sortOrder: 2 } });
await prisma.departmentMembership.createMany({ data: [
  { userId: doctorA.id, departmentId: departmentA.id },
  { userId: nurseA.id, departmentId: departmentA.id },
  { userId: doctorB.id, departmentId: departmentB.id },
  { userId: nurseB.id, departmentId: departmentB.id },
] });

const breakfast = await prisma.mealType.create({ data: { code: "TEST-SANG", name: "Bữa sáng nghiệm thu", serviceLocalTime: "07:00", cutoffLocalTime: "23:59", cutoffDaysBefore: 0 } });
const normal = await prisma.kitchenDietType.create({ data: { code: "TEST-THUONG", name: "Ăn thường nghiệm thu", sortOrder: 1 } });
const soft = await prisma.kitchenDietType.create({ data: { code: "TEST-MEM", name: "Ăn mềm nghiệm thu", sortOrder: 2 } });
await prisma.kitchenMenu.create({ data: {
  mealDate: new Date("2026-08-16T00:00:00.000Z"), mealTypeId: breakfast.id, status: "APPROVED", title: "Thực đơn nghiệm thu",
  items: { create: [
    { dietTypeId: normal.id, dishName: "Cơm · cá kho · canh rau", sortOrder: 0 },
    { dietTypeId: soft.id, dishName: "Cháo thịt bằm", sortOrder: 1 },
  ] },
} });

console.log(JSON.stringify({
  password,
  date: "2026-08-17",
  departmentA: departmentA.id,
  departmentB: departmentB.id,
  publicTokenA: departmentA.publicToken,
  mealTypeId: breakfast.id,
  normalDietId: normal.id,
  softDietId: soft.id,
  users: Object.fromEntries(users.map((user) => [user.email, user.id])),
}, null, 2));

await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
