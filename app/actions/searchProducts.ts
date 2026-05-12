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

// Synonym map — expands search terms to catch related products
const SYNONYMS: Record<string, string[]> = {
  // Clothing types
  "long sleeve": ["hoodie", "sweatshirt", "crewneck", "jacket", "cardigan", "pullover", "sweater", "long"],
  hoodie: ["hoodie", "sweatshirt", "pullover", "fleece"],
  dress: ["dress", "gown", "frock", "maxi", "mini", "bodycon"],
  shoes: ["shoes", "sneakers", "heels", "sandals", "boots", "footwear", "slippers"],
  sneakers: ["sneakers", "trainers", "runners", "kicks"],
  bag: ["bag", "purse", "handbag", "tote", "backpack", "clutch"],
  jewelry: ["jewelry", "jewellery", "necklace", "bracelet", "ring", "earring", "chain"],
  pants: ["pants", "jeans", "trousers", "chinos", "slacks", "bottoms"],
  shorts: ["shorts", "bermuda", "trunks"],
  shirt: ["shirt", "tee", "t-shirt", "blouse", "top", "polo"],
  suit: ["suit", "blazer", "formal", "dress shirt", "jacket"],
  // Occasions
  fete: ["party", "sequin", "bodycon", "glitter", "crop", "heels", "going out"],
  carnival: ["carnival", "costume", "festival", "sequin", "feather", "bikini"],
  beach: ["beach", "swimwear", "bikini", "swimsuit", "cover-up", "sandals"],
  work: ["work", "office", "formal", "professional", "business", "blazer"],
  church: ["church", "modest", "formal", "conservative", "dress", "suit"],
  wedding: ["wedding", "formal", "dress", "suit", "elegant"],
  // Lifestyle
  gym: ["gym", "fitness", "workout", "athletic", "sports", "activewear", "leggings"],
  warm: ["hoodie", "sweatshirt", "jacket", "sweater", "fleece", "cardigan"],
  cool: ["shorts", "tank", "tee", "light", "linen", "breathable"],
  // Beauty & wellness
  skincare: ["skincare", "moisturizer", "serum", "cleanser", "toner", "face wash"],
  makeup: ["makeup", "foundation", "lipstick", "mascara", "eyeshadow", "concealer"],
  hair: ["hair", "shampoo", "conditioner", "weave", "wig", "hair care"],
  // Food
  snack: ["snack", "chips", "biscuit", "crackers", "nuts", "trail mix"],
  drink: ["drink", "juice", "beverage", "water", "tea", "coffee"],
  // Home
  furniture: ["furniture", "chair", "table", "sofa", "desk", "shelf"],
  decor: ["decor", "decoration", "ornament", "picture", "vase", "candle"],
}

function expandQuery(query: string): string[] {
  const lower = query.toLowerCase()
  const terms = new Set<string>([lower])

  // Add synonym expansions
  for (const [key, synonyms] of Object.entries(SYNONYMS)) {
    if (lower.includes(key)) {
      synonyms.forEach((s) => terms.add(s))
    }
    // Also check if any synonym matches the query
    if (synonyms.some((s) => lower.includes(s))) {
      terms.add(key)
      synonyms.forEach((s) => terms.add(s))
    }
  }

  // Add individual words from the query
  lower
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .forEach((w) => terms.add(w))

  return Array.from(terms)
}

export async function searchProducts(input: SearchInput): Promise<ChatProduct[]> {
  const { query, maxPrice, minPrice, category, region, limit = 8 } = input

  // Expand query with synonyms
  const expandedTerms = expandQuery(query)

  const priceFilter =
    maxPrice || minPrice
      ? {
          price: {
            ...(minPrice ? { gte: minPrice } : {}),
            ...(maxPrice ? { lte: maxPrice } : {}),
          },
        }
      : {}

  const categoryFilter = category
    ? { category: { contains: category, mode: "insensitive" as const } }
    : {}

  const regionFilter = region
    ? {
        store: {
          region: { contains: region, mode: "insensitive" as const },
        },
      }
    : {}

  // Build OR conditions from ALL expanded terms
  const searchConditions =
    expandedTerms.length > 0
      ? {
          OR: [
            ...expandedTerms.map((term) => ({
              name: { contains: term, mode: "insensitive" as const },
            })),
            ...expandedTerms.map((term) => ({
              description: { contains: term, mode: "insensitive" as const },
            })),
            ...expandedTerms.map((term) => ({
              shortDescription: { contains: term, mode: "insensitive" as const },
            })),
            ...expandedTerms.map((term) => ({
              category: { contains: term, mode: "insensitive" as const },
            })),
            ...expandedTerms.map((term) => ({
              brand: { contains: term, mode: "insensitive" as const },
            })),
            ...expandedTerms.map((term) => ({
              tags: { has: term },
            })),
          ],
        }
      : {}

  // First try with expanded search
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
      compareAtPrice: true,
      images: true,
      category: true,
      stock: true,
      hasVariants: true,
      brand: true,
      shortDescription: true,
      store: {
        select: {
          name: true,
          slug: true,
          region: true,
        },
      },
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: limit,
  })

  // If still no results, fall back to category-only or all published
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
        compareAtPrice: true,
        images: true,
        category: true,
        stock: true,
        hasVariants: true,
        brand: true,
        shortDescription: true,
        store: {
          select: {
            name: true,
            slug: true,
            region: true,
          },
        },
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: limit,
    })
  }

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    images: p.images,
    category: p.category,
    stock: p.stock,
    hasVariants: p.hasVariants,
    storeName: p.store.name,
    storeSlug: p.store.slug,
    storeRegion: p.store.region,
  }))
}
