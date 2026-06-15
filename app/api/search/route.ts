import { NextRequest, NextResponse } from "next/server";

import { runUniversalSearch } from "@/lib/search/run-search";
import {
  emptyUniversalSearchResponse,
  normalizeUniversalSearchResponse,
} from "@/lib/search/types";

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
    return NextResponse.json(emptyUniversalSearchResponse(q));
  }

  const typeRaw = searchParams.get("type")?.trim() ?? "all";
  const type =
    typeRaw === "products" || typeRaw === "services" || typeRaw === "stores"
      ? typeRaw
      : "all";

  const searchInput = {
    q,
    region: searchParams.get("region")?.trim() || undefined,
    category: searchParams.get("category")?.trim() || undefined,
    type: type as "products" | "services" | "stores" | "all" | undefined,
    minPrice: parseNumber(searchParams.get("minPrice")),
    maxPrice: parseNumber(searchParams.get("maxPrice")),
    rating: parseNumber(searchParams.get("rating")),
    page: parseInt(searchParams.get("page") ?? "1", 10) || 1,
    preview: searchParams.get("preview") === "true",
  };

  try {
    const data = await runUniversalSearch(searchInput);
    const normalized = normalizeUniversalSearchResponse(data, q);

    return NextResponse.json(normalized);
  } catch (err) {
    console.error("[api/search] failed:", err);
    return NextResponse.json(emptyUniversalSearchResponse(q));
  }
}
