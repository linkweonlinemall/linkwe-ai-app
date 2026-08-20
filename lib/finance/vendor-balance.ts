/** Debit entries shown as deductions in the vendor ledger. */
export const VENDOR_LEDGER_DEBIT_TYPES = [
  "DEBIT_PLATFORM_FEE",
  "DEBIT_PAYOUT",
  "DEBIT_REFUND",
  "DEBIT_SUBSCRIPTION",
  "DEBIT_ADJUSTMENT",
] as const;

/**
 * Entries that reduce available payout balance.
 *
 * Settlement credits are already stored net of platform commission, so
 * DEBIT_PLATFORM_FEE is display-only and must not be subtracted again.
 */
export const VENDOR_BALANCE_DEBIT_TYPES = [
  "DEBIT_PAYOUT",
  "DEBIT_REFUND",
  "DEBIT_SUBSCRIPTION",
  "DEBIT_ADJUSTMENT",
] as const;

export function isVendorLedgerDebit(entryType: string): boolean {
  return (VENDOR_LEDGER_DEBIT_TYPES as readonly string[]).includes(entryType);
}

export function isVendorBalanceDebit(entryType: string): boolean {
  return (VENDOR_BALANCE_DEBIT_TYPES as readonly string[]).includes(entryType);
}
