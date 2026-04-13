import {
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
