/**
 * Returns true only for HTTPS URLs hosted on Cloudinary.
 * Used to prevent non-Cloudinary URLs (including hallucinated ones) from
 * being written to the database by Rex image tools.
 */
export function isTrustedHostedImageUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === "https:" && u.hostname.toLowerCase().endsWith("cloudinary.com")
  } catch {
    return false
  }
}
