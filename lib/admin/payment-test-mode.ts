import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "lw_admin_payment_test";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("Admin test mode is unavailable until AUTH_SECRET is configured.");
  return value;
}

function signature(userId: string): string {
  return createHmac("sha256", secret()).update(`linkwe-admin-payment-test:${userId}`).digest("hex");
}

export async function isAdminPaymentTestMode(userId: string): Promise<boolean> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) return false;
  const [cookieUserId, supplied] = value.split(".");
  if (cookieUserId !== userId || !supplied || !/^[a-f\d]{64}$/i.test(supplied)) return false;
  const expected = signature(userId);
  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"));
}

export async function writeAdminPaymentTestMode(userId: string, enabled: boolean): Promise<void> {
  const store = await cookies();
  if (!enabled) {
    store.delete(COOKIE_NAME);
    return;
  }
  store.set(COOKIE_NAME, `${userId}.${signature(userId)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    priority: "high",
  });
}
