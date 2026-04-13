const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeStoreSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateStoreSlug(slug: string): string | null {
  const s = normalizeStoreSlug(slug);
  if (!s) return "Store slug is required.";
  if (s.length < 3) return "Slug must be at least 3 characters.";
  if (s.length > 64) return "Slug must be at most 64 characters.";
  if (!SLUG_PATTERN.test(s)) {
    return "Use lowercase letters, numbers, and single hyphens between words (e.g. my-cool-shop).";
  }
  return null;
}
