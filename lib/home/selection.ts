import type { HomeItem } from "./types";

// Photo choices reviewed for clarity, composition and fit in the homepage cards.
// These are soft preferences: other photographed listings still join the rotation.
const editorialPhotos = new Set([
  "maracas-is-calling-graphic-tee",
  "be-original-barcode-graphic-tee",
  "be-kind-to-your-mind-graphic-tee",
  "bake-and-shark-with-everything",
  "yuh-war-sorrel-owa",
  "professional-portrait-photography",
  "event-wedding-photography",
  "couples-lifestyle-photography",
  "sugar-coat-nails-services",
  "baking-services",
]);

export function homepageImage(images: readonly string[]): string | null {
  return images.map((image) => image.trim()).find((image) =>
    /^(https?:\/\/|\/(?!\/))/.test(image) &&
    !/(?:placeholder|no[-_]image|default[-_]product)(?:[./_-]|$)/i.test(image)
  ) ?? null;
}

/** Pick once on the server: stable during browsing, fresh on the next visit. */
export function selectHomeItems(
  items: readonly HomeItem[],
  limit: number,
  random: () => number = Math.random,
): HomeItem[] {
  const unique = new Map(items.map((item) => [item.id, item]));
  const ranked = [...unique.values()]
    .filter((item) => item.image && homepageImage([item.image]))
    .map((item) => {
      const slug = item.href.split(/[?#]/)[0].split("/").filter(Boolean).at(-1) ?? "";
      const weight = 1 + (editorialPhotos.has(slug) ? 2 : 0) + (item.featured ? 1 : 0);
      // Weighted sampling without replacement, with a fresh random order per request.
      return { item, rank: -Math.log(Math.max(Number.EPSILON, random())) / weight };
    })
    .sort((a, b) => a.rank - b.rank);

  const vendors = new Map<string, HomeItem[]>();
  for (const { item } of ranked) {
    const vendor = item.storeId ?? item.brand.trim().toLowerCase();
    const bucket = vendors.get(vendor) ?? [];
    bucket.push(item);
    vendors.set(vendor, bucket);
  }

  // Each store gets one place before any store gets a second, including the
  // first three service cards and first six products visible above the fold.
  const selected: HomeItem[] = [];
  while (selected.length < limit) {
    let added = false;
    for (const bucket of vendors.values()) {
      const item = bucket.shift();
      if (!item) continue;
      selected.push(item);
      added = true;
      if (selected.length >= limit) break;
    }
    if (!added) break;
  }
  return selected;
}
