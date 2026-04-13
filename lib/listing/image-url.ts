/** Optional main image: full http(s) URL, or empty → null. */
export function parseListingImageUrl(raw: string): { ok: true; value: string | null } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: true, value: null };
  if (t.length > 2048) return { ok: false, error: "Image URL is too long." };
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, error: "Image URL must use http:// or https://." };
    }
    return { ok: true, value: t };
  } catch {
    return { ok: false, error: "Enter a valid image URL." };
  }
}
