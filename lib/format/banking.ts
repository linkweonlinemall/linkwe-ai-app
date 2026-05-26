/** Strip separators/spaces — keep slicing logic consistent across dashboard surfaces */
function digitsOnly(accountNumber: string | null | undefined): string {
  return accountNumber?.replace(/\s+/g, "") ?? "";
}

/** e.g. 9990000 → ****0000 */
export function maskBankAccountStars(accountNumber: string | null | undefined): string {
  const d = digitsOnly(accountNumber);
  if (!d.length) return "****";
  return `****${d.slice(-4)}`;
}

/** e.g. 9990000 → ••••0000 — used where bullet chars match product spec */
export function maskBankAccountBullets(accountNumber: string | null | undefined): string {
  const d = digitsOnly(accountNumber);
  if (!d.length) return "••••";
  return `••••${d.slice(-4)}`;
}
