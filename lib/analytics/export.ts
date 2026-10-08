import type { AnalyticsReport } from "./report";
import { csvCell } from "./model";
const date = (value: string) => new Date(value).toLocaleDateString("en-TT", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Port_of_Spain" });
export function analyticsCsv(report: AnalyticsReport) {
  const rows: unknown[][] = [["LinkWe analytics",`${date(report.start)} to ${date(report.end)}`],["Timezone",report.timezone],["Updated",report.generatedAt],["Visitor filters",`Device: ${report.filters.device}; Source: ${report.filters.source}`],["Business totals","Date range only; visitor filters do not apply"],[],["Metric","Current","Previous","Unit","Definition"],...report.metrics.map(m=>[m.label,m.value??"Unavailable",m.previous??"Not available",m.unit==='money'?'TTD cents':m.unit,m.definition])];
  for(const [name,data] of Object.entries({Daily:report.daily,Sources:report.sources,Campaigns:report.campaigns,Journey:report.funnel,Pages:report.popular,UnmetSearches:report.searches,Contacts:report.contacts,Errors:report.errors,Performance:report.performance,Vendors:report.vendors,Operations:report.operations,PaymentTypes:report.paymentTypes})) rows.push([], [name,"Count","Value (TTD cents, except web vitals)","Explanation"],...data.map(r=>[r.label,r.count,r.value??"",r.detail??""]));
  rows.push([],['Coverage','Value'],['Visitor data available',report.health.trafficAvailable],['Tracking started',report.health.firstEvent??'Not tracked yet'],['Incomplete comparison history',report.health.partialPeriod],['Unclassified legacy payments',report.health.legacyPayments],...report.health.notes.map(note=>['Definition',note]));
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
