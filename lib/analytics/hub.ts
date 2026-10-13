import { DEFAULT_FILTERS, parseFilters, type AnalyticsFilters } from "./model";
import type { AnalyticsReport } from "./report";

export const ANALYTICS_SECTIONS = [
  { id: "overview", label: "At a glance" }, { id: "registrations", label: "Signups & setup" },
  { id: "journey", label: "Customer journey" }, { id: "audience", label: "People & discovery" },
  { id: "vendors", label: "Vendor progress" }, { id: "operations", label: "Business activity" },
  { id: "campaigns", label: "Marketing" }, { id: "connections", label: "Data connections" },
  { id: "health", label: "Data & definitions" },
  { id: "social", label: "Social & ads" },
] as const;
export type AnalyticsSection = typeof ANALYTICS_SECTIONS[number]["id"];
export const ANALYTICS_GROUPS: { id: string; label: string; sections: AnalyticsSection[] }[] = [
  { id: "overview", label: "Overview", sections: ["overview"] },
  { id: "acquisition", label: "Acquisition", sections: ["audience", "journey", "campaigns"] },
  { id: "activation", label: "Vendor activation", sections: ["registrations", "vendors"] },
  { id: "social", label: "Social & ads", sections: ["social"] },
  { id: "business", label: "Business", sections: ["operations"] },
  { id: "sources", label: "Source health", sections: ["connections", "health"] },
];
export function analyticsGroup(section: AnalyticsSection) { return ANALYTICS_GROUPS.find(group => group.sections.includes(section))!; }
export type PrivateAnalyticsReport = { href: string; title: string };
export function parseAnalyticsView(input: Record<string, unknown>) {
  const section = ANALYTICS_SECTIONS.find(item => item.id === input.section)?.id ?? "overview";
  try { return { section, filters: parseFilters(input), invalidFilters: false }; }
  catch { return { section, filters: DEFAULT_FILTERS, invalidFilters: true }; }
}
export function analyticsViewHref(section: AnalyticsSection, filters: AnalyticsFilters) {
  const query = new URLSearchParams({ section, days: String(filters.days), device: filters.device, source: filters.source });
  return `/dashboard/admin/analytics?${query}`;
}
export type AnalyticsConnection = { id: string; name: string; status: string; connected: boolean; updatedAt: string | null; detail: string };
export function analyticsConnections(report: AnalyticsReport | null): AnalyticsConnection[] {
  const connections: AnalyticsConnection[] = [
    { id: "business", name: "LinkWe business records", status: report ? "Snapshot available" : "Not loaded", connected: !!report, updatedAt: report?.generatedAt ?? null,
      detail: "Account creation, store setup, payments and business activity. Queried from LinkWe when you load or refresh this report." },
    { id: "visitors", name: "LinkWe visitor activity", status: !report ? "Not loaded" : !report.health.trafficAvailable ? "Unavailable" : !report.health.firstEvent ? "Not tracked yet" : report.health.lastEvent ? "Activity recorded" : "No events recorded", connected: !!report?.health.trafficAvailable && !!report.health.firstEvent, updatedAt: report?.health.lastEvent ?? null,
      detail: "Consented first-party activity, separate from Google Analytics. Last event covers the whole collection, not only your filters. A quiet period does not prove tracking is broken." },
    { id: "website", name: "WebsiteDaily / Google Analytics", status: "Private report only", connected: false, updatedAt: null,
      detail: "The separate daily importer supplies the private Google report. Its values and latest refresh time are not synced into this website. The Google tag alone is not a reporting-data connection." },
    { id: "gbp", name: "GBPmonthly / Google Business Profile", status: "Private report only", connected: false, updatedAt: null,
      detail: "Monthly business-profile reporting stays in the restricted Google report. GBP values and source freshness are unavailable here." },
    { id: "meta", name: "Meta / Facebook / Instagram", status: "Not connected", connected: false, updatedAt: null,
      detail: "The separate social importer does not yet supply this dashboard. Social reach, engagement, ad spend and return on ad spend are unavailable here." },
  ];
  if (report?.external && report.external.status !== "not-connected") return [...connections.slice(0,2), ...report.external.sources.map(source => ({
    id: source.id, name: source.name, status: source.status === "available" ? "Verified observations" : source.status === "stale" ? "Stale snapshot · refresh failed" : source.status === "empty" ? "No matching observations" : "Unavailable",
    connected: ["available","empty","stale"].includes(source.status), updatedAt: source.extractedAt,
    detail: `${source.grain}. ${source.caveat} Refresh automation: unverified. Latest reported run: ${source.lastRefreshStatus}.`,
  }))];
  return connections;
}
export function snapshotIsOld(report: AnalyticsReport, now: number) { return now - Date.parse(report.generatedAt) > 15 * 60_000; }
export const METRIC_SECTIONS: Record<string, AnalyticsSection> = {
  signups: "registrations", storesCreated: "registrations", setupSaved: "registrations",
  collected: "operations", payments: "journey", visitors: "audience", enquiries: "journey",
  vendor: "operations", commission: "operations", platform: "operations", refunded: "operations",
};
