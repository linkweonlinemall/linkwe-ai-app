import type { Prisma } from "@prisma/client";

export const SHOP_PAGE_SIZE = 24;
export const SHOP_SORTS = [
  { value: "featured", label: "Recommended" },
  { value: "newest", label: "Newest arrivals" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
  { value: "name_desc", label: "Name: Z to A" },
  { value: "stock", label: "Most in stock" },
];
export type ShopParams = Record<string, string | string[] | undefined>;
export function parseShopQuery(params: ShopParams) {
  const text = (key: string) => (Array.isArray(params[key]) ? params[key][0] : params[key])?.trim() ?? "";
  const price = (key: string) => { const raw = text(key); const value = Number(raw); return raw && Number.isFinite(value) && value >= 0 ? value : undefined; };
  let minPrice = price("minPrice"), maxPrice = price("maxPrice");
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];
  return {
    category: text("category") === "all" ? "" : text("category"), region: text("region"), q: text("q"),
    sort: SHOP_SORTS.some(option => option.value === text("sort")) ? text("sort") : "featured",
    minPrice, maxPrice, inStock: text("inStock") === "true",
    condition: (["NEW", "USED", "REFURBISHED"].includes(text("condition")) ? text("condition") : "") as "NEW" | "USED" | "REFURBISHED" | "",
    brand: text("brand"), colour: text("colour"), size: text("size"),
    page: Math.min(100000, Math.max(1, Math.floor(Number(text("page"))) || 1)),
  };
}
export type ShopQuery = ReturnType<typeof parseShopQuery>;
export function shopHref(params: ShopParams, overrides: Record<string, string | undefined> = {}, anchor = "shop-results") {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) { const v = Array.isArray(value) ? value[0] : value; if (v) query.set(key, v); }
  for (const [key, value] of Object.entries(overrides)) { if (value) query.set(key, value); else query.delete(key); }
  return `/shop${query.size ? `?${query}` : ""}${anchor ? `#${anchor}` : ""}`;
}
export function shopStockWhere(): Prisma.ProductWhereInput {
  return { OR: [
    { hasVariants: false, OR: [{ stock: null }, { stock: { gt: 0 } }] },
    { hasVariants: true, variants: { some: { OR: [{ stock: null }, { stock: { gt: 0 } }] } } },
  ] };
}
export function shopOrderBy(sort: string): Prisma.ProductOrderByWithRelationInput[] {
  if (sort === "price_asc") return [{ price: "asc" }, { id: "asc" }];
  if (sort === "price_desc") return [{ price: "desc" }, { id: "asc" }];
  if (sort === "name" || sort === "name_desc") return [{ name: sort === "name" ? "asc" : "desc" }, { id: "asc" }];
  if (sort === "stock") return [{ stock: { sort: "desc", nulls: "last" } }, { id: "asc" }];
  if (sort === "newest") return [{ createdAt: "desc" }, { id: "asc" }];
  return [{ isFeatured: "desc" }, { createdAt: "desc" }, { id: "asc" }];
}
export function categoryLabel(value: string) { return value.replace(/[_-]/g, " ").replace(/\b\w/g, character => character.toUpperCase()); }
