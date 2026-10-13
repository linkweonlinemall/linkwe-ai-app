import "server-only";
import type { PrivateAnalyticsReport } from "./hub";
// Private resource links belong in server configuration, not this public repository.
// Navigation only, supplied after current ADMIN authorization. Google retains access checks.
export function privateAnalyticsReport(value: string | undefined): PrivateAnalyticsReport | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["datastudio.google.com", "lookerstudio.google.com"].includes(url.hostname)
      || url.port || url.username || url.password || !url.pathname.startsWith("/reporting/")) return null;
    return { title: "Website & Google Business Profile overview", href: url.href };
  } catch { return null; }
}
export const PRIVATE_ANALYTICS_REPORT = privateAnalyticsReport(process.env.LINKWE_ANALYTICS_PRIVATE_REPORT_URL);
