"use server";

import type { Prisma } from "@prisma/client";
import { ListingStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sellableStoreWhere } from "@/lib/store/sellable-store";

const STORE_PAGE_SIZE = 12;
const PRODUCT_PAGE_SIZE_DEFAULT = 24;

export type PublicStoreSort = "recommended" | "newest" | "popular" | "rating" | "nearest";

export type PublicStoresFilters = {
  categoryId?: string | null;
  region?: string | null;
  tag?: string | null;
  sort?: PublicStoreSort | null;
  userLat?: number | null;
  userLng?: number | null;
};

export type PublicStoreCard = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  /** Short teaser; full description can be long */
  descriptionPreview: string | null;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  tags: string[];
  region: string;
  categoryId: string;
  averageRating: number | null;
  reviewCount: number;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  productCount: number;
};

export type PublicStoresPageResult = {
  items: PublicStoreCard[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
};

export type PublicStoreMapPoint = Pick<PublicStoreCard, "id" | "name" | "slug" | "logoUrl" | "region" | "latitude" | "longitude">;

export async function getPublicStoreMapPoints(search?: string, filters?: PublicStoresFilters): Promise<PublicStoreMapPoint[]> {
  const rows = await prisma.store.findMany({
    where: { AND: [buildPublicStoresWhere(search, filters), { latitude: { not: null }, longitude: { not: null } }] },
    select: { id: true, name: true, slug: true, logoUrl: true, region: true, latitude: true, longitude: true },
    orderBy: { name: "asc" },
    take: 250,
  });
  return rows;
}

type StoreCardRow = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  tags: string[];
  region: string;
  categoryId: string;
  createdAt: Date;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  openingHours: Prisma.JsonValue | null;
  productCount: number;
};

const storeCardSelect = {
  id: true,
  name: true,
  slug: true,
  tagline: true,
  description: true,
  logoUrl: true,
  coverPhotoUrl: true,
  tags: true,
  region: true,
  categoryId: true,
  createdAt: true,
  latitude: true,
  longitude: true,
  address: true,
  openingHours: true,
  _count: { select: { products: { where: { isPublished: true } } } },
} satisfies Prisma.StoreSelect;

type StoreCardQueryRow = Omit<StoreCardRow, "productCount"> & { _count: { products: number } };

