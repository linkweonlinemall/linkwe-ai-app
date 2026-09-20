const TRINIDAD_AND_TOBAGO_COUNTRY_CODE = "1868";

export function normalizeWhatsAppUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(?:wa\.me|(?:api\.)?whatsapp\.com)\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  const internationalNumber =
    digits.length === 7
      ? `${TRINIDAD_AND_TOBAGO_COUNTRY_CODE}${digits}`
      : digits.length === 10 && digits.startsWith("868")
        ? `1${digits}`
        : digits;

  return `https://wa.me/${internationalNumber}`;
}

const STORE_SOCIAL_PLATFORMS = [
  ["instagram", "Instagram", "www.instagram.com/"],
  ["facebook", "Facebook", "www.facebook.com/"],
  ["x", "X", "x.com/"],
  ["tiktok", "TikTok", "www.tiktok.com/@"],
  ["youtube", "YouTube", "www.youtube.com/@"],
  ["linkedin", "LinkedIn", "www.linkedin.com/in/"],
  ["whatsapp", "WhatsApp", ""],
  ["website", "Website", ""],
] as const;

/** Store settings accept either a full social URL or a handle. */
export function getStoreSocialLinks(links: Record<string, string>) {
  return STORE_SOCIAL_PLATFORMS.flatMap(([key, platform, base]) => {
    const value = links[key]?.trim();
    if (!value) return [];
    let url: string;
    if (key === "whatsapp") url = normalizeWhatsAppUrl(value);
    else if (/^https?:\/\//i.test(value)) url = value;
    else if (key === "website" || /^(?:www\.)?(?:instagram\.com|facebook\.com|x\.com|twitter\.com|tiktok\.com|youtube\.com|youtu\.be|linkedin\.com)\//i.test(value)) url = `https://${value}`;
    else url = `https://${base}${value.replace(/^@/, "")}`;
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) return [];
      return [{ key, platform, url: parsed.href }];
    } catch { return []; }
  });
}
