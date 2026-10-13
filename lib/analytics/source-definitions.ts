// Shared by the admin UI and server-built Rex evidence. These are definitions,
// not an imported data snapshot. No external values or refresh times are inferred.
export const EXTERNAL_ANALYTICS_DEFINITIONS = [
  { id: "website", name: "Website / Google Analytics", grain: "Daily property and channel totals",
    definition: "Only complete source reporting days inside the requested interval are included; partial days are excluded. Sessions, engaged sessions and page views may be summed across deduplicated rows for one property and period. Users are unique within each row: never sum users across channels or dates. Period users require a separate range aggregate. Engagement rate uses total engaged sessions divided by total sessions.",
    caveat: "GA purchase and revenue events are not verified LinkWe settlements. Channel groups do not prove campaign attribution or vendor activation. Consented first-party visitors and GA users are separate populations." },
  { id: "posts", name: "Organic posts", grain: "Latest lifetime snapshot per distinct post",
    definition: "Filter posts by publication date and label their engagement as lifetime engagement for that publication cohort. Keep the latest extraction per post. Sum likes, comments, shares and saves only across distinct posts. Reel plays are not unique viewers or three-second views.",
    caveat: "Publication dates are not engagement activity dates. Reach, impressions and clicks are unavailable in the current contract; do not extract feed views from notes or calculate engagement divided by reach." },
  { id: "accounts", name: "Account audience", grain: "Latest account snapshot",
    definition: "Select the latest observed follower snapshot for each account. Never sum followers over dates. One snapshot cannot establish growth, organic-only acquisition or a historical end-of-day total.",
    caveat: "Follower counts across platforms do not identify unique people. Missing gained and lost follower fields remain unavailable." },
  { id: "ads", name: "Paid ads", grain: "One ad per reporting day, timezone, currency and attribution setting",
    definition: "Only complete source reporting days inside the requested interval are included. Deduplicate by platform, account ID, ad ID, day, timezone, currency and attribution setting. Sum spend, impressions, inline link clicks and landing_page_view only for compatible rows. Never sum daily unique reach. Range reach needs a separately verified range aggregate. Do not add omni_landing_page_view to the same landing-page event.",
    caveat: "CTR, CPC, CPM and cost per landing-page view require complete matching inputs, ratios of sums and a positive denominator. Keep currencies separate. Missing dates are not zero. Conversions, conversion rate and ROAS are unavailable without verified conversion and revenue definitions." },
  { id: "gbp", name: "Google Business Profile", grain: "Complete, non-overlapping calendar months per profile and metric",
    definition: "Include only complete months; do not prorate monthly values into partial daily filters. Profile views are not unique people, and website visits are not GA sessions. Keep Messages and Chat clicks separate. Total interactions is its own reported measure, not a sum of component metrics.",
    caveat: "Unknown timezone and missing values stay unavailable. Reported percentage changes are not additive. Private email source links and unstructured notes are withheld." },
] as const;

export function externalAnalyticsEvidence(start: string, end: string) {
  return EXTERNAL_ANALYTICS_DEFINITIONS.map(source => ({
    ...source, status: "not-connected" as const, requestedPeriod: { start, end },
    coveredPeriod: null, extractedAt: null, lastSuccessfulRefresh: null,
    completeness: "unavailable" as const, refreshMode: "unverified" as const,
    metrics: null,
  }));
}
