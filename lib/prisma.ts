import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

if (process.env.NODE_ENV === "development" && typeof process.env.DATABASE_URL === "string") {
  try {
    const masked = process.env.DATABASE_URL.replace(/:([^:@/]+)@/, ":***@");
    const u = new URL(masked.replace(/^postgresql:/i, "http:"));
    console.info("[prisma] DATABASE_URL host:", u.hostname, "port:", u.port || "(default)");
  } catch {
    console.warn("[prisma] DATABASE_URL is set but could not be parsed for logging.");
  }
} else if (!process.env.DATABASE_URL) {
  console.warn("[prisma] DATABASE_URL is not set — Prisma queries will fail.");
}
