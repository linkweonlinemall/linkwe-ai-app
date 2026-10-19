import type { AnalyticsReport } from "./report";
import { analyticsConnections } from "./hub";
import { csvCell } from "./model";
const date = (value: string) => new Date(value).toLocaleDateString("en-TT", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Port_of_Spain" });
export function analyticsCsv(report: AnalyticsReport) {
  const rows: unknown[][] = [["LinkWe analytics",`${date(report.start)} to ${date(report.end)}`],["Timezone",report.timezone],["Updated",report.generatedAt],["Visitor filters",`Device: ${report.filters.device}; Source: ${report.filters.source}`],["Business totals","Date range only; visitor filters do not apply"],[],["Metric","Current","Previous","Unit","Definition"],...report.metrics.map(m=>[m.label,m.value??"Unavailable",m.previous??"Not available",m.unit==='money'?'TTD cents':m.unit,m.definition])];
  for(const [name,data] of Object.entries({Registrations:report.registrations,RegistrationDaily:report.registrationDaily,Daily:report.daily,Sources:report.sources,Campaigns:report.campaigns,Journey:report.funnel,Pages:report.popular,UnmetSearches:report.searches,Contacts:report.contacts,Errors:report.errors,Performance:report.performance,Vendors:report.vendors,Operations:report.operations,PaymentTypes:report.paymentTypes})) rows.push([], [name,"Count","Value (TTD cents, except web vitals)","Explanation"],...data.map(r=>[r.label,r.count,r.value??"",r.detail??""]));
  rows.push([],['Coverage','Value'],['Visitor data available',report.health.trafficAvailable],['Tracking started',report.health.firstEvent??'Not tracked yet'],['Incomplete comparison history',report.health.partialPeriod],['Unclassified legacy payments',report.health.legacyPayments],...report.health.notes.map(note=>['Definition',note]));
  rows.push([],['Data source','Connection status','Last known time','Scope'],...analyticsConnections(report).map(source=>[source.name,source.status,source.updatedAt??'Unavailable here',source.detail]));
  if(report.external) {
    rows.push([],['External read status',report.external.status],['External authorized read at',report.external.readAt??'Unavailable'],['External cache expires',report.external.cacheExpiresAt??'Unavailable']);
    for(const source of report.external.sources) {
      rows.push([],['External source',source.name],['Status',source.status],['Requested start',source.requestedPeriod.start],['Requested end',source.requestedPeriod.end],['Requested timezone',source.requestedPeriod.timezone],['Completeness',source.completeness],['Refresh automation',source.refreshMode],['Last reported successful refresh',source.lastSuccessfulRefresh??'Unavailable'],['Latest reported run status',source.lastRefreshStatus],['Definition',source.definition],['Caveat',source.caveat]);
      for(const group of source.groups) {
        rows.push([],['Source group',group.label],['Basis',group.basis],['Covered start',group.coveredPeriod.start],['Covered end',group.coveredPeriod.end],['Source timezone',group.timezone??'Unknown'],['Currency',group.currency??'Not applicable'],['Observed rows',group.observedRows],['Observed dates',group.observedDates],['Every complete requested date observed',group.coversRequestedDays],['Missing reporting dates',group.missingDates.join('; ')],['Oldest extraction',group.extractedAt],['Newest extraction',group.newestExtraction]);
        if(group.adIdentity)rows.push(['Platform',group.adIdentity.platform],['Ad account ID',group.adIdentity.accountId],['Ad ID',group.adIdentity.adId],['Reported attribution',group.adIdentity.attributionWindow]);
        rows.push(...group.notes.map(note=>['Coverage note',note]),['Metric','Observed value','Unit','Currency','Quality','Rows with values','Blank rows','Total observed rows','Definition'],...group.metrics.map(metric=>[metric.label,metric.value??'Unavailable',metric.unit,metric.currency??'',metric.quality,metric.coverage?.observedRows??'',metric.coverage?.missingRows??'',metric.coverage?.totalRows??'',metric.definition]));
      }
    }
  }
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
