import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // RSC and route bundles share this pool on the small VPS instead of opening
    // independent default-size pools when the account snapshot runs parallel reads.
    max: 3,
    connectionTimeoutMillis: 10_000,
    ssl: process.env.DATABASE_SSL === "disable" ? false : { rejectUnauthorized: false },
  }) });

globalForPrisma.prisma = prisma;
