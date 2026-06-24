/**
 * Self-delivery 16-zone model — PARALLEL to LinkWe courier zones in trinidad-zoning.ts.
 * Do NOT use getShippingZone() for SELF delivery once wired (Phase 3+).
 *
 * Rates from getDefaultRatesForHomeZone are in TTD **major units** (whole dollars).
 * Phase 2+ may convert to minor (cents) when persisting VendorShippingRate.rateMinor.
 */

import { canonicalRegionValue } from "@/lib/regions/region-canonical";
import { TRINIDAD_ONBOARDING_REGION_OPTIONS } from "@/lib/onboarding/tt-region-options";

// --- Zone identity ---

export type SelfDeliveryZone =
  | "NW_POS_DIEGO_MARTIN"
  | "NORTH_SANJUAN_FOOTHILLS"
  | "EAST_TUNAPUNA_ARIMA"
  | "CENTRAL_CHAGUANAS_COUVA"
  | "CENTRAL_EAST_TALPARO_TABAQUITE"
  | "SOUTH_SANFERNANDO_PRINCESTOWN"
  | "SW_PENAL_DEBE_FYZABAD"
  | "POINT_FORTIN_LA_BREA"
  | "NORTHERN_VALLEYS"
  | "NORTH_COAST"
  | "NORTHEAST_SANGREGRANDE"
  | "NORTHEAST_COAST_TOCO"
  | "DEEP_SW_CEDROS_ICACOS"
  | "SOUTHEAST_MAYARO"
  | "TOBAGO_SW"
  | "TOBAGO_NE";

export const SELF_DELIVERY_ZONES: readonly SelfDeliveryZone[] = [
  "NW_POS_DIEGO_MARTIN",
  "NORTH_SANJUAN_FOOTHILLS",
  "EAST_TUNAPUNA_ARIMA",
  "CENTRAL_CHAGUANAS_COUVA",
  "CENTRAL_EAST_TALPARO_TABAQUITE",
  "SOUTH_SANFERNANDO_PRINCESTOWN",
  "SW_PENAL_DEBE_FYZABAD",
  "POINT_FORTIN_LA_BREA",
  "NORTHERN_VALLEYS",
  "NORTH_COAST",
  "NORTHEAST_SANGREGRANDE",
  "NORTHEAST_COAST_TOCO",
  "DEEP_SW_CEDROS_ICACOS",
  "SOUTHEAST_MAYARO",
  "TOBAGO_SW",
  "TOBAGO_NE",
] as const;

export const SELF_DELIVERY_ZONE_LABELS: Record<SelfDeliveryZone, string> = {
  NW_POS_DIEGO_MARTIN: "North-West (POS & Diego Martin)",
  NORTH_SANJUAN_FOOTHILLS: "North (San Juan & Foothills)",
  EAST_TUNAPUNA_ARIMA: "East (Tunapuna & Arima)",
  CENTRAL_CHAGUANAS_COUVA: "Central (Chaguanas & Couva)",
  CENTRAL_EAST_TALPARO_TABAQUITE: "Central-East (Talparo & Tabaquite)",
  SOUTH_SANFERNANDO_PRINCESTOWN: "South (San Fernando & Princes Town)",
  SW_PENAL_DEBE_FYZABAD: "South-West (Penal, Debe & Fyzabad)",
  POINT_FORTIN_LA_BREA: "Point Fortin & La Brea",
  NORTHERN_VALLEYS: "Northern Valleys",
  NORTH_COAST: "North Coast",
  NORTHEAST_SANGREGRANDE: "North-East (Sangre Grande)",
  NORTHEAST_COAST_TOCO: "North-East Coast (Toco)",
  DEEP_SW_CEDROS_ICACOS: "Deep South-West (Cedros & Icacos)",
  SOUTHEAST_MAYARO: "South-East (Mayaro)",
  TOBAGO_SW: "Tobago South-West",
  TOBAGO_NE: "Tobago North-East",
};

const SELF_DELIVERY_ZONE_SET = new Set<string>(SELF_DELIVERY_ZONES);

export function isSelfDeliveryZone(zone: string): zone is SelfDeliveryZone {
  return SELF_DELIVERY_ZONE_SET.has(zone);
}

