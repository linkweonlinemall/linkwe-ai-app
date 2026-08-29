import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 50);
  if (!ids.length) return NextResponse.json({ events: [] });
  const events = await prisma.event.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    select: { id: true, title: true, slug: true, startDate: true, coverImage: true, venueName: true, region: true, isOnline: true },
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json({ events });
}
