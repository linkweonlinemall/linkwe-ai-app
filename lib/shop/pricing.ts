import type { ShopQuery } from "./query";

type PriceProduct = {
  price: number; compareAtPrice: number | null; stock: number | null; hasVariants: boolean;
  variants: { price: number | null; stock: number | null; attributes: unknown }[];
};
export function isDiscounted(price: number, compareAtPrice: number | null) {
  return Number.isFinite(price) && price >= 0 && compareAtPrice !== null && Number.isFinite(compareAtPrice) && compareAtPrice > price;
}
function attributeMatches(attributes: unknown, name: string, value: string) {
  if (!value) return true;
  return Array.isArray(attributes) && attributes.some(attribute => attribute && typeof attribute === "object" &&
    typeof attribute.name === "string" && typeof attribute.value === "string" &&
    (attribute.name.trim().toLowerCase() === name || name === "colour" && attribute.name.trim().toLowerCase() === "color") && attribute.value.trim().toLowerCase() === value.trim().toLowerCase());
}
/** All refinements must be satisfied by the same purchasable option. Null variant prices inherit the base price. */
export function matchingPrices(product: PriceProduct, query: ShopQuery): number[] {
  if (query.inStock && product.stock !== null && product.stock <= 0) return [];
  const options = product.hasVariants ? product.variants : [{ price: product.price, stock: product.stock, attributes: [] }];
  return options.filter(option => (!query.inStock || option.stock === null || option.stock > 0) &&
    attributeMatches(option.attributes, "colour", query.colour) && attributeMatches(option.attributes, "size", query.size))
    .map(option => option.price ?? product.price)
    .filter(price => Number.isFinite(price) && price >= 0 &&
      (query.minPrice === undefined || price >= query.minPrice) &&
      (query.maxPrice === undefined || price <= query.maxPrice) &&
      (!query.onSale || isDiscounted(price, product.compareAtPrice)));
}
export function displayPricing(product: PriceProduct, query: ShopQuery) {
  const prices = matchingPrices(product, query);
  return { displayPrice: prices.length ? Math.min(...prices) : product.price, displayPriceFrom: new Set(prices).size > 1 };
}
