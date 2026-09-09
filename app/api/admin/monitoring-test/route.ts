import * as Sentry from "@sentry/nextjs";
import { getSession } from "@/lib/auth/session";

async function runMonitoringCheck() {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    return Response.json({ error: "Administrator access required." }, { status: 403 });
  }

  const eventId = Sentry.captureMessage("LinkWe production monitoring test", {
    level: "info",
    tags: {
      check: "admin-monitoring-test",
    },
  });
  await Sentry.flush(2_000);

  return Response.json({ ok: true, eventId });
}

export const GET = runMonitoringCheck;
export const POST = runMonitoringCheck;
