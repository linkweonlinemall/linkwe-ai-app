import type { VariantAttribute } from "@/components/product/VariantSelector";

export type ProductOption = {
  id: string; name: string; sku: string | null; attributes: VariantAttribute[];
  price: number | null; stock: number | null; images: string[];
};

export type ProductDisplayData = {
  id: string; name: string; slug: string; storeId: string;
  description: string | null; shortDescription: string | null; price: number;
  compareAtPrice: number | null; images: string[]; category: string | null;
  brand: string | null; tags: string[]; condition: string | null; sku: string | null; stock: number | null;
  weight: number | null; weightUnit: string | null; length: number | null; width: number | null; height: number | null;
  allowDelivery: boolean; allowPickup: boolean; deliveryFee: number | null; deliveryRegions: string[]; returnPolicy: string | null;
  latitude: number | null; longitude: number | null; address: string | null;
  isFeatured: boolean; hasVariants: boolean; isDigital: boolean;
  fileType: string | null; fileSizeKb: number | null; downloadLimit: number | null;
  downloadExpiryDays: number | null; previewUrl: string | null; licenceType: string | null; checkoutFields: unknown;
  store: {
    name: string; slug: string; logoUrl: string | null; region: string;
    address: string | null; latitude: number | null; longitude: number | null;
    policies: string | null; checkoutFields: unknown;
  };
};

export function productLabel(value: string) {
  return value.toLowerCase().split(/[_\s]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export function productSpecifications(product: ProductDisplayData): [string, string][] {
  const rows: [string, string][] = [];
  if (product.brand) rows.push(["Brand", product.brand]);
  if (product.sku) rows.push(["Product code", product.sku]);
  if (product.category) rows.push(["Category", productLabel(product.category)]);
  if (product.condition) rows.push(["Condition", productLabel(product.condition)]);
  if (product.weight != null) rows.push(["Weight", `${product.weight}${product.weightUnit ? ` ${product.weightUnit.toLowerCase()}` : ""}`]);
  // Vendors can enter individual dimensions; keep every supplied measurement visible.
  for (const [key, label] of [["length", "Length"], ["width", "Width"], ["height", "Height"]] as const) {
    if (product[key] != null) rows.push([label, `${product[key]} cm`]);
  }
  return rows;
}

export function digitalSpecifications(product: Pick<ProductDisplayData, "fileType" | "fileSizeKb" | "downloadLimit" | "downloadExpiryDays" | "licenceType">): [string, string][] {
  const rows: [string, string][] = [];
  if (product.fileType) rows.push(["File format", product.fileType.toUpperCase()]);
  if (product.fileSizeKb != null) rows.push(["File size", product.fileSizeKb >= 1024 ? `${(product.fileSizeKb / 1024).toFixed(1)} MB` : `${product.fileSizeKb} KB`]);
  rows.push(["Downloads", product.downloadLimit == null ? "Unlimited downloads" : `${product.downloadLimit} per purchase`]);
  rows.push(["Download access", product.downloadExpiryDays == null ? "No expiry" : `${product.downloadExpiryDays} days after purchase`]);
  if (product.licenceType) rows.push(["Licence", ({ PERSONAL: "Personal use", COMMERCIAL: "Commercial use", EXTENDED: "Extended commercial use" } as Record<string, string>)[product.licenceType] ?? productLabel(product.licenceType)]);
  return rows;
}

export function parseProductAttributes(value: unknown): VariantAttribute[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(entry => {
    if (!entry || typeof entry !== "object" || typeof entry.name !== "string" || typeof entry.value !== "string") return [];
    return [{ name: entry.name, value: entry.value, ...(typeof entry.hex === "string" ? { hex: entry.hex } : {}) }];
  });
}

/** Keep compatible choices, but never trap a shopper in one valid combination. */
export function selectProductAttribute(variants: ProductOption[], selected: Record<string, string>, name: string, value: string) {
  const next: Record<string, string> = { [name]: value };
  const matches = (variant: ProductOption, choices: Record<string, string>) => Object.entries(choices).every(([key, choice]) => variant.attributes.some(attribute => attribute.name === key && attribute.value === choice));
  for (const [key, choice] of Object.entries(selected)) {
    if (key !== name && variants.some(variant => matches(variant, { ...next, [key]: choice }))) next[key] = choice;
  }
  const names = new Set(variants.flatMap(variant => variant.attributes.map(attribute => attribute.name)));
  const complete = [...names].every(key => next[key] !== undefined);
  return { selected: next, variant: complete ? variants.find(variant => matches(variant, next)) ?? null : null, complete };
}

export function productPurchaseState(basePrice: number, baseStock: number | null, hasVariants: boolean, variants: ProductOption[], selected: ProductOption | null) {
  const prices = hasVariants && !selected && variants.length ? variants.map(variant => variant.price ?? basePrice) : [selected?.price ?? basePrice];
  const stock = hasVariants ? selected?.stock ?? null : baseStock;
  return { minPrice: Math.min(...prices), maxPrice: Math.max(...prices), stock, canPurchase: (!hasVariants || !!selected) && stock !== 0 };
}
