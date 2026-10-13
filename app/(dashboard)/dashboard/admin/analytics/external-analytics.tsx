import type { ExternalMetric, ExternalSnapshot, ExternalSourceId } from "@/lib/analytics/external-model";
import s from "./analytics.module.css";

function value(metric: ExternalMetric) {
  if(metric.value===null)return "Unavailable";
  if(metric.unit==="money")return `${metric.currency} ${metric.value.toLocaleString("en-TT",{maximumFractionDigits:2})}`;
  return `${metric.value.toLocaleString("en-TT",{maximumFractionDigits:2})}${metric.unit==="percent"?"%":""}`;
}
function stamp(text:string|null){return text?new Date(text).toLocaleString("en-TT",{timeZone:"America/Port_of_Spain",dateStyle:"medium",timeStyle:"short"}):"Unavailable";}
export default function ExternalAnalytics({ snapshot, sources }: {snapshot:ExternalSnapshot|undefined;sources:ExternalSourceId[]}) {
  if(!snapshot||snapshot.status==="not-connected")return null;
  return <div className={s.externalReports}>{snapshot.sources.filter(source=>sources.includes(source.id)).map(source=><section key={source.id} className={s.panel}>
    <div className={s.panelHead}><div><h2>{source.name}</h2><p>{source.grain}. Source data uses its own reporting timezone; visitor device/source filters do not apply.</p></div><span className={s.connectionStatus} data-connected={source.status==="available"}>{source.status==="available"?"Verified observations":source.status==="stale"?"Stale · refresh failed":source.status==="empty"?"No matching observations":"Unavailable"}</span></div>
    <p className={s.externalCoverage}>Authorized read: {stamp(snapshot.readAt)} · Trinidad time. Cache expires: {stamp(snapshot.cacheExpiresAt)}. Refresh automation: {source.refreshMode}.</p>
    <p className={s.externalCoverage}>Requested interval: {stamp(source.requestedPeriod.start)} – {stamp(source.requestedPeriod.end)} (end excluded).</p>
    <p className={s.externalCoverage}>Latest reported importer run: {source.lastRefreshStatus}. Last reported success: {stamp(source.lastSuccessfulRefresh)}. A run does not establish complete coverage.</p>
    {!source.groups.length&&<p className={s.empty}>{source.status==="empty"?"No observations match this period and the source’s date rules. This is not a zero total.":"This source could not be verified. No totals are substituted."}</p>}
    {source.groups.map(group=><details className={s.externalGroup} key={group.key} open={source.groups.length===1}>
      <summary>{group.label}<span>{group.basis} · {group.timezone??"Timezone unknown"} · {group.observedRows} observed rows</span></summary>
      <p className={s.externalCoverage}>Observed coverage: {group.coveredPeriod.start} – {group.coveredPeriod.end}. Oldest extraction: {stamp(group.extractedAt)}; newest: {stamp(group.newestExtraction)} (Trinidad display time).</p>
      {group.basis==="daily"&&<p className={s.externalCoverage}>{group.observedDates} observed reporting dates. {group.coversRequestedDays?"Every complete requested source date has an observation; account/channel completeness is unverified.":"Requested reporting dates are missing; derived rates are unavailable."}</p>}
      {group.notes.map(note=><p key={note} className={s.externalCoverage}>{note}</p>)}
      <div className={s.externalMetrics}>{group.metrics.map(metric=><article key={metric.key}><span>{metric.label}</span><strong>{value(metric)}</strong><details><summary>Definition</summary><p>{metric.definition}</p></details></article>)}</div>
    </details>)}
    <details className={s.sourceDefinition}><summary>Measurement limits</summary><p>{source.definition}</p><p>{source.caveat}</p></details>
  </section>)}</div>;
}
