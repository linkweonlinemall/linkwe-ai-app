import { NextRequest, NextResponse } from "next/server";

import { runUniversalSearch } from "@/lib/search/run-search";

export const runtime = "nodejs";

function parseNumber(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 },
    );
  }

  const typeRaw = searchParams.get("type")?.trim() ?? "all";
  const type =
    typeRaw === "products" || typeRaw === "services" || typeRaw === "stores"
      ? typeRaw
      : "all";

  try {
    const data = await runUniversalSearch({
      q,
      region: searchParams.get("region")?.trim() || undefined,
      category: searchParams.get("category")?.trim() || undefined,
      type,
      minPrice: parseNumber(searchParams.get("minPrice")),
      maxPrice: parseNumber(searchParams.get("maxPrice")),
      rating: parseNumber(searchParams.get("rating")),
      page: parseInt(searchParams.get("page") ?? "1", 10) || 1,
      preview: searchParams.get("preview") === "true",
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
