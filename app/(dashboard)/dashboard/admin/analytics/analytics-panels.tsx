import { ArrowRight, ExternalLink, Database, Clock3, ShieldCheck } from "lucide-react";
import { analyticsConnections, snapshotIsOld, type AnalyticsSection, type PrivateAnalyticsReport } from "@/lib/analytics/hub";
import { EXTERNAL_ANALYTICS_DEFINITIONS } from "@/lib/analytics/source-definitions";
import type { AnalyticsReport } from "@/lib/analytics/report";
import s from "./analytics.module.css";
import ExternalAnalytics from "./external-analytics";

function timestamp(value: string) {
  return new Date(value).toLocaleString("en-TT", { timeZone: "America/Port_of_Spain", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
export function AnalyticsFreshness({ report, now, onConnections }: { report: AnalyticsReport | null; now: number; onConnections: () => void }) {
  return <details className={s.freshness}>
    <summary><Clock3 size={16}/><span>{report ? <>{snapshotIsOld(report,now) ? "Snapshot over 15 minutes old" : "Snapshot loaded"} · <time dateTime={report.generatedAt}>{timestamp(report.generatedAt)}</time></> : "No report loaded"}</span><span className={s.coverageLabel}>Coverage details</span></summary>
    <div><p>Trinidad time. Internal records refresh on page load or when you select Refresh. The snapshot time is not an external source update time.</p><p>{report?.external?.readAt?`External data was read at ${timestamp(report.external.readAt)} and may be cached for 15 minutes. Source extraction times and missing coverage are shown separately.`:"Google Analytics, Google Business Profile and Meta totals are not synced here. Missing data remains unavailable."}</p><button type="button" onClick={onConnections}>Check source health <ArrowRight size={15}/></button></div>
  </details>;

}
export function AnalyticsConnections({ report, privateReport }: { report: AnalyticsReport | null; privateReport: PrivateAnalyticsReport | null }) {
  return <><section className={s.panel}><div className={s.panelHead}><div><h2>What is connected?</h2><p>Internal records and external marketing reports have different coverage and refresh times. They are not added together.</p></div><Database size={21}/></div>
    <div className={s.connections}>{analyticsConnections(report).map(source => <article key={source.id} className={s.connection}>
      <div><h3>{source.name}</h3><span data-connected={source.connected} className={s.connectionStatus}>{source.status}</span></div>
      <p>{source.detail}</p><small>{source.updatedAt ? <>{source.id === "visitors" ? "Last recorded event" : source.id === "business" ? "Last query" : "Oldest included extraction"}: <time dateTime={source.updatedAt}>{timestamp(source.updatedAt)}</time> · Trinidad time</> : "Freshness unavailable here"}</small>
    </article>)}</div></section>
    <section className={`${s.panel} ${s.privateReport}`}><ShieldCheck size={24}/><div><h2>Open your private marketing overview</h2><p>WebsiteDaily and GBPmonthly remain in the existing Google report. Sign in with a Google account that has access. A LinkWe admin account does not grant Google access.</p>
      {privateReport ? <a href={privateReport.href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{privateReport.title} <ExternalLink size={16}/><span className="sr-only"> (opens in a new tab)</span></a> : <p>The private report link is not configured in this environment.</p>}
      <p>This opens the restricted report. LinkWe does not embed it or make it public.</p></div></section></>;
}
const DRILLDOWNS: { section: AnalyticsSection; title: string; detail: string }[] = [
  { section: "audience", title: "Acquisition", detail: "Visitor sources, journeys and campaigns." },
  { section: "registrations", title: "Vendor activation", detail: "Signups and the current state of new stores." },
  { section: "social", title: "Social & ads", detail: "Source availability and measurement limits." },
  { section: "connections", title: "Source health", detail: "Coverage, freshness and private reports." },
];
export function AnalyticsDrilldowns({ onSelect, disabled }: { onSelect: (section: AnalyticsSection) => void; disabled: boolean }) {
  return <section aria-label="Explore analytics in detail" className={s.drilldowns}>{DRILLDOWNS.map(item => <button type="button" key={item.section} onClick={() => onSelect(item.section)} disabled={disabled}><div><strong>{item.title}</strong><span>{item.detail}</span></div><ArrowRight size={18}/></button>)}</section>;
}

export function AnalyticsSocial({ onConnections, report }: { onConnections: () => void; report: AnalyticsReport|null }) {
  if(report?.external && report.external.status!=="not-connected")return <ExternalAnalytics snapshot={report.external} sources={["posts","accounts","ads"]}/>;
  return <section className={s.panel}><div className={s.panelHead}><div><h2>Social & ads</h2><p>External totals are not connected to this dashboard yet. Existing imports remain in the private analytics workbook.</p></div><Database size={21}/></div>
    <div className={s.sourceEmpty}><strong>Performance data unavailable here</strong><p>Post engagement, followers, ad spend and unique reach need an approved read connection. No zero totals, growth or return on ad spend are inferred.</p><button type="button" onClick={onConnections}>View source health <ArrowRight size={15}/></button></div>
    <h3 className={s.sourceHeading}>How these sources will be interpreted</h3>
    {EXTERNAL_ANALYTICS_DEFINITIONS.filter(source=>['posts','accounts','ads'].includes(source.id)).map(source=><details className={s.sourceDefinition} key={source.id}><summary>{source.name}<span>{source.grain}</span></summary><p>{source.definition}</p><p>{source.caveat}</p></details>)}
  </section>;
}
