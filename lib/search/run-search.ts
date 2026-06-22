import type { Prisma } from "@prisma/client";
import { ListingStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sellableStoreWhere } from "@/lib/store/sellable-store";
import { canonicalRegionValue } from "@/lib/regions/tt-regions";
import { extractRegionFromQuery } from "@/lib/search/regions";
import { reviewStatsForProducts, reviewStatsForStores } from "@/lib/search/review-stats";
import type {
  SearchProductResult,
  SearchServiceResult,
  SearchStoreResult,
  UniversalSearchResponse,
} from "@/lib/search/types";

export type SearchParams = {
  q: string;
  region?: string;
  category?: string;
  type?: "all" | "products" | "services" | "stores";
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  page?: number;
  preview?: boolean;
};

const PAGE_SIZE = 12;
const PREVIEW_LIMITS = { products: 3, services: 2, stores: 2 } as const;

function textOrClauses(terms: string): Prisma.ProductWhereInput[] {
  if (!terms) return [];
  const words = terms.split(/\s+/).filter((w) => w.length > 0).slice(0, 8);
  const or: Prisma.ProductWhereInput[] = [
    { name: { contains: terms, mode: "insensitive" } },
    { description: { contains: terms, mode: "insensitive" } },
    { shortDescription: { contains: terms, mode: "insensitive" } },
    { brand: { contains: terms, mode: "insensitive" } },
    { category: { contains: terms, mode: "insensitive" } },
  ];
  for (const w of words) {
    or.push({ tags: { has: w.toLowerCase() } });
  }
  return or;
}

function storeTextOrClauses(terms: string): Prisma.StoreWhereInput[] {
  if (!terms) return [];
  const words = terms.split(/\s+/).filter((w) => w.length > 0).slice(0, 8);
  const or: Prisma.StoreWhereInput[] = [
    { name: { contains: terms, mode: "insensitive" } },
    { description: { contains: terms, mode: "insensitive" } },
    { tagline: { contains: terms, mode: "insensitive" } },
    { categoryId: { contains: terms, mode: "insensitive" } },
  ];
  for (const w of words) {
    or.push({ tags: { has: w } });
  }
  return or;
}

function discoverableStoreWhere(): Prisma.StoreWhereInput {
  return {
    ...sellableStoreWhere(),
    OR: [
      { products: { some: { isPublished: true, isArchived: false } } },
      { listings: { some: { status: ListingStatus.PUBLISHED } } },
    ],
  };
}

function productBaseWhere(
  isService: boolean,
  terms: string,
  region: string | undefined,
  category: string | undefined,
  minPrice?: number,
  maxPrice?: number,
): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [
    { isPublished: true, isArchived: false, isService },
    { store: sellableStoreWhere() },
  ];

  if (terms) {
    and.push({ OR: textOrClauses(terms) });
  }

  if (region) {
    and.push({ store: { region: canonicalRegionValue(region) } });
  }

  if (category && category !== "all") {
    and.push({
      category: { equals: category, mode: "insensitive" },
    });
  }

  if (minPrice != null || maxPrice != null) {
    and.push({
      price: {
        ...(minPrice != null ? { gte: minPrice } : {}),
        ...(maxPrice != null ? { lte: maxPrice } : {}),
      },
    });
  }

  return { AND: and };
}

function storeBaseWhere(
  terms: string,
  region: string | undefined,
  category: string | undefined,
): Prisma.StoreWhereInput {
  const and: Prisma.StoreWhereInput[] = [discoverableStoreWhere()];

  if (terms) {
    and.push({ OR: storeTextOrClauses(terms) });
  }

  if (region) {
    and.push({ region: canonicalRegionValue(region) });
  }

  if (category && category !== "all") {
    and.push({
      categoryId: { equals: category, mode: "insensitive" },
    });
  }

  return { AND: and };
}

async function filterProductIdsByRating(
  where: Prisma.ProductWhereInput,
  minRating: number,
): Promise<string[] | null> {
  if (minRating <= 0) return null;

  const candidates = await prisma.product.findMany({
    where,
    select: { id: true },
    take: 500,
  });
  const ids = candidates.map((c) => c.id);
  const stats = await reviewStatsForProducts(ids);
  return ids.filter((id) => (stats.get(id)?.average ?? 0) >= minRating);
}

