/**
 * Trinidad & Tobago — shipping region → zone + courier service schedule.
 *
 * Region keys are matched **after** `normalizeRegion` (trim, lowercase, light punctuation cleanup).
 * Replace or extend the exported arrays when ops/product finalizes the spreadsheet (checkout not wired yet).
 */

export type ShippingZone = "METRO" | "EXTENDED" | "REMOTE" | "TOBAGO_METRO";

export type ServiceSchedule = "STANDARD" | "DEEP_SOUTH_EAST" | "DEEP_SOUTH_WEST" | "HIGH_EAST";

// --- Trinidad: shipping price / SLA tier ---

export const REGIONS_TRINIDAD_METRO: readonly string[] = [
  "arima",
  "barataria",
  "curepe",
  "chaguanas",
  "claxton bay",
  "couva",
  "diego martin",
  "dabadie",
  "d abadie",
  "east dry river",
  "el dorado",
  "enterprise",
  "freeport",
  "gasparillo",
  "laventille",
  "longdenville",
  "macoya",
  "malabar",
  "marabella",
  "maraval",
  "mon repos",
  "moka",
  "petit valley",
  "piarco",
  "point fortin",
  "point lisas",
  "port of spain",
  "pos",
  "san fernando",
  "san juan",
  "santa cruz",
  "santa rosa heights",
  "st ann s",
  "st anns",
  "st augustine",
  "saint augustine",
  "st james",
  "saint james",
  "tacarigua",
  "tunapuna",
  "trincity",
  "warrenville",
  "woodbrook",
  "westmoorings",
  "west moorings",
];

export const REGIONS_TRINIDAD_EXTENDED: readonly string[] = [
  "arouca",
  "biche",
  "brasso",
  "brickfield",
  "carnbee",
  "caroni",
  "cunupia",
  "debe",
  "flanagin town",
  "fyzabad",
  "gran couva",
  "guapo",
  "lengua",
  "marac",
  "morne diablo",
  "naparima",
  "orange valley",
  "penal",
  "phoenix park",
  "preysal",
  "princes town",
  "rio claro",
  "sangre grande",
  "siparia",
  "tabaquite",
  "tortuga",
  "valsayn",
  "valencia",
  "vistabella",
  "williamsville",
];

export const REGIONS_TRINIDAD_REMOTE: readonly string[] = [
  "blanchisseuse",
  "cedros",
  "fullerton",
  "gran couva village",
  "grande riviere",
  "guayaguayare",
  "icacos",
  "las cuevas",
  "lopinot",
  "manzanilla",
  "matelot",
  "matura",
  "mayaro",
  "moruga",
  "pierreville",
  "salybia",
  "toco",
];

// --- Tobago: main developed corridor ---

export const REGIONS_TOBAGO_METRO: readonly string[] = [
  "scarborough",
  "crown point",
  "lambeau",
  "plymouth",
  "roxborough",
  "buccoo",
  "bethel",
  "black rock",
  "signal hill",
  "patience hill",
  "mount st george",
  "mount saint george",
  "charlotteville",
  "castara",
  "speyside",
  "parlatuvier",
  "moriah",
  "golden lane",
  "delaford",
  "golden grove",
  "studley park",
];

// --- Service schedule buckets (dispatch cadence; orthogonal to price zone) ---

export const REGIONS_SCHEDULE_DEEP_SOUTH_EAST: readonly string[] = [
  "mayaro",
  "manzanilla",
  "guayaguayare",
  "pierreville",
  "moruga",
  "biche",
];

export const REGIONS_SCHEDULE_DEEP_SOUTH_WEST: readonly string[] = [
  "penal",
  "debe",
  "siparia",
  "erin",
  "fyzabad",
  "fullerton",
  "cedros",
  "icacos",
  "los gallos",
];

export const REGIONS_SCHEDULE_HIGH_EAST: readonly string[] = [
  "toco",
  "matelot",
  "grande riviere",
  "blanchisseuse",
  "las cuevas",
  "matura",
  "salybia",
  "valencia",
  "sangre grande",
];

/** Normalize a user- or address-supplied region/city string for lookup. */
export function normalizeRegion(raw: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/[.,']/g, "")
    .replace(/\s+/g, " ")
    .replace(/\bst\b\.?/g, "saint")
    .replace(/\bmt\b\.?/g, "mount");
}

function regionSet(list: readonly string[]): Set<string> {
  return new Set(list.map((r) => normalizeRegion(r)));
}

const TRINIDAD_REMOTE_SET = regionSet(REGIONS_TRINIDAD_REMOTE);
const TRINIDAD_METRO_SET = regionSet(REGIONS_TRINIDAD_METRO);
const TRINIDAD_EXTENDED_SET = regionSet(REGIONS_TRINIDAD_EXTENDED);
const TOBAGO_METRO_SET = regionSet(REGIONS_TOBAGO_METRO);

const SCHEDULE_DSE_SET = regionSet(REGIONS_SCHEDULE_DEEP_SOUTH_EAST);
const SCHEDULE_DSW_SET = regionSet(REGIONS_SCHEDULE_DEEP_SOUTH_WEST);
const SCHEDULE_HE_SET = regionSet(REGIONS_SCHEDULE_HIGH_EAST);

/**
 * Shipping price / SLA tier. Lookup order: **REMOTE** → **TOBAGO_METRO** → **METRO** → **EXTENDED** → default **EXTENDED**.
 */
export function getShippingZone(region: string): ShippingZone {
  const key = normalizeRegion(region);
  if (!key) return "EXTENDED";
  if (TRINIDAD_REMOTE_SET.has(key)) return "REMOTE";
  if (TOBAGO_METRO_SET.has(key)) return "TOBAGO_METRO";
  if (TRINIDAD_METRO_SET.has(key)) return "METRO";
  if (TRINIDAD_EXTENDED_SET.has(key)) return "EXTENDED";
  return "EXTENDED";
}

/**
 * Dispatch / route cadence bucket. First match wins: **DEEP_SOUTH_EAST** → **DEEP_SOUTH_WEST** → **HIGH_EAST** → **STANDARD**.
 */
export function getServiceSchedule(region: string): ServiceSchedule {
  const key = normalizeRegion(region);
  if (!key) return "STANDARD";
  if (SCHEDULE_DSE_SET.has(key)) return "DEEP_SOUTH_EAST";
  if (SCHEDULE_DSW_SET.has(key)) return "DEEP_SOUTH_WEST";
  if (SCHEDULE_HE_SET.has(key)) return "HIGH_EAST";
  return "STANDARD";
}
