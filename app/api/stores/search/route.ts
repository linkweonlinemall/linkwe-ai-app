import { NextRequest, NextResponse } from "next/server"

import { getPublicStores } from "@/app/actions/public-stores"

const AUTOCOMPLETE_LIMIT = 8

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const qRaw = searchParams.get("q")
  const q = qRaw?.trim() ? qRaw.trim() : undefined

  const categoryRaw = searchParams.get("category")?.trim()
  const categoryId =
    categoryRaw && categoryRaw !== "all" ? categoryRaw : undefined

  const regionRaw = searchParams.get("region")?.trim()
  const region = regionRaw ? regionRaw : undefined

  const tagRaw = searchParams.get("tag")?.trim()
  const tag = tagRaw ? tagRaw : undefined

  const result = await getPublicStores(
    q,
    { categoryId, region, tag, sort: "newest" },
    1
  )

  const trimmed = result.items.slice(0, AUTOCOMPLETE_LIMIT).map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    tagline: s.tagline,
    logoUrl: s.logoUrl,
    region: s.region,
    categoryId: s.categoryId,
    tags: s.tags,
  }))

  return NextResponse.json(trimmed)
}
