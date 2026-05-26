import {
  normalizeRegion,
  REGIONS_SCHEDULE_DEEP_SOUTH_EAST,
  REGIONS_SCHEDULE_DEEP_SOUTH_WEST,
  REGIONS_SCHEDULE_HIGH_EAST,
  REGIONS_TOBAGO_METRO,
  REGIONS_TRINIDAD_EXTENDED,
  REGIONS_TRINIDAD_METRO,
  REGIONS_TRINIDAD_REMOTE,
} from "@/lib/shipping/trinidad-zoning";

function titleCaseRegion(slug: string): string {
  return slug
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Unique Trinidad & Tobago region keys for account / store dropdowns (Phase A). */
export const TRINIDAD_ONBOARDING_REGION_OPTIONS: readonly { value: string; label: string }[] = (() => {
  const merged = [
    ...REGIONS_TRINIDAD_METRO,
    ...REGIONS_TRINIDAD_EXTENDED,
    ...REGIONS_TRINIDAD_REMOTE,
    ...REGIONS_TOBAGO_METRO,
    ...REGIONS_SCHEDULE_DEEP_SOUTH_EAST,
    ...REGIONS_SCHEDULE_DEEP_SOUTH_WEST,
    ...REGIONS_SCHEDULE_HIGH_EAST,
  ];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const r of merged) {
    const v = r.trim().toLowerCase();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    unique.push(v);
  }
  unique.sort((a, b) => a.localeCompare(b));
  return unique.map((value) => ({ value, label: titleCaseRegion(value) }));
})();

/** Best-effort match of a Trinidad & Tobago onboarding region label from geocoder/auto-fill text (used by checkout StoreLocationPicker).
 *
 * - Normalizes hyphenated localities (“Tunapuna-Piarco”) to spaced text for substring search.
 * - Tries longest region strings first so `tunapuna` wins inside `tunapuna piarco` before shorter substrings such as `piarco`.
 */
export function detectOnboardingRegionFromAddress(address: string): string | null {
  if (!address.trim()) return null;

  const byLongestFirst = [...TRINIDAD_ONBOARDING_REGION_OPTIONS].sort(
    (a, b) => normalizeRegion(b.value).length - normalizeRegion(a.value).length,
  );

  /** Match normalized haystack contains option name (prefer longer option names via caller sorting). */
  function matchSubstring(haystack: string): string | null {
    for (const option of byLongestFirst) {
      const optN = normalizeRegion(option.value);
      if (!optN) continue;
      if (haystack.includes(optN)) {
        return option.value;
      }
    }
    return null;
  }

  const normalizedFull = normalizeRegion(address.replace(/-/g, " ")).replace(/\s+/g, " ");
  const fromFull = matchSubstring(normalizedFull);
  if (fromFull) return fromFull;

  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    const partNorm = normalizeRegion(part.replace(/-/g, " ")).replace(/\s+/g, " ");
    const fromPart = matchSubstring(partNorm);
    if (fromPart) return fromPart;

    // Hyphenated segments only in this comma chunk (handles "Tunapuna-Piarco" before ", Trinidad...")
    const segments = part
      .split(/-|–/)
      .map((s) => normalizeRegion(s.trim()).replace(/\s+/g, " "))
      .filter(Boolean);
    for (const seg of segments) {
      const fromSeg = matchSubstring(seg);
      if (fromSeg) return fromSeg;
      // Exact normalized segment equality (whole segment is one region keyword)
      for (const option of byLongestFirst) {
        const optN = normalizeRegion(option.value);
        if (optN && seg === optN) {
          return option.value;
        }
      }
    }
  }

  return null;
}
