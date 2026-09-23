import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sellableStoreWhere } from "@/lib/store/sellable-store";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { COLOUR_OPTIONS } from "@/lib/variant-options";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { categoryLabel, SHOP_PAGE_SIZE, shopOrderBy, shopStockWhere, type ShopQuery } from "./query";
import type { ShopProduct, ShopFilterOptions } from "./types";

const productSelect = {
  id: true, name: true, slug: true, price: true, compareAtPrice: true, images: true,
  category: true, brand: true, condition: true, stock: true, isFeatured: true, hasVariants: true,
  isDigital: true, allowPickup: true, allowDelivery: true,
  store: { select: { name: true, slug: true, region: true, logoUrl: true } },
  variants: { select: { stock: true } },
} satisfies Prisma.ProductSelect;

export async function getShopCatalog(query: ShopQuery) {
  const base: Prisma.ProductWhereInput = { isPublished: true, isArchived: false, isService: false, store: sellableStoreWhere() };
  const inventory = await prisma.product.findMany({ where: base, select: {
    category: true, brand: true, store: { select: { region: true } }, variants: { select: { attributes: true } },
  } });
  const where: Prisma.ProductWhereInput = {
    ...base, store: { ...sellableStoreWhere(), ...(query.region ? { region: query.region } : {}) },
    ...(query.category ? { category: query.category } : {}),
    ...(query.q ? { OR: [
      { name: { contains: query.q, mode: "insensitive" } }, { brand: { contains: query.q, mode: "insensitive" } },
      { store: { name: { contains: query.q, mode: "insensitive" } } },
    ] } : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined ? { price: { gte: query.minPrice, lte: query.maxPrice } } : {}),
    ...(query.condition ? { condition: query.condition } : {}),
    ...(query.brand ? { brand: { equals: query.brand, mode: "insensitive" } } : {}),
    ...(query.inStock ? { AND: [shopStockWhere()] } : {}),
  };
  if (query.colour || query.size) {
    const predicates: Prisma.Sql[] = [];
    if (query.colour) predicates.push(Prisma.sql`EXISTS (SELECT 1 FROM jsonb_array_elements(pv."attributes"::jsonb) attr WHERE lower(attr->>'name') = 'colour' AND lower(attr->>'value') = lower(${query.colour}))`);
    if (query.size) predicates.push(Prisma.sql`EXISTS (SELECT 1 FROM jsonb_array_elements(pv."attributes"::jsonb) attr WHERE lower(attr->>'name') = 'size' AND lower(attr->>'value') = lower(${query.size}))`);
    if (query.inStock) predicates.push(Prisma.sql`(pv."stock" IS NULL OR pv."stock" > 0)`);
    const rows = await prisma.$queryRaw<{ productId: string }[]>`SELECT DISTINCT pv."productId" FROM "ProductVariant" pv WHERE ${Prisma.join(predicates, " AND ")}`;
    where.id = { in: rows.map(row => row.productId) };
  }
  const total = await prisma.product.count({ where });
  const pages = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
  const page = Math.min(query.page, pages);
  const [products, spotlight] = await Promise.all([
    prisma.product.findMany({ where, select: productSelect, orderBy: shopOrderBy(query.sort), take: SHOP_PAGE_SIZE, skip: (page - 1) * SHOP_PAGE_SIZE }),
    prisma.product.findMany({ where: { ...base, NOT: { images: { isEmpty: true } } }, select: productSelect, orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }], take: 40 }),
  ]);
  const ratings = products.length ? await prisma.review.groupBy({ by: ["productId"], where: { productId: { in: products.map(p => p.id) } }, _avg: { rating: true }, _count: { rating: true } }) : [];
  const counts = new Map<string, number>(), regions = new Set<string>(), colours = new Set<string>(), sizes = new Set<string>();
  for (const product of inventory) {
    if (product.category) counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
    if (product.store.region) regions.add(product.store.region);
    for (const variant of product.variants) {
      if (!Array.isArray(variant.attributes)) continue;
      for (const raw of variant.attributes) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
        const { name, value } = raw;
        if (typeof name !== "string" || typeof value !== "string" || !value.trim()) continue;
        if (name.toLowerCase() === "colour") colours.add(value.trim().toLowerCase());
        if (name.toLowerCase() === "size") sizes.add(value.trim());
      }
    }
  }
  const options: ShopFilterOptions = {
    categories: [...counts].map(([value, count]) => ({ value, count, label: PRODUCT_CATEGORIES.find(c => c.value === value)?.label ?? categoryLabel(value) })).sort((a,b) => b.count - a.count),
    regions: [...regions].map(value => ({ value, label: getRegionLabel(value) })).sort((a,b) => a.label.localeCompare(b.label)),
    brands: [...new Set(inventory.map(p => p.brand).filter((v): v is string => !!v?.trim()))].sort(),
    colours: [...colours].sort().map(value => ({ value, hex: COLOUR_OPTIONS.find(c => c.value === value)?.hex ?? "#a1a1aa" })),
    sizes: [...sizes].sort((a,b) => a.localeCompare(b, undefined, { numeric: true })),
  };
  const seen = new Set<string>();
  const highlights = [...spotlight.filter(p => { if (seen.has(p.store.slug)) return false; seen.add(p.store.slug); return true; }), ...spotlight];
  const uniqueHighlights = [...new Map(highlights.map(p => [p.id, p])).values()].slice(0, 3);
  return { products: products.map(p => { const r = ratings.find(r => r.productId === p.id); return { ...p, rating: r ? { avg: r._avg.rating ?? 0, count: r._count.rating } : undefined }; }) as ShopProduct[], highlights: uniqueHighlights as ShopProduct[], options, total, page, pages, preview: false };
}