/** UI grouping for the vendor shipping settings page. */
export const SELF_DELIVERY_ZONE_GROUPS: readonly {
  title: string;
  zones: readonly SelfDeliveryZone[];
}[] = [
  {
    title: "Main areas",
    zones: [
      "NW_POS_DIEGO_MARTIN",
      "NORTH_SANJUAN_FOOTHILLS",
      "EAST_TUNAPUNA_ARIMA",
      "CENTRAL_CHAGUANAS_COUVA",
      "CENTRAL_EAST_TALPARO_TABAQUITE",
      "SOUTH_SANFERNANDO_PRINCESTOWN",
      "SW_PENAL_DEBE_FYZABAD",
      "POINT_FORTIN_LA_BREA",
    ],
  },
  {
    title: "Remote areas",
    zones: [
      "NORTHERN_VALLEYS",
      "NORTH_COAST",
      "NORTHEAST_SANGREGRANDE",
      "NORTHEAST_COAST_TOCO",
      "DEEP_SW_CEDROS_ICACOS",
      "SOUTHEAST_MAYARO",
    ],
  },
  {
    title: "Tobago",
    zones: ["TOBAGO_SW", "TOBAGO_NE"],
  },
];

/** Fallback when region is empty or not in any zone set (central, well-connected hub). */
export const SELF_DELIVERY_DEFAULT_ZONE: SelfDeliveryZone = "CENTRAL_CHAGUANAS_COUVA";

// --- Default rate tiers (TTD major units) ---

export const SELF_DELIVERY_TIER_HOME = 15;
export const SELF_DELIVERY_TIER_NEAR = 25;
export const SELF_DELIVERY_TIER_MID = 40;
export const SELF_DELIVERY_TIER_FAR = 60;
export const SELF_DELIVERY_TIER_CROSS_ISLAND = 90;

/** Always FAR tier regardless of hop distance (delivery-difficulty remote areas). */
export const REMOTE_SELF_DELIVERY_ZONES: readonly SelfDeliveryZone[] = [
  "NORTHERN_VALLEYS",
  "NORTH_COAST",
  "NORTHEAST_COAST_TOCO",
  "DEEP_SW_CEDROS_ICACOS",
  "SOUTHEAST_MAYARO",
] as const;

function isTobagoZone(zone: SelfDeliveryZone): boolean {
  return zone === "TOBAGO_SW" || zone === "TOBAGO_NE";
}

function isCrossIsland(home: SelfDeliveryZone, target: SelfDeliveryZone): boolean {
  return isTobagoZone(home) !== isTobagoZone(target);
}

// --- Region normalization (mirrors trinidad-zoning normalizeRegion; separate copy) ---

