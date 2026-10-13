import { EXTERNAL_ANALYTICS_DEFINITIONS } from "./source-definitions";

export type ExternalSourceId = typeof EXTERNAL_ANALYTICS_DEFINITIONS[number]["id"];
export type ExternalPeriod = { start: string; end: string; timezone: string };
export type ExternalMetric = { key: string; label: string; value: number | null; unit: "count" | "money" | "percent"; currency?: string; definition: string };
export type ExternalGroup = {
  key: string; label: string; timezone: string | null; currency: string | null;
  basis: "daily" | "lifetime" | "snapshot" | "monthly";
  coveredPeriod: { start: string; end: string }; observedRows: number; observedDates: number;
  coversRequestedDays: boolean; extractedAt: string; newestExtraction: string;
  metrics: ExternalMetric[]; notes: string[];
};
export type ExternalSource = typeof EXTERNAL_ANALYTICS_DEFINITIONS[number] & {
  status: "not-connected" | "available" | "empty" | "unavailable" | "stale";
  requestedPeriod: ExternalPeriod; coveredPeriod: { start: string; end: string } | null;
  extractedAt: string | null; newestExtraction: string | null;
  lastSuccessfulRefresh: string | null; lastRefreshStatus: "success" | "failed" | "unknown";
  completeness: "unavailable" | "observed-rows-only";
  refreshMode: "unverified"; metrics: null; groups: ExternalGroup[];
  issue: "not-configured" | "read-failed" | "schema-invalid" | "no-matching-observations" | null;
};
export type ExternalSnapshot = {
  status: "not-connected" | "available" | "unavailable" | "stale";
  readAt: string | null; cacheExpiresAt: string | null; contractVersion: string;
  sources: ExternalSource[];
};
export function unavailableExternal(period: ExternalPeriod, status: "not-connected" | "unavailable" = "not-connected"): ExternalSnapshot {
  return { status, readAt: null, cacheExpiresAt: null, contractVersion: "1.0.0", sources: EXTERNAL_ANALYTICS_DEFINITIONS.map(source => ({
    ...source, status, requestedPeriod: period, coveredPeriod: null, extractedAt: null, newestExtraction: null,
    lastSuccessfulRefresh: null, lastRefreshStatus: "unknown", completeness: "unavailable", refreshMode: "unverified",
    metrics: null, groups: [], issue: status === "not-connected" ? "not-configured" : "read-failed",
  })) };
}
