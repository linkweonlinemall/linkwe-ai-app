export type ShopProduct = {
  id: string; name: string; slug: string; price: number; compareAtPrice: number | null;
  images: string[]; category: string | null; brand: string | null; stock: number | null;
  condition: string | null; isFeatured: boolean; hasVariants: boolean; isDigital: boolean;
  allowPickup: boolean; allowDelivery: boolean; preview?: boolean;
  store: { name: string; slug: string; region: string | null; logoUrl: string | null };
  variants: { stock: number | null }[];
  rating?: { avg: number; count: number };
};
export type ShopFilterOptions = {
  categories: { value: string; label: string; count: number }[];
  brands: string[]; regions: { value: string; label: string }[];
  colours: { value: string; hex: string }[]; sizes: string[];
};
