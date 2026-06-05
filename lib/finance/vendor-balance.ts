/** VendorLedgerEntry.entryType values that reduce available payout balance. */
export const VENDOR_BALANCE_DEBIT_TYPES = [
  "DEBIT_PLATFORM_FEE",
  "DEBIT_PAYOUT",
  "DEBIT_REFUND",
] as const;

export function isVendorBalanceDebit(entryType: string): boolean {
  return (VENDOR_BALANCE_DEBIT_TYPES as readonly string[]).includes(entryType);
}
