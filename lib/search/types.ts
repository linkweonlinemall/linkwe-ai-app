export type SearchProductResult = {
  type: "product";
  /** Always false for rows from the products query; checked at render for safety. */
  isService: boolean;
  id: string;
  name: string;
  slug: string;
  price: number;
  priceFrom?: boolean;
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
  serviceType?: string | null;
  serviceLocation?: string | null;
  quotePriceType?: string | null;
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

export type SearchEventResult = {type:"event";id:string;title:string;slug:string;image:string|null;region:string|null;startDate:string;isOnline:boolean;category:string|null;price:number|null;priceLabel:string;availability:string;storeName:string};
export type SearchFacets = {brands:string[];sizes:string[];colours:{value:string;hex:string}[]};
export type UniversalSearchResponse = {
  page?: number;
  pages?: number;
  facets?: SearchFacets;
  query: string;
  detectedRegion: string | null;
  results: {
    products: SearchProductResult[];
    services: SearchServiceResult[];
    stores: SearchStoreResult[];
    events?: SearchEventResult[];
    total: number;
  };
  counts: {
    products: number;
    services: number;
    stores: number;
    events?: number;
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
      events: [],
      total: 0,
    },
    counts: {
      products: 0,
      services: 0,
      stores: 0,
      events: 0,
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
  const events = Array.isArray(o.results?.events) ? o.results.events : [];
  const total =
    typeof o.results?.total === "number"
      ? o.results.total
      : products.length + services.length + stores.length + events.length;

  return {
    query: typeof o.query === "string" ? o.query : fallbackQuery,
    detectedRegion: o.detectedRegion ?? null,
    page: o.page, pages: o.pages, facets: o.facets,
    results: { products, services, stores, events, total },
    counts: {
      products: typeof o.counts?.products === "number" ? o.counts.products : products.length,
      services: typeof o.counts?.services === "number" ? o.counts.services : services.length,
      stores: typeof o.counts?.stores === "number" ? o.counts.stores : stores.length,
      events: typeof o.counts?.events === "number" ? o.counts.events : events.length,
    },
  };
}
