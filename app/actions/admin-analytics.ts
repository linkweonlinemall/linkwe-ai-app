"use server";
import { getSession } from "@/lib/auth/session";
import { buildAnalyticsReport } from "@/lib/analytics/report";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function getAdminAnalytics(input: unknown) {
  const session = await getSession();
  if (session?.role !== "ADMIN") throw new Error("Administrator access required.");
  if (!(await checkRateLimit(`analytics-report:${session.userId}`,60,60_000)).allowed) throw new Error("Please wait a minute before refreshing again.");
  return buildAnalyticsReport(input);
}
