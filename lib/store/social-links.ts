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
