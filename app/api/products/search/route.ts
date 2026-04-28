import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() ?? ""
  const category = searchParams.get("category")?.trim() ?? ""

  if (!q) return NextResponse.json([])

  const products = await prisma.product.findMany({
    where: {
      isPublished: true,
      ...(category && category !== "all" ? { category } : {}),
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { shortDescription: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { tags: { has: q.toLowerCase() } },
        { store: { name: { contains: q, mode: "insensitive" } } },
        { store: { region: { contains: q, mode: "insensitive" } } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      compareAtPrice: true,
      images: true,
      category: true,
      stock: true,
      brand: true,
      store: { select: { name: true, slug: true, region: true } },
    },
    take: 8,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  })

  return NextResponse.json(products)
}
