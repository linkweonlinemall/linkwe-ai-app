import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { cleanEvent } from "@/lib/analytics/model";
import { analyticsContext, collectionEligible, CONSENT_COOKIE, setAnalyticsConsent, startAnalyticsSession } from "@/lib/analytics/collection";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  return json({ eligible: await collectionEligible(), consent: (await cookies()).get(CONSENT_COOKIE)?.value ?? "unset" });
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Origin not allowed" }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "JSON required" }, 415);
  const raw = await request.text();
  if (raw.length > 16_000) return json({ error: "Request too large" }, 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); if (!body || Array.isArray(body) || typeof body !== "object") throw new Error(); } catch { return json({ error: "Invalid request" }, 400); }
  if (body.action === "consent") {
    if (typeof body.accepted !== "boolean") return json({ error: "Choose an analytics preference" }, 400);
    await setAnalyticsConsent(body.accepted);
    return json({ saved: true });
  }
  if (!(await collectionEligible())) return json({ accepted: false });
  if (body.action === "start") return json({ accepted: await startAnalyticsSession(body, request.headers.get("user-agent") ?? "") });
  const context = await analyticsContext();
  if (!context) return json({ accepted: false });
  if (!(await checkRateLimit(`analytics:${context.visitorId}`, 180, 60_000)).allowed) return json({ error: "Too many events" }, 429);
  if (!Array.isArray(body.events) || body.events.length > 20) return json({ error: "Invalid event batch" }, 400);
  const events = body.events.map(cleanEvent).filter((event): event is NonNullable<typeof event> => !!event);
  if (!events.length) return json({ accepted: false });
  const dimensions = { visitorId: context.visitorId, sessionId: context.sessionId, source: context.source, medium: context.medium, campaign: context.campaign, device: context.device };
  try {
    await prisma.$transaction([
      prisma.analyticsEvent.createMany({ data: events.map(({ occurredAt, ...event }) => ({ ...event, ...dimensions, createdAt: new Date(occurredAt) })), skipDuplicates: true }),
      prisma.analyticsCollection.upsert({ where: { id: "main" }, update: {}, create: { id: "main", startedAt: new Date() } }),
    ]);
    return json({ accepted: true });
  } catch { return json({ error: "Analytics storage is temporarily unavailable" }, 503); }
}
