export type HomeItem = {
  id: string;
  name: string;
  brand: string;
  storeId?: string;
  featured?: boolean;
  href: string;
  image: string | null;
  priceLabel: string;
  group: string;
  region?: string;
  dateLabel?: string;
  preview?: boolean;
  saved?: boolean;
};

export type HomeStore = {
  id: string;
  name: string;
  href: string;
  image: string | null;
  logo: string | null;
  tagline: string | null;
  region: string;
  preview?: boolean;
};
