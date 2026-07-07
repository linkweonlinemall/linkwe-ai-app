/**
 * Single source of truth for AI top-up bundle sizes and prices.
 * All checkout and webhook crediting must read from here — do not hardcode these numbers elsewhere.
 */

export type AITopupBundleKey = "SMALL" | "MEDIUM" | "LARGE";

export interface AITopupBundle {
  key: AITopupBundleKey;
  uses: number;
  priceMinor: number;
}

export const AI_TOPUP_BUNDLES: Record<AITopupBundleKey, AITopupBundle> = {
  SMALL: { key: "SMALL", uses: 50, priceMinor: 5000 },
  MEDIUM: { key: "MEDIUM", uses: 150, priceMinor: 12000 },
  LARGE: { key: "LARGE", uses: 400, priceMinor: 28000 },
};

export function getAITopupBundle(key: string): AITopupBundle | null {
  if (key === "SMALL" || key === "MEDIUM" || key === "LARGE") {
    return AI_TOPUP_BUNDLES[key];
  }
  return null;
}
