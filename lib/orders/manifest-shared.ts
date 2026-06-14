import type { SplitWeightLine } from "@/lib/orders/split-weight";

export function formatTtdMinor(minor: number): string {
  return `TTD ${(minor / 100).toFixed(2)}`;
}

export function splitRefLabel(referenceNumber: string | null, id: string): string {
  return referenceNumber ?? `SP-${id.slice(-8).toUpperCase()}`;
}

export const MAIN_ORDER_ITEMS_WEIGHT_SELECT = {
  titleSnapshot: true,
  weightLbs: true,
  quantity: true,
} as const;

export type ManifestSplit = {
  ref: string;
  storeName: string;
  customerName: string;
  customerEmail: string;
  addressLine1: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  region: string;
  itemLines: SplitWeightLine[];
  totalWeightLbs: number;
  shippingMinor: number;
};
