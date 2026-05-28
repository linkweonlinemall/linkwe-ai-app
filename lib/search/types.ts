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
