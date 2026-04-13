/** Convert user-entered dollars (e.g. "12.99") to integer minor units (cents). */
export function parsePriceToMinor(input: string): { ok: true; minor: number } | { ok: false; error: string } {
  const t = input.trim();
  if (!t) return { ok: false, error: "Price is required." };
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Enter a valid price." };
  if (n > 1_000_000) return { ok: false, error: "Price is too large." };
  const minor = Math.round(n * 100);
  if (minor < 1) return { ok: false, error: "Minimum price is $0.01." };
  return { ok: true, minor };
}

export function formatMinorAsUsd(minor: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minor / 100);
}
