import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAdminAnalytics } from "@/app/actions/admin-analytics";
import { parseAnalyticsView } from "@/lib/analytics/hub";
import { PRIVATE_ANALYTICS_REPORT } from "@/lib/analytics/private-report";
import type { AnalyticsReport } from "@/lib/analytics/report";
import AnalyticsWorkspace from "./analytics-workspace";
export const metadata: Metadata = { title: "Analytics · LinkWe management", robots: { index: false, follow: false } };
export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Independently protect the page; the action checks again for every refresh.
  // getSession resolves the current database role, active state and suspension.
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=%2Fdashboard%2Fadmin%2Fanalytics");
  if (session.role !== "ADMIN") redirect("/");
  const view = parseAnalyticsView(await searchParams);
  let initialReport: AnalyticsReport | null = null;
  let initialError = "";
  try { initialReport = await getAdminAnalytics(view.filters); }
  catch { initialError = "Analytics could not load. Try refreshing; missing totals have not been replaced with zero."; }
  return <AnalyticsWorkspace initialReport={initialReport} initialError={initialError} initialView={view} privateReport={PRIVATE_ANALYTICS_REPORT}/>;
}
