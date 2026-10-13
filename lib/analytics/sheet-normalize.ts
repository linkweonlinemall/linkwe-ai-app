import "server-only";
import { createHash } from "node:crypto";
import { SHEET_SCHEMA, type SheetId } from "./sheet-schema";
import { unavailableExternal, type ExternalPeriod, type ExternalGroup, type ExternalMetric, type ExternalSnapshot, type ExternalSourceId } from "./external-model";

export type SheetRecord = Record<string, string | number | null>;
export type SheetData = Partial<Record<SheetId, { rows: SheetRecord[]; valid: boolean }>>;
const DAY = 86_400_000;
const fail = (): never => { throw new Error("Invalid analytics source contract."); };
function string(value: unknown): string { return typeof value === "string" && value.trim().length > 0 && value.length <= 500 ? value.trim() : fail(); }
function number(value: unknown): number | null {
  if (value == null || value === "") return null;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER ? value : fail();
}
function count(value: unknown) { const n = number(value); return n === null || Number.isSafeInteger(n) ? n : fail(); }
export function sheetDate(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value) && value >= 1 && value < 100000) return new Date(Date.UTC(1899,11,30) + Math.floor(value) * DAY).toISOString().slice(0,10);
  const text = string(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(text)) || new Date(text).toISOString().slice(0,10) !== text) return fail();
  return text;
}
function instant(value: unknown): string {
  // Date serials describe a calendar date, not an exact UTC extraction instant.
  const text = string(value);
  sheetDate(text.slice(0,10));
  return /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(text) && Number.isFinite(Date.parse(text)) ? new Date(text).toISOString() : fail();
}
function timezone(value: unknown, unknownAllowed = false): string | null {
  if (unknownAllowed && (value == null || value === "" || /unknown|not (?:provided|reported)/i.test(String(value)))) return null;
  const text = string(value);
  try { new Intl.DateTimeFormat("en", { timeZone: text }).format(); return text; } catch { return unknownAllowed ? null : fail(); }
}
function dateAt(value: string, zone: string) { return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year:"numeric",month:"2-digit",day:"2-digit" }).format(new Date(value)); }
function currency(value: unknown) { const text = string(value); return /^[A-Z]{3}$/.test(text) ? text : fail(); }
function identity(value: unknown) {
  // Raw identifiers/labels remain server-side. Numeric cells are rejected to avoid precision loss.
  return string(value);
}
function metaId(value: unknown) {
  const text = identity(value), parts = text.split("|").map(item=>item.trim());
  const id = parts.find(item=>/^(?:act_)?\d+$/.test(item));
  return id ? id.replace(/^act_/, "") : fail();
}
function hash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,16); }
function sum(rows: SheetRecord[], field: string, money = false): number | null {
  if (!rows.length) return null;
  const values = rows.map(row=>money ? number(row[field]) : count(row[field]));
  if (values.some(value=>value===null)) return null;
  const total = values.reduce<number>((a,b)=>a+(b as number),0);
  return Number.isFinite(total) && total <= Number.MAX_SAFE_INTEGER ? total : fail();
}
function ratio(a: number | null, b: number | null, multiplier = 1) { return a !== null && b !== null && b > 0 ? a / b * multiplier : null; }
function metric(key: string, label: string, value: number | null, definition: string, unit: ExternalMetric["unit"] = "count", iso?: string): ExternalMetric {
  return { key,label,value,definition,unit,...(iso?{currency:iso}:{}) };
}
function deduplicate(rows: SheetRecord[], key: (row: SheetRecord)=>unknown, latest = false) {
  const found = new Map<string,SheetRecord>();
  for (const row of rows) {
    const id=JSON.stringify(key(row)), old=found.get(id);
    if (!old) { found.set(id,row); continue; }
    if (JSON.stringify(old) === JSON.stringify(row)) continue;
    if (latest && row.extractedAt !== old.extractedAt) { if (String(row.extractedAt)>String(old.extractedAt)) found.set(id,row); continue; }
    // Extraction time alone does not make conflicting daily export values additive.
    const withoutExtraction = (r: SheetRecord) => Object.fromEntries(Object.entries(r).filter(([k])=>k!=="extractedAt"));
    if (JSON.stringify(withoutExtraction(row)) !== JSON.stringify(withoutExtraction(old))) return fail();
    if (String(row.extractedAt)>String(old.extractedAt)) found.set(id,row);
  }
  return [...found.values()];
}
function daysInWindow(period: ExternalPeriod, zone: string): string[] {
  // Daily sources cannot be prorated. Exclude a first partial source day and today's partial day.
  let first=dateAt(period.start,zone); const last=dateAt(period.end,zone);
  const midnightParts = new Intl.DateTimeFormat("en-GB",{timeZone:zone,hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).format(new Date(period.start));
  if(midnightParts!=="00:00:00")first=new Date(Date.parse(first)+DAY).toISOString().slice(0,10);
  const days:string[]=[];
  for(let d=Date.parse(first);d<Date.parse(last);d+=DAY) { if(days.length>100) return fail();days.push(new Date(d).toISOString().slice(0,10)); }
  return days;
}
function baseGroup(key: unknown, label: string, rows: SheetRecord[], basis: ExternalGroup["basis"], zone: string | null, iso: string | null, start: string, end: string, dates: string[], wanted: string[]): ExternalGroup {
  const extracted=rows.map(r=>String(r.extractedAt)).sort();
  return {key:hash(key),label,timezone:zone,currency:iso,basis,coveredPeriod:{start,end},observedRows:rows.length,observedDates:new Set(dates).size,
    coversRequestedDays:basis==="daily"&&wanted.length>0&&wanted.every(day=>dates.includes(day)),extractedAt:extracted[0],newestExtraction:extracted.at(-1)!,metrics:[],
    notes:["Totals cover observed rows only. Missing dates, accounts or channels are not zero."]};
}
function groupRows(rows: SheetRecord[], key: (r:SheetRecord)=>unknown) {
  const groups=new Map<string,SheetRecord[]>();for(const row of rows){const id=JSON.stringify(key(row));const items=groups.get(id)??[];items.push(row);groups.set(id,items);}return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b));
}
function normalizeSource(id: ExternalSourceId, input: SheetRecord[], period: ExternalPeriod, readAt: string): ExternalGroup[] {
  let rows:SheetRecord[]=input.map(row=>{
    const extractedAt=instant(row.extractedAt);if(Date.parse(extractedAt)>Date.parse(readAt)+60_000)return fail();
    return {...row,extractedAt};
  });
  if(id==="website") {
    rows=rows.map(r=>({...r,metricDate:sheetDate(r.metricDate),reportingTimezone:timezone(r.reportingTimezone),currency:currency(r.currency),property:identity(r.property),sourcePlatform:identity(r.sourcePlatform),channel:identity(r.channel)}));
    rows=deduplicate(rows,r=>[r.metricDate,r.sourcePlatform,r.property,r.channel]);
  } else if(id==="ads") {
    rows=rows.map(r=>{const start=sheetDate(r.periodStart),end=sheetDate(r.periodEnd);if(start!==end)return fail();return {...r,periodStart:start,periodEnd:end,reportingTimezone:timezone(r.reportingTimezone),currency:currency(r.currency),adAccount:metaId(r.adAccount),ad:metaId(r.ad),platform:identity(r.platform),attributionWindow:identity(r.attributionWindow)};});
    rows=deduplicate(rows,r=>[r.platform,r.adAccount,r.ad,r.periodStart,r.periodEnd,r.reportingTimezone,r.currency,r.attributionWindow]);
  } else if(id==="posts") {
    rows=rows.map(r=>{if(r.metricBasis!=="Lifetime"||timezone(r.reportingTimezone)!=="UTC")return fail();const publishedAt=instant(r.publishedAt),end=instant(r.periodEnd);if(instant(r.periodStart)!==publishedAt||end<publishedAt||end>String(r.extractedAt))return fail();return {...r,platform:identity(r.platform),account:metaId(r.account),postIdAndUrl:metaId(r.postIdAndUrl),publishedAt,format:identity(r.format)};});
    rows=deduplicate(rows,r=>[r.platform,r.account,r.postIdAndUrl,r.metricBasis],true).filter(r=>String(r.publishedAt)>=period.start&&String(r.publishedAt)<period.end);
  } else if(id==="accounts") {
    rows=rows.map(r=>{const at=instant(r.periodEnd);if(instant(r.periodStart)!==at||timezone(r.reportingTimezone)!=="UTC"||at>String(r.extractedAt))return fail();return {...r,platform:identity(r.platform),account:metaId(r.account),periodStart:at,periodEnd:at,followers:count(r.followers)};});
    rows=deduplicate(rows,r=>[r.platform,r.account,String(r.periodEnd).slice(0,10),r.reportingTimezone],true).filter(r=>String(r.periodEnd)<period.end);
    rows=groupRows(rows,r=>[r.platform,r.account]).map(([,items])=>items.sort((a,b)=>String(b.periodEnd).localeCompare(String(a.periodEnd)))[0]);
  } else {
    rows=rows.map(r=>{const start=sheetDate(r.periodStart),end=sheetDate(r.periodEnd),first=new Date(start),last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).toISOString().slice(0,10);if(!start.endsWith('-01')||end!==last)return fail();return {...r,periodStart:start,periodEnd:end,reportingTimezone:timezone(r.reportingTimezone,true),sourcePlatform:identity(r.sourcePlatform),accountOrProfile:identity(r.accountOrProfile),metric:identity(r.metric),unit:identity(r.unit)};});
    rows=deduplicate(rows,r=>[r.sourcePlatform,r.accountOrProfile,r.periodStart,r.periodEnd,r.metric,r.unit]);
    const first=dateAt(period.start,period.timezone),last=dateAt(period.end,period.timezone);
    rows=rows.filter(r=>String(r.periodStart)>=first&&String(r.periodEnd)<last);
  }
  const key=(r:SheetRecord)=>id==="website"?[r.property,r.reportingTimezone,r.currency]:id==="ads"?[r.platform,r.adAccount,r.reportingTimezone,r.currency,r.attributionWindow]:id==="posts"||id==="accounts"?[r.platform,r.account]:[r.accountOrProfile,r.reportingTimezone,r.metric,r.unit];
  const output:ExternalGroup[]=[];
  for(const [groupKey,all] of groupRows(rows,key)) {
    const zone=id==="posts"||id==="accounts"?"UTC":all[0].reportingTimezone as string|null,iso=id==="ads"||id==="website"?String(all[0].currency):null;
    const daily=id==="ads"||id==="website",wanted=daily?daysInWindow(period,zone!):[];
    const selected=daily?all.filter(r=>wanted.includes(String(id==="website"?r.metricDate:r.periodStart))):all;
    if(!selected.length)continue;
    const dates=selected.map(r=>String(id==="website"?r.metricDate:id==="posts"?r.publishedAt:r.periodStart)).sort();
    const end=id==="gbp"?selected.map(r=>String(r.periodEnd)).sort().at(-1)!:dates.at(-1)!;
    const basis=daily?"daily":id==="posts"?"lifetime":id==="accounts"?"snapshot":"monthly";
    const label=`${id==="website"?"Website reporting group":id==="ads"?"Ad reporting group":id==="gbp"?"Business reporting group":"Social reporting group"} ${output.length+1}${iso?` · ${iso}`:""}`;
    const group=baseGroup(groupKey,label,selected,basis,zone,iso,dates[0],end,dates,wanted);
    if(id==="website") {
      const sessions=sum(selected,"sessions"),engaged=sum(selected,"engagedSessions");
      group.metrics=[metric("users","Unique users",null,"Range users cannot be summed across daily/channel rows."),metric("sessions","Sessions",sessions,"Observed deduplicated daily/channel sessions."),metric("engagedSessions","Engaged sessions",engaged,"Observed engaged sessions."),metric("pageViews","Page views",sum(selected,"pageViews"),"Observed page views, not unique people."),metric("engagementRate","Engagement rate",group.coversRequestedDays?ratio(engaged,sessions,100):null,"Ratio of compatible sums; unavailable when requested days or inputs are missing.","percent"),metric("purchases","GA purchase events",sum(selected,"purchases"),"GA ecommerce events, not verified LinkWe settlements."),metric("purchaseRevenue","GA event revenue",sum(selected,"purchaseRevenue",true),"Observed GA event revenue in major currency units; not settlement.","money",iso!)];
    } else if(id==="ads") {
      const spend=sum(selected,"spend",true),impressions=sum(selected,"impressions"),clicks=sum(selected,"linkClicks"),views=sum(selected,"landingPageViews"),complete=group.coversRequestedDays;
      group.metrics=[metric("spend","Ad spend",spend,"Observed ad/day spend in major currency units.","money",iso!),metric("impressions","Impressions",impressions,"Deduplicated ad/day impressions."),metric("reach","Unique reach",null,"Daily unique reach is not additive; a separate range aggregate is required."),metric("linkClicks","Link clicks",clicks,"inline_link_clicks only."),metric("landingPageViews","Landing-page views",views,"landing_page_view only; equivalent omni events are not added."),metric("ctr","Link CTR",complete?ratio(clicks,impressions,100):null,"Ratio of sums with complete requested days and inputs.","percent"),metric("cpc","Cost per link click",complete?ratio(spend,clicks):null,"Spend / link clicks, complete compatible inputs only.","money",iso!),metric("cpm","Cost per 1,000 impressions",complete?ratio(spend,impressions,1000):null,"1,000 × spend / impressions, complete compatible inputs only.","money",iso!),metric("costPerLandingPageView","Cost per landing-page view",complete?ratio(spend,views):null,"Spend / landing_page_view, complete compatible inputs only.","money",iso!),metric("conversions","Conversions",null,"No verified conversion event definition."),metric("roas","ROAS",null,"No verified compatible attributed revenue.")];
      group.notes.push("Attribution settings are kept separate. Reported daily reach is never summed.");
    } else if(id==="posts") {
      const reels=selected.filter(r=>/reel/i.test(String(r.format)));
      group.metrics=[metric("posts","Posts in publication cohort",selected.length,"Distinct posts published within the selected period."),...(["likes","comments","shares","saves"] as const).map(field=>metric(field,`Lifetime ${field}`,sum(selected,field),"Latest lifetime observation for each distinct post; not engagement during the selected dates.")),metric("reelPlays","Lifetime reel plays",sum(reels,"videoViews"),"Reel plays only; neither unique viewers nor three-second views."),metric("reach","Reach",null,"Unavailable in this contract."),metric("impressions","Impressions",null,"Unavailable; freeform notes are never parsed into metrics.")];
      group.notes.push("Date filtering selects publication cohorts; engagement may occur outside those dates.");
    } else if(id==="accounts") {
      group.metrics=[metric("followers","Followers at snapshot",count(selected[0].followers),"Latest observed account snapshot before the report end; never summed over dates."),metric("growth","Follower growth",null,"A single current snapshot does not establish gained/lost followers or organic acquisition.")];
      if(dates[0]<period.start)group.notes.push("This latest available snapshot predates the selected period.");
    } else {
      const name=String(selected[0].metric),unit=String(selected[0].unit);
      // Only explicitly understood count metrics are additive across complete months.
      const allowed=/^(?:Profile views|Website visits|Website clicks|Calls|Call clicks|Direction requests|Directions|Messages|Chat clicks|Total interactions|Interactions|Bookings)$/i.test(name)&&/^(?:count|views|visits|clicks|calls|requests|messages|interactions|bookings)$/i.test(unit);
      group.metrics=[metric("monthlyValue",allowed?name:"Unverified monthly metric",allowed?sum(selected,"value"):null,"Complete, non-overlapping observed months; reported percentage changes are not summed.")];
      group.notes.push("Monthly data is not prorated. Messages and Chat clicks remain separate; Total interactions is not reconstructed.");
      if(!zone)group.notes.push("Source timezone is unknown; month selection uses requested calendar dates, not a verified cross-source time alignment.");
    }
    if(output.length>=100)return fail();
    output.push(group);
  }
  return output;
}
export function normalizeSheetData(data: SheetData, period: ExternalPeriod, readAt: string): ExternalSnapshot {
  if(!Number.isFinite(Date.parse(period.start))||!Number.isFinite(Date.parse(period.end))||period.start>=period.end||Date.parse(period.end)-Date.parse(period.start)>100*DAY)return fail();
  period={...period,start:instant(period.start),end:instant(period.end)};
  const result=unavailableExternal(period,"unavailable");result.status="available";result.readAt=readAt;result.cacheExpiresAt=new Date(Date.parse(readAt)+15*60_000).toISOString();
  for(const source of result.sources) {
    try {
      const table=data[source.id];if(!table?.valid)return fail();
      source.groups=normalizeSource(source.id,table.rows,period,readAt);
      source.status=source.groups.length?"available":"empty";source.issue=source.groups.length?null:"no-matching-observations";
      source.completeness=source.groups.length?"observed-rows-only":"unavailable";
      if(source.groups.length){source.coveredPeriod={start:source.groups.map(g=>g.coveredPeriod.start).sort()[0],end:source.groups.map(g=>g.coveredPeriod.end).sort().at(-1)!};source.extractedAt=source.groups.map(g=>g.extractedAt).sort()[0];source.newestExtraction=source.groups.map(g=>g.newestExtraction).sort().at(-1)!;}
    } catch { source.status="unavailable";source.issue="schema-invalid";source.groups=[]; }
    try {
      const title=SHEET_SCHEMA.find(t=>t.id===source.id)!.title;
      const logs=data.refresh?.valid?data.refresh.rows.filter(r=>r.destinationTab===title).map(r=>({at:instant(r.completedAt),status:r.status})).filter(r=>r.at<=readAt).sort((a,b)=>b.at.localeCompare(a.at)):[];
      source.lastSuccessfulRefresh=logs.find(r=>r.status==="SUCCESS")?.at??null;
      source.lastRefreshStatus=logs[0]?.status==="SUCCESS"?"success":logs[0]&&["FAILED","ERROR","PARTIAL"].includes(String(logs[0].status))?"failed":"unknown";
    } catch { /* Bad log rows never manufacture refresh evidence or hide valid metric data. */ }
  }
  if(result.sources.every(source=>source.status==="unavailable"))result.status="unavailable";
  return result;
}
