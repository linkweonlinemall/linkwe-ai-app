import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { safeLabel, RETENTION_DAYS } from "./model";

export const CONSENT_COOKIE = "lw_analytics_consent";
const CONTEXT_COOKIE = "lw_analytics_session";
const VISITOR_COOKIE = "lw_analytics_visitor";
const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
type Context = { visitorId: string; sessionId: string; source: string; medium: string; campaign: string | null; device: string; expires: number };
function sign(value: string) { return createHmac("sha256", process.env.AUTH_SECRET!).update(value).digest("hex"); }
function encode(value: Context) { const json = Buffer.from(JSON.stringify(value)).toString("base64url"); return `${json}.${sign(json)}`; }
function decode(value?: string): Context | null {
  if (!value || !process.env.AUTH_SECRET) return null;
  try {
    const [json, signature] = value.split(".");
    if (!/^[a-f\d]{64}$/.test(signature) || !timingSafeEqual(Buffer.from(signature), Buffer.from(sign(json)))) return null;
    const result = JSON.parse(Buffer.from(json, "base64url").toString()) as Context;
    return result.expires > Date.now() ? result : null;
  } catch { return null; }
}
export async function collectionEligible() {
  if (!process.env.AUTH_SECRET || (process.env.NODE_ENV !== "production" && process.env.ANALYTICS_ALLOW_LOCAL !== "true")) return false;
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return false;
  const session = await getSession();
  if (!session) return true;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
  return user?.role !== "ADMIN" && user?.role !== "COURIER";
}
export async function analyticsContext() {
  const jar = await cookies();
  if (jar.get(CONSENT_COOKIE)?.value !== "accepted") return null;
  return decode(jar.get(CONTEXT_COOKIE)?.value);
}
export async function setAnalyticsConsent(accepted: boolean) {
  const jar = await cookies();
  jar.set(CONSENT_COOKIE, accepted ? "accepted" : "declined", { ...options, maxAge: 180 * 86400 });
  if (!accepted) { jar.delete(CONTEXT_COOKIE); jar.delete(VISITOR_COOKIE); }
}
export async function startAnalyticsSession(input: Record<string, unknown>, userAgent: string) {
  const jar = await cookies();
  if (jar.get(CONSENT_COOKIE)?.value !== "accepted") return false;
  const prior = decode(jar.get(CONTEXT_COOKIE)?.value);
  const visitor = jar.get(VISITOR_COOKIE)?.value;
  const source = safeLabel(input.source)?.toLowerCase() || "direct";
  const context: Context = prior ?? {
    visitorId: visitor && /^[a-f\d-]{36}$/i.test(visitor) ? visitor : randomUUID(), sessionId: randomUUID(),
    source, medium: safeLabel(input.medium)?.toLowerCase() || (source === "direct" ? "none" : "referral"),
    campaign: safeLabel(input.campaign), device: /ipad|tablet/i.test(userAgent) ? "tablet" : /mobile|iphone|android/i.test(userAgent) ? "mobile" : "desktop", expires: 0,
  };
  context.expires = Date.now() + 30 * 60_000;
  jar.set(CONTEXT_COOKIE, encode(context), { ...options, maxAge: 1800 });
  if (!visitor) jar.set(VISITOR_COOKIE, context.visitorId, { ...options, maxAge: 90 * 86400 });
  return true;
}
export async function captureCheckoutAttribution(merchantOrderId: string) {
  // Called only inside a user-initiated hosted payment. Analytics must never
  // prevent checkout if consent is absent, storage is unavailable or this is a job.
  try {
    if (!(await collectionEligible())) return;
    const context = await analyticsContext();
    if (!context) return;
    const data = { visitorId: context.visitorId, sessionId: context.sessionId, source: context.source, medium: context.medium, campaign: context.campaign, device: context.device };
    await prisma.analyticsCheckout.upsert({ where: { merchantOrderId }, update: {}, create: { merchantOrderId, ...data, createdAt: new Date() } });
  } catch { /* Operational payment records remain authoritative. */ }
}
export async function pruneAnalytics(now = new Date()) {
  const before = new Date(now.getTime() - RETENTION_DAYS * 86400_000);
  const [events, checkouts] = await Promise.all([
    prisma.analyticsEvent.deleteMany({ where: { createdAt: { lt: before } } }),
    prisma.analyticsCheckout.deleteMany({ where: { createdAt: { lt: before } } }),
  ]);
  return { events: events.count, checkouts: checkouts.count };
}