export function normalizeSelfDeliveryRegion(raw: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/[.,']/g, "")
    .replace(/\s+/g, " ")
    .replace(/\bst\b\.?/g, "saint")
    .replace(/\bmt\b\.?/g, "mount");
}

function canonicalSelfDeliveryKey(raw: string): string {
  return canonicalRegionValue(normalizeSelfDeliveryRegion(raw));
}

// --- Area → zone mapping (16 independent region lists) ---

export const REGIONS_BY_SELF_DELIVERY_ZONE: Record<SelfDeliveryZone, readonly string[]> = {
  NW_POS_DIEGO_MARTIN: [
    "port of spain",
    "pos",
    "woodbrook",
    "st james",
    "saint james",
    "st clair",
    "saint clair",
    "belmont",
    "mucurapo",
    "gonzales",
    "newtown",
    "east dry river",
    "laventille",
    "diego martin",
    "petit valley",
    "carenage",
    "westmoorings",
    "west moorings",
    "cocorite",
    "four roads",
    "diamond vale",
    "glencoe",
    "goodwood park",
    "l anse mitan",
    "lanse mitan",
    "patna village",
    "patna",
    "dibe",
    "boissiere village",
    "maraval",
  ],
  NORTH_SANJUAN_FOOTHILLS: [
    "san juan",
    "barataria",
    "aranguez",
    "el socorro",
    "morvant",
    "champs fleurs",
    "champs fleur",
    "mount lambert",
    "mt lambert",
    "mount d or",
    "mount dor",
    "st anns",
    "st ann s",
    "saint anns",
    "saint ann s",
    "cascade",
    "bourg mulatresse",
    "febeau village",
    "febeau",
    "malick",
    "petit bourg",
  ],
  EAST_TUNAPUNA_ARIMA: [
    "tunapuna",
    "st augustine",
    "saint augustine",
    "curepe",
    "st joseph",
    "saint joseph",
    "tacarigua",
    "trincity",
    "macoya",
    "valsayn",
    "el dorado",
    "arouca",
    "d abadie",
    "dabadie",
    "piarco",
    "santa margarita",
    "auzonville",
    "dinsley",
    "st helena",
    "saint helena",
    "kelly village",
    "las lomas",
    "bon air",
    "oropune",
    "la horquetta",
    "lahorquetta",
    "arima",
    "malabar",
    "o meara",
    "omeara",
    "santa rosa",
    "santa rosa heights",
    "mausica",
    "centeno",
    "frederick settlement",
    "warrenville",
  ],
  CENTRAL_CHAGUANAS_COUVA: [
    "chaguanas",
    "cunupia",
    "longdenville",
    "enterprise",
    "endeavour",
    "felicity",
    "edinburgh",
    "montrose",
    "caroni",
    "couva",
    "carapichaima",
    "california",
    "claxton bay",
    "point lisas",
    "pointe a pierre",
    "pointe-a-pierre",
    "freeport",
    "preysal",
    "gasparillo",
    "chase village",
    "carlsen field",
    "brickfield",
    "waterloo",
    "phoenix park",
    "savonetta",
    "mcbean",
    "mc bean",
    "exchange",
    "balmain",
    "orange valley",
  ],
  CENTRAL_EAST_TALPARO_TABAQUITE: [
    "talparo",
    "tabaquite",
    "brasso",
    "brazil",
    "montserrat",
    "gran couva",
    "gran couva village",
    "mayo",
    "piparo",
    "tortuga",
    "san raphael",
    "arena",
    "caparo",
    "mamoral",
    "flanagin town",
    "navet",
    "ben lomond",
    "marac",
  ],
  SOUTH_SANFERNANDO_PRINCESTOWN: [
    "san fernando",
    "marabella",
    "la romaine",
    "vistabella",
    "cocoyea",
    "gulf view",
    "mon repos",
    "gopaul lands",
    "princes town",
    "new grant",
    "tableland",
    "hindustan",
    "iere village",
    "indian walk",
    "williamsville",
    "golconda",
    "saint madeleine",
    "st madeleine",
    "reform",
    "cedar hill",
    "fifth company",
    "third company",
    "moruga",
    "lengua",
    "naparima",
  ],
  SW_PENAL_DEBE_FYZABAD: [
    "penal",
    "debe",
    "barrackpore",
    "monkey town",
    "san francique",
    "oropouche",
    "south oropouche",
    "fyzabad",
    "siparia",
    "avocat",
    "santa flora",
    "morne diablo",
  ],
  POINT_FORTIN_LA_BREA: [
    "point fortin",
    "guapo",
    "techier",
    "techier village",
    "la brea",
    "vessigny",
    "brighton",
    "vance river",
  ],
  NORTHERN_VALLEYS: [
    "santa cruz",
    "la pastora",
    "cantaro",
    "acono",
    "caura",
    "lopinot",
    "paramin",
    "moka",
    "maracas st joseph",
    "maracas valley",
    "upper maraval",
  ],
  NORTH_COAST: [
    "maracas bay",
    "maracas",
    "tyrico",
    "las cuevas",
    "la fillette",
    "lafillette",
    "blanchisseuse",
    "brasso seco",
  ],
  NORTHEAST_SANGREGRANDE: [
    "sangre grande",
    "valencia",
    "cumuto",
    "guaico",
    "coryal",
    "fishing pond",
    "vega de oropouche",
    "sangre chiquito",
    "manzanilla",
    "cunapo",
  ],
  NORTHEAST_COAST_TOCO: [
    "toco",
    "matelot",
    "grande riviere",
    "sans souci",
    "matura",
    "salybia",
    "rampanalgas",
    "cumana",
    "redhead",
    "balandra",
  ],
  DEEP_SW_CEDROS_ICACOS: [
    "cedros",
    "icacos",
    "erin",
    "chatham",
    "granville",
    "fullarton",
    "fullerton",
    "bonasse",
    "los bajos",
    "los gallos",
    "palo seco",
    "rancho quemado",
    "buenos ayres",
    "quinam",
    "coromandel",
  ],
  SOUTHEAST_MAYARO: [
    "rio claro",
    "mayaro",
    "guayaguayare",
    "biche",
    "pierreville",
    "ortoire",
    "ecclesville",
    "charuma",
    "poole",
    "kernaham",
    "plaisance",
  ],
  TOBAGO_SW: [
    "scarborough",
    "crown point",
    "canaan",
    "bon accord",
    "buccoo",
    "lambeau",
    "lowlands",
    "signal hill",
    "black rock",
    "bacolet",
    "calder hall",
    "mt irvine",
    "mount irvine",
    "plymouth",
    "bethel",
    "patience hill",
    "mount st george",
    "mount saint george",
    "golden lane",
    "golden grove",
  ],
  TOBAGO_NE: [
    "roxborough",
    "charlotteville",
    "speyside",
    "delaford",
    "pembroke",
    "belle garden",
    "castara",
    "les coteaux",
    "moriah",
    "mason hall",
    "goodwood",
    "l anse fourmi",
    "lanse fourmi",
    "parlatuvier",
    "glamorgan",
    "louis d or",
    "studley park",
    "carnbee",
  ],
};

function formatSelfDeliveryRegionLabel(raw: string): string {
  if (raw === "pos") return "POS";
  return raw
    .split(" ")
    .map((word) => {
      if (word.length <= 2) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/** Short area preview for vendor zone rows (first N communities in the zone). */
export function getSelfDeliveryZoneRegionsPreview(
  zone: SelfDeliveryZone,
  maxShown = 6,
): string {
  const labels = getSelfDeliveryZoneRegionLabels(zone);
  const shown = labels.slice(0, maxShown);
  if (labels.length > maxShown) {
    return `${shown.join(", ")}, and more`;
  }
  return shown.join(", ");
}

/** Full display labels for every community in a zone (canonical spellings deduped). */
export function getSelfDeliveryZoneRegionLabels(zone: SelfDeliveryZone): readonly string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const raw of REGIONS_BY_SELF_DELIVERY_ZONE[zone]) {
    const canonical = canonicalSelfDeliveryKey(raw);
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    labels.push(formatSelfDeliveryRegionLabel(canonical));
  }
  return labels;
}

const REGION_TO_SELF_DELIVERY_ZONE: ReadonlyMap<string, SelfDeliveryZone> = (() => {
  const map = new Map<string, SelfDeliveryZone>();
  for (const zone of SELF_DELIVERY_ZONES) {
    for (const region of REGIONS_BY_SELF_DELIVERY_ZONE[zone]) {
      map.set(canonicalSelfDeliveryKey(region), zone);
    }
  }
  return map;
})();

export function getSelfDeliveryZone(region: string): SelfDeliveryZone {
  const key = canonicalSelfDeliveryKey(region);
  if (!key) return SELF_DELIVERY_DEFAULT_ZONE;
  return REGION_TO_SELF_DELIVERY_ZONE.get(key) ?? SELF_DELIVERY_DEFAULT_ZONE;
}

export function mapStoreRegionToHomeZone(storeRegion: string): SelfDeliveryZone {
  return getSelfDeliveryZone(storeRegion);
}

// --- Adjacency (direct neighbors for hop-distance / location defaults) ---

export const ZONE_ADJACENCY: Record<SelfDeliveryZone, SelfDeliveryZone[]> = {
  NW_POS_DIEGO_MARTIN: ["NORTH_SANJUAN_FOOTHILLS", "EAST_TUNAPUNA_ARIMA"],
  NORTH_SANJUAN_FOOTHILLS: [
    "NW_POS_DIEGO_MARTIN",
    "EAST_TUNAPUNA_ARIMA",
    "CENTRAL_CHAGUANAS_COUVA",
    "NORTHERN_VALLEYS",
  ],
  EAST_TUNAPUNA_ARIMA: [
    "NW_POS_DIEGO_MARTIN",
    "NORTH_SANJUAN_FOOTHILLS",
    "CENTRAL_CHAGUANAS_COUVA",
    "NORTHEAST_SANGREGRANDE",
  ],
  CENTRAL_CHAGUANAS_COUVA: [
    "NORTH_SANJUAN_FOOTHILLS",
    "EAST_TUNAPUNA_ARIMA",
    "CENTRAL_EAST_TALPARO_TABAQUITE",
    "SOUTH_SANFERNANDO_PRINCESTOWN",
    "SW_PENAL_DEBE_FYZABAD",
    "NORTHERN_VALLEYS",
  ],
  CENTRAL_EAST_TALPARO_TABAQUITE: [
    "CENTRAL_CHAGUANAS_COUVA",
    "NORTHEAST_SANGREGRANDE",
    "SOUTH_SANFERNANDO_PRINCESTOWN",
    "SOUTHEAST_MAYARO",
  ],
  SOUTH_SANFERNANDO_PRINCESTOWN: [
    "CENTRAL_CHAGUANAS_COUVA",
    "CENTRAL_EAST_TALPARO_TABAQUITE",
    "SW_PENAL_DEBE_FYZABAD",
    "POINT_FORTIN_LA_BREA",
  ],
  SW_PENAL_DEBE_FYZABAD: [
    "CENTRAL_CHAGUANAS_COUVA",
    "SOUTH_SANFERNANDO_PRINCESTOWN",
    "POINT_FORTIN_LA_BREA",
    "DEEP_SW_CEDROS_ICACOS",
  ],
  POINT_FORTIN_LA_BREA: [
    "SW_PENAL_DEBE_FYZABAD",
    "SOUTH_SANFERNANDO_PRINCESTOWN",
    "DEEP_SW_CEDROS_ICACOS",
  ],
  NORTHERN_VALLEYS: [
    "NORTH_SANJUAN_FOOTHILLS",
    "CENTRAL_CHAGUANAS_COUVA",
    "NORTH_COAST",
    "NORTHEAST_SANGREGRANDE",
  ],
  NORTH_COAST: ["NORTHERN_VALLEYS", "NORTHEAST_SANGREGRANDE", "NORTHEAST_COAST_TOCO"],
  NORTHEAST_SANGREGRANDE: [
    "EAST_TUNAPUNA_ARIMA",
    "CENTRAL_EAST_TALPARO_TABAQUITE",
    "NORTHERN_VALLEYS",
    "NORTH_COAST",
    "NORTHEAST_COAST_TOCO",
  ],
  NORTHEAST_COAST_TOCO: ["NORTH_COAST", "NORTHEAST_SANGREGRANDE", "SOUTHEAST_MAYARO"],
  DEEP_SW_CEDROS_ICACOS: [
    "SW_PENAL_DEBE_FYZABAD",
    "POINT_FORTIN_LA_BREA",
    "SOUTHEAST_MAYARO",
  ],
  SOUTHEAST_MAYARO: [
    "CENTRAL_EAST_TALPARO_TABAQUITE",
    "NORTHEAST_COAST_TOCO",
    "DEEP_SW_CEDROS_ICACOS",
    "SW_PENAL_DEBE_FYZABAD",
  ],
  TOBAGO_SW: ["TOBAGO_NE"],
  TOBAGO_NE: ["TOBAGO_SW"],
};

const REMOTE_ZONE_SET = new Set<SelfDeliveryZone>(REMOTE_SELF_DELIVERY_ZONES);

function bfsHopDistance(home: SelfDeliveryZone, target: SelfDeliveryZone): number {
  if (home === target) return 0;
  const visited = new Set<SelfDeliveryZone>([home]);
  const queue: { zone: SelfDeliveryZone; hops: number }[] = [{ zone: home, hops: 0 }];
  while (queue.length > 0) {
    const { zone, hops } = queue.shift()!;
    for (const neighbor of ZONE_ADJACENCY[zone]) {
      if (neighbor === target) return hops + 1;
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      queue.push({ zone: neighbor, hops: hops + 1 });
    }
  }
  return Number.POSITIVE_INFINITY;
}

function tierRateForTarget(home: SelfDeliveryZone, target: SelfDeliveryZone): number {
  if (isCrossIsland(home, target)) return SELF_DELIVERY_TIER_CROSS_ISLAND;
  if (home === target) return SELF_DELIVERY_TIER_HOME;
  if (REMOTE_ZONE_SET.has(target)) return SELF_DELIVERY_TIER_FAR;
  const hops = bfsHopDistance(home, target);
  if (hops === 1) return SELF_DELIVERY_TIER_NEAR;
  if (hops === 2) return SELF_DELIVERY_TIER_MID;
  return SELF_DELIVERY_TIER_FAR;
}

/** Default self-delivery rate (TTD major units) from homeZone to every destination zone. */
export function getDefaultRatesForHomeZone(
  homeZone: SelfDeliveryZone,
): Record<SelfDeliveryZone, number> {
  const rates = {} as Record<SelfDeliveryZone, number>;
  for (const zone of SELF_DELIVERY_ZONES) {
    rates[zone] = tierRateForTarget(homeZone, zone);
  }
  return rates;
}

// --- Coverage audit vs checkout dropdown (TRINIDAD_ONBOARDING_REGION_OPTIONS) ---

export type SelfDeliveryRegionCoverageReport = {
  /** Dropdown values that would hit SELF_DELIVERY_DEFAULT_ZONE — assign before Phase 3. */
  dropdownRegionsWithoutZone: readonly string[];
  /** Communities in 16-zone arrays not present in the checkout dropdown (informational). */
  zoneCommunitiesNotInDropdown: readonly string[];
  /** Total unique checkout dropdown region values audited. */
  dropdownRegionCount: number;
  /** Default zone used for unmatched regions. */
  defaultZone: SelfDeliveryZone;
};

function allMappedRegionKeys(): Set<string> {
  const keys = new Set<string>();
  for (const zone of SELF_DELIVERY_ZONES) {
    for (const region of REGIONS_BY_SELF_DELIVERY_ZONE[zone]) {
      keys.add(canonicalSelfDeliveryKey(region));
    }
  }
  return keys;
}

function computeRegionCoverageReport(): SelfDeliveryRegionCoverageReport {
  const mappedKeys = allMappedRegionKeys();
  const dropdownValues = TRINIDAD_ONBOARDING_REGION_OPTIONS.map((o) => o.value);
  const dropdownKeySet = new Set(dropdownValues.map((v) => canonicalSelfDeliveryKey(v)));

  const dropdownRegionsWithoutZone: string[] = [];
  for (const value of dropdownValues) {
    const key = canonicalSelfDeliveryKey(value);
    if (!mappedKeys.has(key)) {
      dropdownRegionsWithoutZone.push(value);
    }
  }

  const zoneCommunitiesNotInDropdown: string[] = [];
  for (const zone of SELF_DELIVERY_ZONES) {
    for (const region of REGIONS_BY_SELF_DELIVERY_ZONE[zone]) {
      const key = canonicalSelfDeliveryKey(region);
      if (!dropdownKeySet.has(key)) {
        zoneCommunitiesNotInDropdown.push(`${region} (${zone})`);
      }
    }
  }

  zoneCommunitiesNotInDropdown.sort((a, b) => a.localeCompare(b));

  return {
    dropdownRegionsWithoutZone,
    zoneCommunitiesNotInDropdown,
    dropdownRegionCount: dropdownValues.length,
    defaultZone: SELF_DELIVERY_DEFAULT_ZONE,
  };
}

/**
 * Precomputed gap report for Phase 1 review.
 * dropdownRegionsWithoutZone MUST be empty before wiring checkout (Phase 3).
 */
export const SELF_DELIVERY_REGION_COVERAGE: SelfDeliveryRegionCoverageReport =
  computeRegionCoverageReport();

/*
 * COVERAGE SNAPSHOT (generated from TRINIDAD_ONBOARDING_REGION_OPTIONS cross-check):
 * - dropdownRegionsWithoutZone: see SELF_DELIVERY_REGION_COVERAGE.dropdownRegionsWithoutZone
 * - zoneCommunitiesNotInDropdown: alias spellings kept for lookup (e.g. pos, saint james) — informational only
 */
