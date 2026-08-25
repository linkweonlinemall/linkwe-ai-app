import { getWiPayConfig } from "@/lib/wipay/config";
import { formatWiPayAmount } from "@/lib/wipay/payments";

type WapiPayload = Record<string, string | number | undefined>;

async function wapiRequest<T>(path: string, init: RequestInit): Promise<T> {
  const config = getWiPayConfig();
  if (!config.wapiKey) throw new Error("WIPAY_WAPI_KEY is not configured");
  const response = await fetch(`${config.baseUrl}/wapi${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-WAPI-Key": config.wapiKey,
      ...init.headers,
    },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!response.ok || !payload) {
    throw new Error(payload?.message || `WiPay WAPI request failed (${response.status})`);
  }
  return payload;
}

function bodyFrom(input: WapiPayload): URLSearchParams {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) body.set(key, String(value));
  }
  return body;
}

export function createTrustedCardEnrollment(responseUrl: string) {
  const { environment } = getWiPayConfig();
  return wapiRequest<{ message: string; url: string; transaction_id: string }>(
    "/trusted-cards",
    { method: "POST", body: bodyFrom({ environment, response_url: responseUrl }) },
  );
}

export function verifyTrustedCard(providerUuid: string, amount: number) {
  return wapiRequest<{ message: string }>(
    `/trusted-cards/${encodeURIComponent(providerUuid)}/verify`,
    { method: "POST", body: bodyFrom({ amount }) },
  );
}

export function chargeTrustedCard(input: {
  providerUuid: string;
  merchantOrderId: string;
  amountMinor: number;
  responseUrl: string;
  data?: string;
}) {
  const { environment } = getWiPayConfig();
  return wapiRequest<{ message: string; url: string; transaction_id: string }>(
    `/trusted-cards/${encodeURIComponent(input.providerUuid)}/charge`,
    {
      method: "POST",
      body: bodyFrom({
        currency: "TTD",
        environment,
        fee_structure: "merchant_absorb",
        order_id: input.merchantOrderId,
        response_url: input.responseUrl,
        total: formatWiPayAmount(input.amountMinor),
        country_code: "TT",
        origin: "LinkWe subscription",
        data: input.data,
      }),
    },
  );
}

export function requestWiPayRefund(providerTransactionId: string) {
  return wapiRequest<{ message: string }>(
    `/transactions/${encodeURIComponent(providerTransactionId)}/refund`,
    { method: "POST" },
  );
}
