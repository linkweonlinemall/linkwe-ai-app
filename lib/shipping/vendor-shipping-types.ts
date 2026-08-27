import { ttdToMinor } from "@/lib/finance/commission";
import { getBaseShippingRate } from "@/lib/shipping/tt-rates";
import { getFinalShippingRate } from "@/lib/shipping/tt-markup";
import {
  REGIONS_TOBAGO_METRO,
  REGIONS_TRINIDAD_EXTENDED,
  REGIONS_TRINIDAD_METRO,
  REGIONS_TRINIDAD_REMOTE,
  type ShippingZone,
} from "@/lib/shipping/trinidad-zoning";
import type { SelfDeliveryZone } from "@/lib/shipping/self-delivery-zones";

/** Billable weight used for LinkWe “customer pays” display (upTo20Lbs tier). */
export const LINKWE_DISPLAY_WEIGHT_LBS = 20;

export const SHIPPING_ZONES = [
  "METRO",
  "EXTENDED",
  "REMOTE",
  "TOBAGO_METRO",
] as const satisfies readonly ShippingZone[];

export type VendorShippingZone = (typeof SHIPPING_ZONES)[number];

export type VendorShippingRateInput = {
  zone: string;
  rateMinor: number;
  active: boolean;
  linkweFallback: boolean;
};

export type LinkWeRateDisplay = {
  zone: VendorShippingZone;
  rateMinor: number;
};

export type SelfDeliveryZoneRowData = {
  zone: SelfDeliveryZone;
  label: string;
  regionsPreview: string;
  rateMinor: number;
  isSuggested: boolean;
  active: boolean;
  linkweFallback: boolean;
};

export type VendorShippingSettingsData = {
  shippingMode: "SELF" | "LINKWE";
  /** Raw DB rows (includes legacy 4-zone rows ignored by the SELF UI). */
  rates: Array<{
    id: string;
    storeId: string;
    zone: string;
    rateMinor: number;
    active: boolean;
    linkweFallback: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  selfDeliveryZones: SelfDeliveryZoneRowData[];
  homeZone: SelfDeliveryZone;
  homeZoneLabel: string;
  linkweRates: LinkWeRateDisplay[];
};

export type ZoneDefinition = {
  zone: VendorShippingZone;
  label: string;
  regionsPreview: string;
};

function formatRegionLabel(raw: string): string {
  if (raw === "pos") return "POS";
  return raw
    .split(" ")
    .map((word) => {
      if (word.length <= 2) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function buildRegionsPreview(regions: readonly string[], maxShown = 8): string {
  const labels = regions.slice(0, maxShown).map(formatRegionLabel);
  if (regions.length > maxShown) {
    return `${labels.join(", ")}, and more`;
  }
  return labels.join(", ");
}

export const ZONE_DEFINITIONS: readonly ZoneDefinition[] = [
  {
    zone: "METRO",
    label: "Metro",
    regionsPreview: buildRegionsPreview(REGIONS_TRINIDAD_METRO),
  },
  {
    zone: "EXTENDED",
    label: "Extended",
    regionsPreview: buildRegionsPreview(REGIONS_TRINIDAD_EXTENDED),
  },
  {
    zone: "REMOTE",
    label: "Remote",
    regionsPreview: buildRegionsPreview(REGIONS_TRINIDAD_REMOTE),
  },
  {
    zone: "TOBAGO_METRO",
    label: "Tobago Metro",
    regionsPreview: buildRegionsPreview(REGIONS_TOBAGO_METRO),
  },
];

const ZONE_SET = new Set<string>(SHIPPING_ZONES);

export function isVendorShippingZone(zone: string): zone is VendorShippingZone {
  return ZONE_SET.has(zone);
}

/** LinkWe per-zone customer rate for display (base upTo20Lbs + platform markup → minor units). */
export function getLinkWeDisplayRateMinor(zone: VendorShippingZone): number {
  const baseMajor = getBaseShippingRate(zone, LINKWE_DISPLAY_WEIGHT_LBS);
  const finalMajor = getFinalShippingRate(baseMajor);
  return ttdToMinor(finalMajor);
}

export function getAllLinkWeDisplayRates(): LinkWeRateDisplay[] {
  return SHIPPING_ZONES.map((zone) => ({
    zone,
    rateMinor: getLinkWeDisplayRateMinor(zone),
  }));
}
