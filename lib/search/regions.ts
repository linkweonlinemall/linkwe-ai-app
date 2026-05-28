import { TRINIDAD_ONBOARDING_REGION_OPTIONS } from "@/lib/onboarding/tt-region-options";
import { normalizeRegion } from "@/lib/regions/tt-regions";

/** Multi-word and alias phrases → canonical region slug (longest first). */
const REGION_PHRASES: readonly { phrase: string; value: string }[] = [
  { phrase: "port of spain", value: "port of spain" },
  { phrase: "san fernando", value: "san fernando" },
  { phrase: "princes town", value: "princes town" },
  { phrase: "rio claro", value: "rio claro" },
  { phrase: "sangre grande", value: "sangre grande" },
  { phrase: "diego martin", value: "diego martin" },
  { phrase: "crown point", value: "crown point" },
  { phrase: "scarborough", value: "scarborough" },
  { phrase: "chaguanas", value: "chaguanas" },
  { phrase: "barataria", value: "barataria" },
  { phrase: "tunapuna", value: "tunapuna" },
  { phrase: "maraval", value: "maraval" },
  { phrase: "fyzabad", value: "fyzabad" },
  { phrase: "siparia", value: "siparia" },
  { phrase: "couva", value: "couva" },
  { phrase: "arima", value: "arima" },
  { phrase: "tobago", value: "tobago" },
].sort((a, b) => b.phrase.length - a.phrase.length);

const SINGLE_WORD_REGIONS = new Map(
  TRINIDAD_ONBOARDING_REGION_OPTIONS.map((r) => [normalizeRegion(r.value), r.value]),
);

export type ParsedSearchQuery = {
  searchTerms: string;
  detectedRegion: string | null;
};

export function extractRegionFromQuery(rawQuery: string): ParsedSearchQuery {
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return { searchTerms: "", detectedRegion: null };
  }

  let working = ` ${normalizeRegion(trimmed)} `;
  let detected: string | null = null;

  for (const { phrase, value } of REGION_PHRASES) {
    const needle = ` ${phrase} `;
    if (working.includes(needle)) {
      detected = value;
      working = working.split(needle).join(" ");
      break;
    }
  }

  if (!detected) {
    const words = trimmed.split(/\s+/).filter(Boolean);
    const kept: string[] = [];
    for (const word of words) {
      const n = normalizeRegion(word);
      if (SINGLE_WORD_REGIONS.has(n)) {
        detected = SINGLE_WORD_REGIONS.get(n)!;
      } else {
        kept.push(word);
      }
    }
    return {
      searchTerms: kept.join(" ").trim(),
      detectedRegion: detected,
    };
  }

  const searchTerms = working.replace(/\s+/g, " ").trim();
  return { searchTerms, detectedRegion: detected };
}
