import {categoryFacets} from "@/lib/catalog/categories";
import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sellableStoreWhere } from "@/lib/store/sellable-store";
import { swatchPaint } from "@/lib/variant-options";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { SHOP_PAGE_SIZE, shopOrderBy, shopStockWhere, type ShopQuery } from "./query";
import { matchingPrices, displayPricing } from "./pricing";
import type { ShopProduct, ShopFilterOptions } from "./types";

const productSelect = {
  id: true, name: true, slug: true, price: true, compareAtPrice: true, images: true,
  category: true, brand: true, condition: true, stock: true, isFeatured: true, hasVariants: true,
  isDigital: true, allowPickup: true, allowDelivery: true,
  store: { select: { name: true, slug: true, region: true, logoUrl: true } },
  variants: { select: { stock: true, price: true, attributes: true } },
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
    ...(query.fulfilment === "digital" ? {isDigital:true} : query.fulfilment === "delivery" ? {isDigital:false,allowDelivery:true} : query.fulfilment === "pickup" ? {isDigital:false,allowPickup:true} : {}),
    ...(query.condition ? { condition: query.condition } : {}),
    ...(query.brand ? { brand: { equals: query.brand, mode: "insensitive" } } : {}),
    ...(query.inStock ? { AND: [shopStockWhere()] } : {}),
  };
  // Fetch only pricing metadata for refinements Prisma cannot express across variant fallback prices.
  // Filter before pagination so totals, pages and price ordering describe matching options.
  const priceSort = query.sort === "price_asc" || query.sort === "price_desc";
  let priceOrder: string[] | undefined;
  if (query.colour || query.size || query.onSale || query.minPrice !== undefined || query.maxPrice !== undefined || priceSort) {
    const candidates = await prisma.product.findMany({ where, select: {
      id: true, price: true, compareAtPrice: true, stock: true, hasVariants: true,
      variants: { select: { price: true, stock: true, attributes: true } },
    } });
    const matching = candidates.flatMap(product => {
      const prices = matchingPrices(product, query);
      return prices.length ? [{ id: product.id, price: Math.min(...prices) }] : [];
    });
    if (priceSort) matching.sort((a,b) => (query.sort === "price_asc" ? a.price-b.price : b.price-a.price) || a.id.localeCompare(b.id));
    where.id = { in: matching.map(product => product.id) };
    if (priceSort) priceOrder = matching.map(product => product.id);
  }
  const total = await prisma.product.count({ where });
  const pages = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
  const page = Math.min(query.page, pages);
  const [products, spotlight] = await Promise.all([
    prisma.product.findMany({ where: priceOrder ? { ...where, id: { in: priceOrder.slice((page - 1) * SHOP_PAGE_SIZE, page * SHOP_PAGE_SIZE) } } : where, select: productSelect, orderBy: shopOrderBy(query.sort), take: SHOP_PAGE_SIZE, skip: priceOrder ? 0 : (page - 1) * SHOP_PAGE_SIZE }),
    prisma.product.findMany({ where: { ...base, NOT: { images: { isEmpty: true } } }, select: productSelect, orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }], take: 40 }),
  ]);
  if (priceOrder) { const ranks = new Map(priceOrder.map((id, index) => [id, index])); products.sort((a,b) => ranks.get(a.id)! - ranks.get(b.id)!); }
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
        if (["colour", "color"].includes(name.trim().toLowerCase())) colours.add(value.trim().toLowerCase());
        if (name.trim().toLowerCase() === "size") sizes.add(value.trim());
      }
    }
  }
  if (query.category && !counts.has(query.category)) counts.set(query.category, 0);
  const options: ShopFilterOptions = {
    categories: categoryFacets("products",counts).filter(category => category.count > 0 || category.value === query.category),
    regions: [...regions].map(value => ({ value, label: getRegionLabel(value) })).sort((a,b) => a.label.localeCompare(b.label)),
    brands: [...new Set(inventory.map(p => p.brand).filter((v): v is string => !!v?.trim()))].sort(),
    colours: [...colours].sort().map(value => ({ value, hex: swatchPaint(value) })),
    sizes: [...sizes].sort((a,b) => a.localeCompare(b, undefined, { numeric: true })),
  };
  const seen = new Set<string>();
  const highlights = [...spotlight.filter(p => { if (seen.has(p.store.slug)) return false; seen.add(p.store.slug); return true; }), ...spotlight];
  const uniqueHighlights = [...new Map(highlights.map(p => [p.id, p])).values()].slice(0, 3);
  return { products: products.map(p => { const r = ratings.find(r => r.productId === p.id); return { ...p, ...displayPricing(p, query), rating: r ? { avg: r._avg.rating ?? 0, count: r._count.rating } : undefined }; }) as ShopProduct[], highlights: uniqueHighlights as ShopProduct[], options, total, page, pages, preview: false };
}
