import * as Sentry from "@sentry/nextjs";
import { getSession } from "@/lib/auth/session";

export async function POST() {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    return Response.json({ error: "Administrator access required." }, { status: 403 });
  }

  const eventId = Sentry.captureMessage("LinkWe production monitoring test", {
    level: "info",
    tags: {
      check: "admin-sentry-test",
    },
  });
  await Sentry.flush(2_000);

  return Response.json({ ok: true, eventId });
}
