/**
 * Quick DB check: loads DATABASE_URL from env, runs SELECT 1 and touches `users`.
 * Usage: `DATABASE_URL="postgresql://..." node scripts/db-probe.mjs`
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  await prisma.$queryRaw`SELECT 1 AS ok`;
  console.log("[db-probe] SELECT 1 succeeded");
  await prisma.user.findFirst({ take: 1, select: { id: true } });
  console.log("[db-probe] prisma.user.findFirst({ select: { id: true } }) succeeded");
} catch (e) {
  console.error("[db-probe] FAILED:", e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
