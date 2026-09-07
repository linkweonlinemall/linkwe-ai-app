export type WiPayEnvironment = "sandbox" | "live";

export function getWiPayEnvironment(): WiPayEnvironment {
  // Live charging requires an explicit second opt-in. This keeps a copied or
  // stale production environment variable from accidentally charging cards.
  return process.env.WIPAY_ENVIRONMENT === "live" && process.env.WIPAY_LIVE_ENABLED === "true"
    ? "live"
    : "sandbox";
}

export function getWiPayConfig() {
  const environment = getWiPayEnvironment();
  const baseUrl = environment === "live"
    ? "https://tt.wipayfinancial.com"
    : "https://ttsb.wipayfinancial.com";
  const accountNumber = environment === "live"
    ? process.env.WIPAY_ACCOUNT_NUMBER
    : process.env.WIPAY_ACCOUNT_NUMBER || "1234567890";
  const apiKey = process.env.WIPAY_API_KEY || "123";

  if (!accountNumber || !apiKey) {
    throw new Error("WiPay live credentials are not configured");
  }

  return {
    environment,
    baseUrl,
    accountNumber,
    apiKey,
    wapiKey: process.env.WIPAY_WAPI_KEY,
    webhookSecret: process.env.WIPAY_WEBHOOK_SECRET,
  };
}