function normalizeStoreRow(row: StoreCardQueryRow): StoreCardRow {
  const { _count, ...store } = row;
  return { ...store, productCount: _count.products };
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function previewText(text: string | null | undefined, max = 140): string | null {
  if (!text?.trim()) return null;
  const t = text.trim().replace(/\s+/g, " ");
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/**
 * Stores shown in discovery must be `ACTIVE` and have at least one published product or
 * published listing so empty shells stay out of results.
 */
function discoverableStoreEligibility(): Prisma.StoreWhereInput {
  return {
    ...sellableStoreWhere(),
    OR: [
      { products: { some: { isPublished: true } } },
      { listings: { some: { status: ListingStatus.PUBLISHED } } },
    ],
  };
}

/** Count of stores eligible for `/stores` discovery (same rule as listings). */
export async function getDiscoverableActiveStoreCount(): Promise<number> {
  return prisma.store.count({
    where: discoverableStoreEligibility(),
  });
}

function buildPublicStoresWhere(
  search: string | undefined,
  filters: PublicStoresFilters | undefined
): Prisma.StoreWhereInput {
  const eligibility = discoverableStoreEligibility();
  const andClauses: Prisma.StoreWhereInput[] = [];

  const categoryId = filters?.categoryId?.trim();
  if (categoryId && categoryId !== "all") {
    andClauses.push({ categoryId });
  }

  const region = filters?.region?.trim();
  if (region) {
    andClauses.push({ region });
  }

  const tag = filters?.tag?.trim();
  if (tag) {
    andClauses.push({ tags: { has: tag } });
  }

  const q = search?.trim();
  if (q) {
    const words = q.split(/\s+/).filter((w) => w.length > 0).slice(0, 8);
    const or: Prisma.StoreWhereInput[] = [
      { name: { contains: q, mode: "insensitive" } },
      { tagline: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { categoryId: { contains: q, mode: "insensitive" } },
    ];
    for (const w of words) {
      or.push({ tags: { has: w } });
    }
    andClauses.push({ OR: or });
  }

  if (andClauses.length === 0) {
    return eligibility;
  }

  return { AND: [eligibility, ...andClauses] };
}

async function reviewStatsForStores(
  storeIds: string[]
): Promise<Map<string, { average: number; count: number }>> {
  const map = new Map<string, { sum: number; count: number }>();
  if (storeIds.length === 0) return new Map();

  // Fetch both old listing-based reviews and new direct storeId reviews in parallel
  const [listingRows, directRows] = await Promise.all([
    prisma.review.findMany({
      where: {
        listing: { storeId: { in: storeIds } },
      },
      select: {
        rating: true,
        listing: { select: { storeId: true } },
      },
    }),
    prisma.review.findMany({
      where: {
        storeId: { in: storeIds },
        productId: null,
      },
      select: {
        rating: true,
        storeId: true,
      },
    }),
  ]);

  // Process listing-based reviews
  for (const r of listingRows) {
    const sid = r.listing?.storeId;
    if (!sid) continue;
    const cur = map.get(sid) ?? { sum: 0, count: 0 };
    cur.sum += r.rating;
    cur.count += 1;
    map.set(sid, cur);
  }

  // Process direct storeId reviews
  for (const r of directRows) {
    const sid = r.storeId;
    if (!sid) continue;
    const cur = map.get(sid) ?? { sum: 0, count: 0 };
    cur.sum += r.rating;
    cur.count += 1;
    map.set(sid, cur);
  }

  const out = new Map<string, { average: number; count: number }>();
  for (const [sid, v] of map) {
    out.set(sid, { average: v.sum / v.count, count: v.count });
  }
  return out;
}

function toPublicCard(
  row: StoreCardRow,
  stats: Map<string, { average: number; count: number }>,
  userLat?: number | null,
  userLng?: number | null,
): PublicStoreCard {
  const s = stats.get(row.id);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    tagline: row.tagline,
    descriptionPreview: previewText(row.description),
    logoUrl: row.logoUrl,
    coverPhotoUrl: row.coverPhotoUrl,
    tags: row.tags.slice(0, 6),
    region: row.region,
    categoryId: row.categoryId,
    averageRating: s?.average ?? null,
    reviewCount: s?.count ?? 0,
    latitude: row.latitude,
    longitude: row.longitude,
    distanceKm:
      userLat != null && userLng != null && row.latitude != null && row.longitude != null
        ? haversineKm(userLat, userLng, row.latitude, row.longitude)
        : null,
    productCount: row.productCount,
  };
}

function orderIdsBySort(
  rows: StoreCardRow[],
  stats: Map<string, { average: number; count: number }>,
  sort: PublicStoreSort | null | undefined,
  userLat: number | null | undefined,
  userLng: number | null | undefined
): StoreCardRow[] {
  switch (sort) {
    case "recommended": {
      return [...rows].sort((a, b) => {
        const score = (row: StoreCardRow) => {
          const review = stats.get(row.id);
          const confidenceRating = (review?.average ?? 0) * Math.min(review?.count ?? 0, 12);
          const completion = [row.logoUrl, row.coverPhotoUrl, row.description, row.tagline, row.address, row.openingHours]
            .filter(Boolean).length;
          return confidenceRating * 5 + completion * 4 + Math.min(row.productCount, 20);
        };
        const difference = score(b) - score(a);
        return difference || b.createdAt.getTime() - a.createdAt.getTime();
      });
    }
    case "rating": {
      return [...rows].sort((a, b) => {
        const sa = stats.get(a.id)?.average ?? 0;
        const sb = stats.get(b.id)?.average ?? 0;
        if (sb !== sa) return sb - sa;
        return (stats.get(b.id)?.count ?? 0) - (stats.get(a.id)?.count ?? 0);
      });
    }
    case "nearest": {
      if (
        typeof userLat === "number" &&
        Number.isFinite(userLat) &&
        typeof userLng === "number" &&
        Number.isFinite(userLng)
      ) {
        return [...rows].sort((a, b) => {
          const ha =
            a.latitude != null && a.longitude != null
              ? haversineKm(userLat, userLng, a.latitude, a.longitude)
              : Number.POSITIVE_INFINITY;
          const hb =
            b.latitude != null && b.longitude != null
              ? haversineKm(userLat, userLng, b.latitude, b.longitude)
              : Number.POSITIVE_INFINITY;
          return ha - hb;
        });
      }
      return [...rows].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    }
    default:
      return [...rows];
  }
}

/**
 * Marketplace store discovery — only ACTIVE stores with at least one published product.
 */
export async function getPublicStores(
  search: string | undefined,
  filters: PublicStoresFilters | undefined,
  page: number
): Promise<PublicStoresPageResult> {
  const sort = filters?.sort ?? "recommended";
  const userLat = filters?.userLat ?? null;
  const userLng = filters?.userLng ?? null;

  const where = buildPublicStoresWhere(search, filters);
  const total = await prisma.store.count({ where });

  const totalPages = Math.max(1, Math.ceil(total / STORE_PAGE_SIZE));
  const safePage = Math.min(totalPages, Math.max(1, Math.floor(page)));

  const skip = (safePage - 1) * STORE_PAGE_SIZE;

  if (total === 0) {
    return {
      items: [],
      total: 0,
      page: 1,
      totalPages: 1,
      pageSize: STORE_PAGE_SIZE,
    };
  }

  const needsMemorySort = sort === "recommended" || sort === "rating" || sort === "nearest";

  if (!needsMemorySort) {
    const orderBy: Prisma.StoreOrderByWithRelationInput[] =
      sort === "popular"
        ? [{ products: { _count: "desc" } }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

    const rows = await prisma.store.findMany({
      where,
      orderBy,
      skip,
      take: STORE_PAGE_SIZE,
      select: storeCardSelect,
    });

    const stats = await reviewStatsForStores(rows.map((r) => r.id));
    const normalizedRows = rows.map((r) => normalizeStoreRow(r as StoreCardQueryRow));
    const items = normalizedRows.map((r) => toPublicCard(r, stats, userLat, userLng));

    return {
      items,
      total,
      page: safePage,
      totalPages,
      pageSize: STORE_PAGE_SIZE,
    };
  }

  const allRows = await prisma.store.findMany({
    where,
    select: storeCardSelect,
  });

  const stats = await reviewStatsForStores(allRows.map((r) => r.id));
  const normalizedRows = allRows.map((r) => normalizeStoreRow(r as StoreCardQueryRow));
  const sorted = orderIdsBySort(
    normalizedRows,
    stats,
    sort,
    userLat,
    userLng
  );

  const pageRows = sorted.slice(skip, skip + STORE_PAGE_SIZE);
  const items = pageRows.map((r) => toPublicCard(r, stats, userLat, userLng));

  return {
    items,
    total,
    page: safePage,
    totalPages,
    pageSize: STORE_PAGE_SIZE,
  };
}

export type PublicStoreDetail = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  categoryId: string;
  region: string;
  tags: string[];
  openingHours: Prisma.JsonValue | null;
  socialLinks: Record<string, string> | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  images: { id: string; url: string; position: number }[];
  ownerName: string;
};

/**
 * Public store profile for `/stores/[slug]`.
 */
export async function getStoreBySlug(slug: string): Promise<PublicStoreDetail | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const store = await prisma.store.findUnique({
    where: {
      slug: normalized,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      description: true,
      logoUrl: true,
      coverPhotoUrl: true,
      categoryId: true,
      region: true,
      tags: true,
      openingHours: true,
      socialLinks: true,
      address: true,
      latitude: true,
      longitude: true,
      images: {
        select: { id: true, url: true, position: true },
        orderBy: { position: "asc" },
      },
      owner: { select: { fullName: true } },
    },
  });

  if (!store) return null;

  const socialLinks =
    store.socialLinks != null &&
    typeof store.socialLinks === "object" &&
    !Array.isArray(store.socialLinks)
      ? (store.socialLinks as Record<string, string>)
      : null;

  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    tagline: store.tagline,
    description: store.description,
    logoUrl: store.logoUrl,
    coverPhotoUrl: store.coverPhotoUrl,
    categoryId: store.categoryId,
    region: store.region,
    tags: store.tags,
    openingHours: store.openingHours,
    socialLinks,
    address: store.address,
    latitude: store.latitude,
    longitude: store.longitude,
    images: store.images,
    ownerName: store.owner.fullName,
  };
}

