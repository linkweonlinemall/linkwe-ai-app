export const PLATFORM_COMMISSION_RATE = 0.12;

export function calculateCommissionMinor(subtotalMinor: number): number {
  return Math.round(subtotalMinor * PLATFORM_COMMISSION_RATE);
}

export function calculateVendorNetMinor(subtotalMinor: number): number {
  return subtotalMinor - calculateCommissionMinor(subtotalMinor);
}
