import {
  REGIONS_TRINIDAD_METRO,
  REGIONS_TRINIDAD_EXTENDED,
  REGIONS_TRINIDAD_REMOTE,
  REGIONS_TOBAGO_METRO,
  REGIONS_SCHEDULE_DEEP_SOUTH_EAST,
  REGIONS_SCHEDULE_DEEP_SOUTH_WEST,
  REGIONS_SCHEDULE_HIGH_EAST,
} from "@/lib/shipping/trinidad-zoning";
import { TRINIDAD_ONBOARDING_REGION_OPTIONS } from "@/lib/onboarding/tt-region-options";
import { canonicalRegionValue } from "@/lib/regions/region-canonical";

export const TT_REGIONS = TRINIDAD_ONBOARDING_REGION_OPTIONS;

export const TT_REGION_VALUES = new Set(
  TRINIDAD_ONBOARDING_REGION_OPTIONS.map((r) => r.value),
);

export function normalizeRegion(region: string): string {
  return region.trim().toLowerCase();
}

export { canonicalRegionValue } from "@/lib/regions/region-canonical";

export function isValidRegion(region: string): boolean {
  return TT_REGION_VALUES.has(canonicalRegionValue(region));
}

export function getRegionLabel(slug: string): string {
  const normalized = normalizeRegion(slug);
  const match = TRINIDAD_ONBOARDING_REGION_OPTIONS.find(
    (r) => r.value === normalized,
  );
  if (match) return match.label;
  return slug
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function titleCase(slug: string): string {
  return slug
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function toOptions(regions: readonly string[]) {
  const seen = new Set<string>();
  return regions
    .map((r) => canonicalRegionValue(r))
    .filter((r) => {
      if (!r || !TT_REGION_VALUES.has(r) || seen.has(r)) return false;
      seen.add(r);
      return true;
    })
    .map((r) => ({ value: r, label: titleCase(r) }));
}

// Build a "catch-all" group for any region not in the named zone arrays
const namedRegions = new Set([
  ...REGIONS_TRINIDAD_METRO,
  ...REGIONS_TRINIDAD_EXTENDED,
  ...REGIONS_TRINIDAD_REMOTE,
  ...REGIONS_TOBAGO_METRO,
  ...REGIONS_SCHEDULE_DEEP_SOUTH_EAST,
  ...REGIONS_SCHEDULE_DEEP_SOUTH_WEST,
  ...REGIONS_SCHEDULE_HIGH_EAST,
].map((r) => r.trim().toLowerCase()));

const otherRegions = TRINIDAD_ONBOARDING_REGION_OPTIONS.filter(
  (r) => !namedRegions.has(r.value),
);

export const TT_REGION_GROUPS: readonly {
  label: string;
  regions: readonly { value: string; label: string }[];
}[] = [
  {
    label: "Trinidad — Metro",
    regions: toOptions(REGIONS_TRINIDAD_METRO),
  },
  {
    label: "Trinidad — Extended",
    regions: toOptions([
      ...REGIONS_TRINIDAD_EXTENDED,
      ...REGIONS_SCHEDULE_DEEP_SOUTH_EAST,
      ...REGIONS_SCHEDULE_DEEP_SOUTH_WEST,
      ...REGIONS_SCHEDULE_HIGH_EAST,
    ]),
  },
  {
    label: "Trinidad — Remote",
    regions: toOptions(REGIONS_TRINIDAD_REMOTE),
  },
  {
    label: "Tobago",
    regions: toOptions(REGIONS_TOBAGO_METRO),
  },
  ...(otherRegions.length > 0
    ? [{ label: "Other", regions: otherRegions }]
    : []),
].filter((g) => g.regions.length > 0);

/** Flat list of regions for filters — one entry per value (no duplicate React keys). */
export function getFlatRegionOptions(): { value: string; label: string }[] {
  const seen = new Set<string>();
  const out: { value: string; label: string }[] = [];
  for (const group of TT_REGION_GROUPS) {
    for (const r of group.regions) {
      const value = canonicalRegionValue(r.value);
      if (seen.has(value)) continue;
      seen.add(value);
      out.push({ value, label: r.label });
    }
  }
  return out;
}
