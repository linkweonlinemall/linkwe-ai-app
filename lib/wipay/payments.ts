import { createHash, timingSafeEqual } from "node:crypto";

import { getWiPayConfig } from "@/lib/wipay/config";

type CreateHostedPaymentInput = {
  merchantOrderId: string;
  amountMinor: number;
  responseUrl: string;
  data?: Record<string, string>;
};

type CreateHostedPaymentResponse = {
  url: string;
  transactionId: string;
};

export function formatWiPayAmount(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("WiPay amount must be a positive integer in minor units");
  }
  return (amountMinor / 100).toFixed(2);
}

export async function createWiPayHostedPayment(
  input: CreateHostedPaymentInput,
): Promise<CreateHostedPaymentResponse> {
  const config = getWiPayConfig();
  const body = new URLSearchParams({
    account_number: config.accountNumber,
    country_code: "TT",
    currency: "TTD",
    environment: config.environment,
    fee_structure: "merchant_absorb",
    method: "credit_card",
    order_id: input.merchantOrderId,
    origin: "LinkWe",
    response_url: input.responseUrl,
    total: formatWiPayAmount(input.amountMinor),
    avs: "0",
  });
  if (input.data) body.set("data", JSON.stringify(input.data));

  const response = await fetch(`${config.baseUrl}/plugins/payments/request`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | { url?: string; transaction_id?: string; message?: string }
    | null;
  if (!response.ok || !payload?.url || !payload.transaction_id) {
    throw new Error(payload?.message || "WiPay payment setup failed");
  }

  return { url: payload.url, transactionId: payload.transaction_id };
}

export function verifyWiPayResponseHash(input: {
  transactionId: string;
  originalAmountMinor: number;
  receivedHash: string;
}): boolean {
  const { apiKey } = getWiPayConfig();
  const expected = createHash("md5")
    .update(`${input.transactionId}${formatWiPayAmount(input.originalAmountMinor)}${apiKey}`)
    .digest();
  if (!/^[a-f\d]{32}$/i.test(input.receivedHash)) return false;
  const received = Buffer.from(input.receivedHash, "hex");
  return received.length === expected.length && timingSafeEqual(expected, received);
}
