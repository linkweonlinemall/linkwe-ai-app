export const RECORD_FIELDS = {
  product: ["name", "slug", "description", "shortDescription", "category", "price", "compareAtPrice", "stock", "sku", "brand", "condition", "weight", "weightUnit", "length", "width", "height", "isPublished", "isFeatured", "allowDelivery", "allowPickup", "returnPolicy", "metaTitle", "metaDescription", "tags", "images"],
  store: ["name", "slug", "tagline", "description", "region", "address", "latitude", "longitude", "logoUrl", "coverPhotoUrl", "tags", "amenities", "policies"],
  user: ["fullName", "email", "phone", "region", "role"],
  listing: ["title", "slug", "description", "shortDescription", "imageUrl", "priceMinor", "currency", "status"],
} as const;
export type RecordKind = keyof typeof RECORD_FIELDS;