export async function runUniversalSearch(
  params: SearchParams,
): Promise<UniversalSearchResponse> {
  const rawQ = params.q.trim();
  const parsed = extractRegionFromQuery(rawQ);
  const regionSlug = params.region?.trim() || parsed.detectedRegion || undefined;
  const region = regionSlug ? canonicalRegionValue(regionSlug) : undefined;
  const terms = parsed.searchTerms || (parsed.detectedRegion ? "" : rawQ);
  const type = params.type ?? "all";
  const page = Math.max(1, params.page ?? 1);
  const preview = params.preview ?? false;
  const minRating = params.rating ?? 0;

  const productWhere = productBaseWhere(
    false,
    terms,
    region,
    params.category,
    params.minPrice,
    params.maxPrice,
  );
  const serviceWhere = productBaseWhere(
    true,
    terms,
    region,
    params.category,
    params.minPrice,
    params.maxPrice,
  );
  const storeWhere = storeBaseWhere(terms, region, params.category);

  const productRatingIds = await filterProductIdsByRating(productWhere, minRating);
  const serviceRatingIds = await filterProductIdsByRating(serviceWhere, minRating);

  if (productRatingIds) {
    productWhere.AND = [
      ...(Array.isArray(productWhere.AND) ? productWhere.AND : [productWhere.AND].filter(Boolean)),
      { id: { in: productRatingIds.length ? productRatingIds : ["__none__"] } },
    ];
  }
  if (serviceRatingIds) {
    serviceWhere.AND = [
      ...(Array.isArray(serviceWhere.AND) ? serviceWhere.AND : [serviceWhere.AND].filter(Boolean)),
      { id: { in: serviceRatingIds.length ? serviceRatingIds : ["__none__"] } },
    ];
  }

  const productTake = preview ? PREVIEW_LIMITS.products : PAGE_SIZE;
  const serviceTake = preview ? PREVIEW_LIMITS.services : PAGE_SIZE;
  const storeTake = preview ? PREVIEW_LIMITS.stores : PAGE_SIZE;
  const skip = preview ? 0 : (page - 1) * PAGE_SIZE;

  const searchProducts = type === "all" || type === "products";
  const searchServices = type === "all" || type === "services";
  const searchStores = type === "all" || type === "stores";

  const [productCount, serviceCount, storeCount, products, services, stores] =
    await Promise.all([
      searchProducts ? prisma.product.count({ where: productWhere }) : 0,
      searchServices ? prisma.product.count({ where: serviceWhere }) : 0,
      searchStores ? prisma.store.count({ where: storeWhere }) : 0,
      searchProducts
        ? prisma.product.findMany({
            where: productWhere,
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              images: true,
              category: true,
              store: { select: { name: true, slug: true, region: true } },
            },
            orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
            take: productTake,
            skip: searchProducts && !preview ? skip : 0,
          })
        : [],
      searchServices
        ? prisma.product.findMany({
            where: serviceWhere,
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              images: true,
              category: true,
              durationMinutes: true,
              serviceDuration: true,
              store: { select: { name: true, slug: true, region: true } },
            },
            orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
            take: serviceTake,
            skip: searchServices && !preview ? skip : 0,
          })
        : [],
      searchStores
        ? prisma.store.findMany({
            where: storeWhere,
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              coverPhotoUrl: true,
              categoryId: true,
              region: true,
              tags: true,
              _count: {
                select: {
                  products: { where: { isPublished: true, isArchived: false, isService: false } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: storeTake,
            skip: searchStores && !preview ? skip : 0,
          })
        : [],
    ]);

  const productIds = [...products, ...services].map((p) => p.id);
  const storeIds = stores.map((s) => s.id);
  const [productReviews, storeReviews] = await Promise.all([
    reviewStatsForProducts(productIds),
    reviewStatsForStores(storeIds),
  ]);

  let storeResults: SearchStoreResult[] = stores.map((s) => {
    const rev = storeReviews.get(s.id);
    return {
      type: "store",
      id: s.id,
      name: s.name,
      slug: s.slug,
      logoUrl: s.logoUrl,
      coverPhotoUrl: s.coverPhotoUrl,
      category: s.categoryId,
      region: s.region,
      tags: s.tags,
      productCount: s._count.products,
      averageRating: rev && rev.count > 0 ? Math.round(rev.average * 10) / 10 : null,
      reviewCount: rev?.count ?? 0,
    };
  });

  if (minRating > 0) {
    storeResults = storeResults.filter(
      (s) => s.reviewCount === 0 || (s.averageRating ?? 0) >= minRating,
    );
  }

  const mapProduct = (p: (typeof products)[0]): SearchProductResult => {
    const rev = productReviews.get(p.id);
    return {
      type: "product",
      isService: false,
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      images: p.images,
      category: p.category,
      store: p.store,
      averageRating: rev && rev.count > 0 ? Math.round(rev.average * 10) / 10 : null,
      reviewCount: rev?.count ?? 0,
    };
  };

  const productResults = products.map(mapProduct);
  const serviceResults: SearchServiceResult[] = services.map((s) => {
    const rev = productReviews.get(s.id);
    return {
      type: "service",
      id: s.id,
      title: s.name,
      slug: s.slug,
      price: s.price,
      images: s.images,
      category: s.category,
      durationMinutes: s.durationMinutes || s.serviceDuration || 60,
      store: s.store,
      averageRating: rev && rev.count > 0 ? Math.round(rev.average * 10) / 10 : null,
      reviewCount: rev?.count ?? 0,
    };
  });

  const total = productCount + serviceCount + storeCount;

  return {
    query: rawQ,
    detectedRegion: parsed.detectedRegion,
    results: {
      products: productResults,
      services: serviceResults,
      stores: storeResults,
      total,
    },
    counts: {
      products: productCount,
      services: serviceCount,
      stores: storeCount,
    },
  };
}
