/** Alternate spellings → one slug for UI lists (shipping arrays keep all forms for zone lookup). */
const REGION_CANONICAL: Record<string, string> = {
  "saint augustine": "st augustine",
  "saint james": "st james",
  "d abadie": "dabadie",
  "west moorings": "westmoorings",
  "mount saint george": "mount st george",
  "st anns": "st ann s",
  pos: "port of spain",
};

export function normalizeRegionSlug(region: string): string {
  return region.trim().toLowerCase();
}

export function canonicalRegionValue(slug: string): string {
  const n = normalizeRegionSlug(slug);
  return REGION_CANONICAL[n] ?? n;
}
