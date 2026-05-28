import type { SearchProductResult, SearchServiceResult } from "@/lib/search/types";

export function isServiceCatalogItem(item: {
  type?: string;
  isService?: boolean;
}): boolean {
  return item.type === "service" || item.isService === true;
}

export function productResultAsService(p: SearchProductResult): SearchServiceResult {
  return {
    type: "service",
    id: p.id,
    title: p.name,
    slug: p.slug,
    price: p.price,
    images: p.images,
    category: p.category,
    durationMinutes: 60,
    store: p.store,
    averageRating: p.averageRating,
    reviewCount: p.reviewCount,
  };
}
