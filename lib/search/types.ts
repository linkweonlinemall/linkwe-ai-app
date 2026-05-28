export type SearchProductResult = {
  type: "product";
  /** Always false for rows from the products query; checked at render for safety. */
  isService: boolean;
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  category: string | null;
  store: {
    name: string;
    slug: string;
    region: string;
  };
  averageRating: number | null;
  reviewCount: number;
};

export type SearchServiceResult = {
  type: "service";
  id: string;
  title: string;
  slug: string;
  price: number;
  images: string[];
  category: string | null;
  durationMinutes: number;
  store: {
    name: string;
    slug: string;
    region: string;
  };
  averageRating: number | null;
  reviewCount: number;
};

export type SearchStoreResult = {
  type: "store";
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  category: string;
  region: string;
  tags: string[];
  productCount: number;
  averageRating: number | null;
  reviewCount: number;
};

export type UniversalSearchResponse = {
  query: string;
  detectedRegion: string | null;
  results: {
    products: SearchProductResult[];
    services: SearchServiceResult[];
    stores: SearchStoreResult[];
    total: number;
  };
  counts: {
    products: number;
    services: number;
    stores: number;
  };
};

export function emptyUniversalSearchResponse(query = ""): UniversalSearchResponse {
  return {
    query,
    detectedRegion: null,
    results: {
      products: [],
      services: [],
      stores: [],
      total: 0,
    },
    counts: {
      products: 0,
      services: 0,
      stores: 0,
    },
  };
}

/** Coerce API / cache payloads so clients never read null `results`. */
export function normalizeUniversalSearchResponse(
  raw: unknown,
  fallbackQuery = "",
): UniversalSearchResponse {
  if (!raw || typeof raw !== "object") {
    return emptyUniversalSearchResponse(fallbackQuery);
  }

  const o = raw as Partial<UniversalSearchResponse>;
  const products = Array.isArray(o.results?.products) ? o.results.products : [];
  const services = Array.isArray(o.results?.services) ? o.results.services : [];
  const stores = Array.isArray(o.results?.stores) ? o.results.stores : [];
  const total =
    typeof o.results?.total === "number"
      ? o.results.total
      : products.length + services.length + stores.length;

  return {
    query: typeof o.query === "string" ? o.query : fallbackQuery,
    detectedRegion: o.detectedRegion ?? null,
    results: { products, services, stores, total },
    counts: {
      products: typeof o.counts?.products === "number" ? o.counts.products : products.length,
      services: typeof o.counts?.services === "number" ? o.counts.services : services.length,
      stores: typeof o.counts?.stores === "number" ? o.counts.stores : stores.length,
    },
  };
}
