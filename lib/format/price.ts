export function formatTTDPrice(amount: number): string {
  if (Math.abs(amount) < 0.005) return "Free";
  return `TTD ${amount.toLocaleString("en-TT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatTTDMinor(amountMinor: number): string {
  return formatTTDPrice(amountMinor / 100);
}