export type PublicStoreProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  category: string | null;
  stock: number | null;
  hasVariants: boolean;
};

export type PublicStoreProductsResult = {
  items: PublicStoreProductRow[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
};

export async function getStoreProducts(
  storeId: string,
  page: number,
  pageSize: number = PRODUCT_PAGE_SIZE_DEFAULT
): Promise<PublicStoreProductsResult> {
  const safePage = Math.max(1, Math.floor(page));
  const take = Math.min(48, Math.max(1, Math.floor(pageSize)));
  const skip = (safePage - 1) * take;

  const where: Prisma.ProductWhereInput = {
    storeId,
    isPublished: true,
    store: sellableStoreWhere(),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      skip,
      take,
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
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / take));

  return {
    items: rows,
    total,
    page: safePage,
    totalPages,
    pageSize: take,
  };
}

export type PublicStoreReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  authorName: string;
  listingTitle: string;
  listingSlug: string;
};

export async function getStoreReviews(
  storeId: string,
  take = 24
): Promise<PublicStoreReviewRow[]> {
  const reviews = await prisma.review.findMany({
    where: {
      listing: { storeId },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(50, take),
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      createdAt: true,
      user: { select: { fullName: true } },
      listing: { select: { title: true, slug: true } },
    },
  });

  return reviews
    .filter((r): r is typeof r & { listing: NonNullable<(typeof r)["listing"]> } => r.listing != null)
    .map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      authorName: r.user.fullName,
      listingTitle: r.listing.title,
      listingSlug: r.listing.slug,
    }));
}

export async function getPublicStoreRegions(): Promise<string[]> {
  const rows = await prisma.store.findMany({
    where: discoverableStoreEligibility(),
    select: { region: true },
    distinct: ["region"],
    orderBy: { region: "asc" },
  });
  return rows.map((r) => r.region).filter(Boolean);
}

export async function getPublicStorePopularTags(limit = 28): Promise<string[]> {
  const rows = await prisma.store.findMany({
    where: discoverableStoreEligibility(),
    select: { tags: true },
  });
  const counts = new Map<string, number>();
  for (const r of rows) {
    for (const t of r.tags) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([t]) => t);
}
