"use server"

import { prisma } from "@/lib/prisma"
import type { ChatProduct } from "@/lib/chat/types"

interface SearchInput {
  query: string
  maxPrice?: number
  minPrice?: number
  category?: string
  region?: string
  limit?: number
}

export async function searchProducts(
  input: SearchInput
): Promise<ChatProduct[]> {
  const {
    query,
    maxPrice,
    minPrice,
    category,
    region,
    limit = 8,
  } = input

  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 1)

  const priceFilter = maxPrice || minPrice ? {
    price: {
      ...(minPrice ? { gte: minPrice } : {}),
      ...(maxPrice ? { lte: maxPrice } : {}),
    }
  } : {}

  const categoryFilter = category ? {
    category: { contains: category, mode: "insensitive" as const }
  } : {}

  const regionFilter = region ? {
    store: {
      region: { contains: region, mode: "insensitive" as const }
    }
  } : {}

  // Build OR conditions from query words
  const searchConditions = words.length > 0 ? {
    OR: [
      ...words.map(word => ({
        name: { contains: word, mode: "insensitive" as const }
      })),
      ...words.map(word => ({
        description: { contains: word, mode: "insensitive" as const }
      })),
      ...words.map(word => ({
        category: { contains: word, mode: "insensitive" as const }
      })),
      ...words.map(word => ({
        tags: { has: word }
      })),
    ]
  } : {}

  // First try with search conditions
  let products = await prisma.product.findMany({
    where: {
      isPublished: true,
      ...priceFilter,
      ...categoryFilter,
      ...regionFilter,
      ...searchConditions,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: true,
      category: true,
      stock: true,
      store: {
        select: {
          name: true,
          slug: true,
          region: true,
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  // If no results, fall back to all published products
  // with only price/category/region filters applied
  if (products.length === 0) {
    products = await prisma.product.findMany({
      where: {
        isPublished: true,
        ...priceFilter,
        ...categoryFilter,
        ...regionFilter,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        images: true,
        category: true,
        stock: true,
        store: {
          select: {
            name: true,
            slug: true,
            region: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
  }

  return products.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    images: p.images,
    category: p.category,
    stock: p.stock,
    storeName: p.store.name,
    storeSlug: p.store.slug,
    storeRegion: p.store.region,
  }))
}
