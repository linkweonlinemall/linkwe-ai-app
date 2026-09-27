export function matchesProductOptions(product: { stock: number | null; hasVariants: boolean; variants: { attributes: unknown; stock?: number | null }[] }, colour: string, size: string, inStock: boolean) {
  const normal = (value: string) => value.trim().toLowerCase();
  const matches = (attributes: unknown, name: string, value: string) => !value || Array.isArray(attributes) && attributes.some(a => a && typeof a === "object" && typeof a.name === "string" && typeof a.value === "string" && (normal(a.name) === name || name === "colour" && normal(a.name) === "color") && normal(a.value) === normal(value));
  if (colour || size) return product.variants.some(v => (!inStock || v.stock === null || typeof v.stock === "number" && v.stock > 0) && matches(v.attributes,"colour",colour) && matches(v.attributes,"size",size));
  if (!inStock) return true;
  return product.hasVariants ? product.variants.some(v => v.stock === null || typeof v.stock === "number" && v.stock > 0) : product.stock === null || product.stock > 0;
}
