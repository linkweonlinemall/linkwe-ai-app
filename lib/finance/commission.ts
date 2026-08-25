export type CommissionPlan = "STARTER" | "GROWTH" | "PRO";
export type CommissionItemType = "product" | "service";

/** Flat platform commission on event ticket sales (not plan-tiered). */
export const TICKET_COMMISSION_RATE = 0.06;

export function getTicketCommissionRate(): number {
  return TICKET_COMMISSION_RATE;
}

export function getCommissionRate(
  type: CommissionItemType,
  plan: CommissionPlan,
): number {
  const rates = {
    product: { STARTER: 0.15, GROWTH: 0.12, PRO: 0.08 },
    service: { STARTER: 0.08, GROWTH: 0.05, PRO: 0.03 },
  };
  return rates[type][plan];
}

export function calculateEarnings(
  amountTTD: number,
  type: CommissionItemType,
  plan: CommissionPlan = "STARTER",
): { gross: number; commission: number; net: number } {
  const rate = getCommissionRate(type, plan);
  const commission = Math.round(amountTTD * rate * 100) / 100;
  const net = Math.round((amountTTD - commission) * 100) / 100;
  return { gross: amountTTD, commission, net };
}

/** Convert TTD dollars to minor units (cents) for the ledger and payment provider. */
export function ttdToMinor(amountTTD: number): number {
  return Math.round(amountTTD * 100);
}

export function minorToTtd(amountMinor: number): number {
  return Math.round(amountMinor) / 100;
}

export function calculateEarningsMinor(
  amountMinor: number,
  type: CommissionItemType,
  plan: CommissionPlan = "STARTER",
): { grossMinor: number; commissionMinor: number; netMinor: number } {
  const grossTTD = minorToTtd(amountMinor);
  const { commission, net } = calculateEarnings(grossTTD, type, plan);
  return {
    grossMinor: amountMinor,
    commissionMinor: ttdToMinor(commission),
    netMinor: ttdToMinor(net),
  };
}

export function calculateTicketEarningsMinor(grossMinor: number): {
  grossMinor: number;
  commissionMinor: number;
  netMinor: number;
} {
  const commissionMinor = Math.round(grossMinor * TICKET_COMMISSION_RATE);
  const netMinor = grossMinor - commissionMinor;
  return { grossMinor, commissionMinor, netMinor };
}
