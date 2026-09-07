import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATABASE_TIMEOUT_MS = 5_000;

async function checkDatabase(): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Database health check timed out")),
          DATABASE_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function GET() {
  const checkedAt = new Date().toISOString();

  try {
    await checkDatabase();

    return NextResponse.json(
      { status: "ok", database: "reachable", checkedAt },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("[health] database check failed", error);

    return NextResponse.json(
      { status: "degraded", database: "unreachable", checkedAt },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
