import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { analyticsPeriod, parseFilters, ANALYTICS_TIMEZONE, RETENTION_DAYS } from "./model";

export type Metric = { key: string; label: string; value: number | null; previous: number | null; unit: "count" | "money" | "percent"; definition: string };
export type Row = { label: string; count: number; detail?: string; value?: number };
export type AnalyticsReport = {
  filters: ReturnType<typeof parseFilters>; generatedAt: string; start: string; end: string; previousStart: string; timezone: string; periodLabel: string;
  metrics: Metric[]; daily: Row[]; sources: Row[]; campaigns: Row[]; popular: Row[]; searches: Row[]; contacts: Row[]; errors: Row[]; performance: Row[];
  funnel: Row[]; vendors: Row[]; operations: Row[]; paymentTypes: Row[];
  insights: { title: string; detail: string; section: string }[];
  health: { trafficAvailable: boolean; firstEvent: string | null; lastEvent: string | null; partialPeriod: boolean; legacyPayments: number; gaConfigured: boolean; rexConfigured: boolean; retentionDays: number; notes: string[] };
};
const number = (value: unknown) => Number(value ?? 0);
const normalize = (rows: Array<{ label: string; count: unknown; detail?: string; value?: unknown }>): Row[] => rows.map(row => ({ label: row.label, count: number(row.count), ...(row.detail ? { detail: row.detail } : {}), ...(row.value != null ? { value: number(row.value) } : {}) }));
// Environment is persisted at payment creation. Older unclassified attempts are
// displayed as a coverage gap, never silently treated as live money.
const live = Prisma.sql`COALESCE(p.payment_environment, p.provider_data->>'environment', 'unknown') = 'live' AND COALESCE(p.provider_data->>'adminTest', 'false') <> 'true' AND p.currency='TTD' AND u.role NOT IN ('ADMIN','COURIER')`;
const paid = Prisma.sql`p.paid_at IS NOT NULL AND p.status IN ('SUCCEEDED','REFUND_REQUESTED','REFUNDED','CHARGEBACK_PENDING','CHARGEBACK_PROCESSED','CHARGEBACK_RELEASED','FRAUD_CONFIRMED')`;

export async function buildAnalyticsReport(input: unknown): Promise<AnalyticsReport> {
  const filters = parseFilters(input), now = new Date();
  const { start, end, previousStart } = analyticsPeriod(filters.days, now);
  const localDate = (value: Date) => value.toLocaleDateString('en-TT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: ANALYTICS_TIMEZONE });
  const periodLabel = `${localDate(start)} – ${localDate(end)} · Trinidad & Tobago time`;
  // Prisma Date parameters are timestamptz; application columns contain UTC
  // timestamp values. Explicit conversion avoids the database session timezone.
  const startSql = Prisma.sql`(${start}::timestamptz AT TIME ZONE 'UTC')`;
  const endSql = Prisma.sql`(${end}::timestamptz AT TIME ZONE 'UTC')`;
  const previousStartSql = Prisma.sql`(${previousStart}::timestamptz AT TIME ZONE 'UTC')`;
  const eventFilters = Prisma.sql`e.created_at >= ${previousStartSql} AND e.created_at < ${endSql} AND (${filters.device} = 'all' OR e.device = ${filters.device}) AND (${filters.source} = 'all' OR e.source = ${filters.source})`;
  const [payments, ledger, repeat, vendorRows, ops, legacy, paymentTypes, daily] = await Promise.all([
    prisma.$queryRaw<Array<{ period: string; collected: unknown; payments: unknown; refunded: unknown; failed: unknown; attempts: unknown; platform: unknown }>>(Prisma.sql`
      SELECT CASE WHEN p.paid_at >= ${startSql} THEN 'current' ELSE 'previous' END AS period,
        COALESCE(SUM(p.amount_minor),0) AS collected, COUNT(*) AS payments,
        COALESCE(SUM(p.amount_minor) FILTER (WHERE p.status = 'REFUNDED'),0) AS refunded,
        0 AS failed, 0 AS attempts,
        COALESCE(SUM(p.amount_minor) FILTER (WHERE p.purpose IN ('VENDOR_SUBSCRIPTION','AI_TOPUP') AND p.status <> 'REFUNDED'),0) AS platform
      FROM payment_attempts p JOIN users u ON u.id = p.user_id
      WHERE ${live} AND ${paid} AND p.paid_at >= ${previousStartSql} AND p.paid_at < ${endSql}
      GROUP BY period
      UNION ALL
      SELECT CASE WHEN p.created_at >= ${startSql} THEN 'current-attempts' ELSE 'previous-attempts' END,
        0,0,0,COUNT(*) FILTER (WHERE p.status IN ('FAILED','ERROR')),COUNT(*),0
      FROM payment_attempts p JOIN users u ON u.id=p.user_id WHERE ${live} AND p.created_at >= ${previousStartSql} AND p.created_at < ${endSql} GROUP BY 1`),
    prisma.$queryRaw<Array<{ period: string; vendor: unknown; commission: unknown; refunds: unknown }>>(Prisma.sql`
      SELECT CASE WHEN l.created_at >= ${startSql} THEN 'current' ELSE 'previous' END AS period,
      COALESCE(SUM(l.amount_minor) FILTER (WHERE l.entry_type='CREDIT_ORDER_SETTLEMENT'),0) AS vendor,
      COALESCE(SUM(l.amount_minor) FILTER (WHERE l.entry_type='DEBIT_PLATFORM_FEE'),0) AS commission,
      COALESCE(SUM(l.amount_minor) FILTER (WHERE l.entry_type='DEBIT_REFUND'),0) AS refunds
      FROM vendor_ledger_entries l JOIN stores s ON s.id=l.store_id JOIN users owner ON owner.id=s.owner_id
      WHERE l.created_at >= ${previousStartSql} AND l.created_at < ${endSql} AND l.currency='TTD' AND owner.role='VENDOR'
      AND NOT EXISTS (SELECT 1 FROM payment_attempts p JOIN users buyer ON buyer.id=p.user_id
        WHERE (p.main_order_id=l.main_order_id OR p.target_id=l.booking_id OR p.target_id=l.metadata->>'ticketOrderId')
        AND (p.payment_environment='sandbox' OR p.provider_data->>'environment'='sandbox' OR p.provider_data->>'adminTest'='true' OR buyer.role IN ('ADMIN','COURIER')))
      GROUP BY period`),
    prisma.$queryRaw<Array<{ current: unknown; previous: unknown; customers: unknown }>>(Prisma.sql`
      WITH buyers AS (SELECT p.user_id, MIN(p.paid_at) AS first_paid FROM payment_attempts p JOIN users u ON u.id=p.user_id WHERE ${live} AND ${paid} AND p.purpose NOT IN ('VENDOR_SUBSCRIPTION','AI_TOPUP') GROUP BY p.user_id)
      SELECT COUNT(DISTINCT p.user_id) FILTER (WHERE p.paid_at >= ${startSql} AND b.first_paid < ${startSql}) AS current,
      COUNT(DISTINCT p.user_id) FILTER (WHERE p.paid_at < ${startSql} AND b.first_paid < ${previousStartSql}) AS previous,
      COUNT(DISTINCT p.user_id) FILTER (WHERE p.paid_at >= ${startSql}) AS customers
      FROM payment_attempts p JOIN users u ON u.id=p.user_id JOIN buyers b ON b.user_id=p.user_id WHERE ${live} AND ${paid} AND p.purpose NOT IN ('VENDOR_SUBSCRIPTION','AI_TOPUP') AND p.paid_at >= ${previousStartSql} AND p.paid_at < ${endSql}`),
    prisma.$queryRaw<Array<{ label: string; count: unknown; detail: string }>>(Prisma.sql`
      SELECT 'Vendors joined' AS label, COUNT(*) AS count, 'Vendor accounts created in this period; imported accounts included.' AS detail FROM users WHERE role='VENDOR' AND created_at >= ${startSql} AND created_at < ${endSql}
      UNION ALL SELECT 'Imported vendors',COUNT(DISTINCT r."createdUserId"),'Identified by saved bulk-import history. Other administrator-created accounts may not have origin history.' FROM "ImportRow" r JOIN users u ON u.id=r."createdUserId" WHERE u.role='VENDOR' AND u.created_at >= ${startSql} AND u.created_at < ${endSql}
      UNION ALL SELECT 'Stores still in setup',COUNT(*),'Current status of stores created in this period.' FROM stores s JOIN users u ON u.id=s.owner_id WHERE u.role='VENDOR' AND s.created_at >= ${startSql} AND s.created_at < ${endSql} AND s.status='draft'
      UNION ALL SELECT 'Stores open',COUNT(*),'Active stores created in this period.' FROM stores s JOIN users u ON u.id=s.owner_id WHERE u.role='VENDOR' AND s.created_at >= ${startSql} AND s.created_at < ${endSql} AND s.status='active'
      UNION ALL SELECT 'Stores with published products',COUNT(*),'Stores created in this period with at least one published product or service.' FROM stores s JOIN users u ON u.id=s.owner_id WHERE u.role='VENDOR' AND s.created_at >= ${startSql} AND s.created_at < ${endSql} AND EXISTS(SELECT 1 FROM "Product" p WHERE p."storeId"=s.id AND p."isPublished"=true)
      UNION ALL SELECT 'Stores with settled earnings',COUNT(*),'Stores created in this period with a settlement recorded by now; this is not a same-session conversion rate.' FROM stores s JOIN users u ON u.id=s.owner_id WHERE u.role='VENDOR' AND s.created_at >= ${startSql} AND s.created_at < ${endSql} AND EXISTS(SELECT 1 FROM vendor_ledger_entries l WHERE l.store_id=s.id AND l.entry_type='CREDIT_ORDER_SETTLEMENT')`),
    prisma.$queryRaw<Array<{ label: string; count: unknown; detail: string }>>(Prisma.sql`
      SELECT 'Bookings requested' AS label,COUNT(*) AS count,'Created in this period; excludes administrator and courier accounts.' AS detail FROM "ProductBooking" b JOIN users u ON u.id=b."customerId" WHERE u.role NOT IN ('ADMIN','COURIER') AND b."createdAt">=${startSql} AND b."createdAt"<${endSql}
      UNION ALL SELECT 'Bookings completed',COUNT(*),'Completed in this period, using the recorded completion date.' FROM "ProductBooking" b JOIN users u ON u.id=b."customerId" WHERE u.role NOT IN ('ADMIN','COURIER') AND b."completed_at">=${startSql} AND b."completed_at"<${endSql}
      UNION ALL SELECT 'Bookings cancelled',COUNT(*),'Cancelled in this period, using the recorded cancellation date.' FROM "ProductBooking" b JOIN users u ON u.id=b."customerId" WHERE u.role NOT IN ('ADMIN','COURIER') AND b."cancelledAt">=${startSql} AND b."cancelledAt"<${endSql}
      UNION ALL SELECT 'Ticket orders',COUNT(*),'Orders created in this period and currently paid. Includes free tickets.' FROM ticket_orders t JOIN users u ON u.id=t."userId" WHERE u.role NOT IN ('ADMIN','COURIER') AND t.status='PAID' AND t."createdAt">=${startSql} AND t."createdAt"<${endSql}
      UNION ALL SELECT 'Tickets checked in',COUNT(*),'Successful admissions recorded in this period.' FROM ticket_check_ins WHERE "scannedAt">=${startSql} AND "scannedAt"<${endSql} AND outcome='ADMITTED'
      UNION ALL SELECT 'Deliveries completed',COUNT(*),'Outbound deliveries with a completion date in this period.' FROM shipments WHERE type='OUTBOUND_DELIVERY' AND delivered_at>=${startSql} AND delivered_at<${endSql}
      UNION ALL SELECT 'Digital purchases accessed',COUNT(*),'Purchased downloads first accessed in this period; each entitlement counts once.' FROM "DigitalDownload" d JOIN users u ON u.id=d."customerId" WHERE u.role NOT IN ('ADMIN','COURIER') AND d."firstDownloadAt">=${startSql} AND d."firstDownloadAt"<${endSql}
      UNION ALL SELECT 'Service subscriptions started',COUNT(*),'Subscriptions created in this period; may include free trials.' FROM customer_service_subscriptions s JOIN users u ON u.id=s.customer_id WHERE u.role NOT IN ('ADMIN','COURIER') AND s.created_at>=${startSql} AND s.created_at<${endSql}
      UNION ALL SELECT 'Service subscription renewals',COUNT(*),'Confirmed live subscription payments after the first successful payment for the same subscription.' FROM payment_attempts p JOIN users u ON u.id=p.user_id WHERE ${live} AND ${paid} AND p.purpose='SERVICE_SUBSCRIPTION' AND p.paid_at>=${startSql} AND p.paid_at<${endSql} AND EXISTS(SELECT 1 FROM payment_attempts prior WHERE prior.target_id=p.target_id AND prior.purpose=p.purpose AND prior.paid_at<p.paid_at AND prior.status='SUCCEEDED' AND prior.payment_environment='live')
      UNION ALL SELECT 'Service subscriptions cancelled',COUNT(*),'Cancellations recorded in this period.' FROM customer_service_subscriptions s JOIN users u ON u.id=s.customer_id WHERE u.role NOT IN ('ADMIN','COURIER') AND s.canceled_at>=${startSql} AND s.canceled_at<${endSql}
      UNION ALL SELECT 'Service enquiries requested',COUNT(*),'On-demand and quote requests created in this period.' FROM on_demand_requests r JOIN users u ON u.id=r."customerId" WHERE u.role NOT IN ('ADMIN','COURIER') AND r."createdAt">=${startSql} AND r."createdAt"<${endSql}
      UNION ALL SELECT 'Customer conversations started',COUNT(*),'New customer-to-store conversations, not the contents of messages.' FROM "Conversation" c JOIN users u ON u.id=c."customerId" WHERE u.role NOT IN ('ADMIN','COURIER') AND c."createdAt">=${startSql} AND c."createdAt"<${endSql}`),
    prisma.$queryRaw<Array<{ count: unknown }>>(Prisma.sql`SELECT COUNT(*) AS count FROM payment_attempts p JOIN users u ON u.id=p.user_id WHERE p.payment_environment IS NULL AND p.provider_data->>'environment' IS NULL AND u.role NOT IN ('ADMIN','COURIER') AND p.created_at>=${startSql} AND p.created_at<${endSql}`),
    prisma.$queryRaw<Array<{ label: string; count: unknown; value: unknown }>>(Prisma.sql`SELECT p.purpose::text AS label, COUNT(*) AS count,SUM(p.amount_minor) AS value FROM payment_attempts p JOIN users u ON u.id=p.user_id WHERE ${live} AND ${paid} AND p.paid_at>=${startSql} AND p.paid_at<${endSql} GROUP BY p.purpose ORDER BY value DESC`),
    prisma.$queryRaw<Array<{ label: string; count: unknown; value: unknown }>>(Prisma.sql`SELECT to_char(p.paid_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Port_of_Spain','YYYY-MM-DD') AS label,COUNT(*) AS count,SUM(p.amount_minor) AS value FROM payment_attempts p JOIN users u ON u.id=p.user_id WHERE ${live} AND ${paid} AND p.paid_at>=${startSql} AND p.paid_at<${endSql} GROUP BY 1 ORDER BY 1`),
  ]);
  const metrics: Metric[] = [];
  function metric(key: string, label: string, value: number | null, previous: number | null, unit: Metric['unit'], definition: string) { metrics.push({ key, label, value, previous, unit, definition }); }
  const payment = (period: string, field: 'collected'|'payments'|'refunded'|'failed'|'attempts'|'platform') => number(payments.find(r => r.period===period)?.[field]);
  const settlement = (period: string, field: 'vendor'|'commission'|'refunds') => number(ledger.find(r => r.period===period)?.[field]);
  metric('collected','Payments collected',payment('current','collected'),payment('previous','collected'),'money','Provider-confirmed live TTD payments by payment date, including delivery and platform plans. Before refunds; excludes sandbox, staff and unclassified legacy payments.');
  metric('payments','Successful payments',payment('current','payments'),payment('previous','payments'),'count','Confirmed payments, not orders. A booking deposit, balance and subscription renewal are separate payments. Refunded payments remain in this historical count.');
  metric('vendor','Settled vendor earnings',settlement('current','vendor'),settlement('previous','vendor'),'money','Settlement credits after commission, by ledger date. Before refund deductions and payouts. Known test payments are excluded; legacy ledger records may lack environment history.');
  metric('commission','LinkWe commission',settlement('current','commission'),settlement('previous','commission'),'money','Commission recorded on settlements by ledger date, before adjustments and operating costs. This is not profit and excludes subscription income.');
  metric('platform','Plans & AI top-ups',payment('current','platform'),payment('previous','platform'),'money','Confirmed vendor-plan and AI top-up payments, excluding fully refunded payments. Separate from marketplace commissions.');
  metric('refunded','Refunded from these payments',payment('current','refunded'),payment('previous','refunded'),'money','Full refunds currently recorded against payments collected in the selected period. Not refunds issued during that period; partial refunds require a separate refund ledger.');
  metric('refundDeductions','Vendor refund deductions',settlement('current','refunds'),settlement('previous','refunds'),'money','Vendor ledger refund debits posted in this period. These are vendor deductions, not total customer refunds.');
  metric('failed','Failed payment attempts',payment('current-attempts','failed'),payment('previous-attempts','failed'),'count','Live attempts created in this period currently marked failed or error. Retries count separately; expiry is not labelled a payment failure.');
  metric('repeat','Returning buyers',number(repeat[0]?.current),number(repeat[0]?.previous),'count','People paying in this period who also had a confirmed live purchase before the period. Excludes vendor plans and AI top-ups. Does not identify anonymous visitors across devices.');
  metric('buyers','Paying customers',number(repeat[0]?.customers),null,'count','Distinct customer accounts with confirmed live purchases in the selected period. Refunded purchases remain counted.');
  let trafficAvailable = true, firstEvent: string | null = null, lastEvent: string | null = null;
  let sources: Row[] = [], campaigns: Row[] = [], popular: Row[] = [], searches: Row[] = [], contacts: Row[] = [], errors: Row[] = [], performance: Row[] = [], funnel: Row[] = [];
  try {
    const [summary, activity, rankings, journeys, coverage, sourceRows] = await Promise.all([
      prisma.$queryRaw<Array<{ period: string; visitors: unknown; sessions: unknown; views: unknown; returning: unknown }>>(Prisma.sql`SELECT CASE WHEN e.created_at>=${startSql} THEN 'current' ELSE 'previous' END AS period, COUNT(DISTINCT e.visitor_id) AS visitors,COUNT(DISTINCT e.session_id) AS sessions,COUNT(*) FILTER(WHERE e.name='page_view') AS views,COUNT(DISTINCT e.visitor_id) FILTER (WHERE EXISTS (SELECT 1 FROM analytics_events prior WHERE prior.visitor_id=e.visitor_id AND prior.created_at < CASE WHEN e.created_at>=${startSql} THEN ${startSql} ELSE ${previousStartSql} END)) AS returning FROM analytics_events e WHERE ${eventFilters} GROUP BY 1`),
      prisma.$queryRaw<Array<{ name: string; current: unknown; previous: unknown }>>(Prisma.sql`SELECT e.name,COUNT(*) FILTER(WHERE e.created_at>=${startSql}) AS current,COUNT(*) FILTER(WHERE e.created_at<${startSql}) AS previous FROM analytics_events e WHERE ${eventFilters} GROUP BY e.name`),
      prisma.$queryRaw<Array<{ kind: string; label: string; count: unknown; detail: string; value: unknown }>>(Prisma.sql`
        WITH ranked AS (SELECT e.name AS kind,CASE WHEN e.name IN ('page_view','view_item','view_store') THEN e.path ELSE COALESCE(e.label,'Unspecified') END AS label,
        COUNT(*) AS count, '' AS detail, AVG(e.value) AS value FROM analytics_events e WHERE ${eventFilters} AND e.created_at>=${startSql} AND e.name IN ('page_view','search','contact_click','checkout_error','web_vital','booking_unavailable')
        GROUP BY 1,2
        UNION ALL SELECT 'unmet',COALESCE(e.label,'Private search'),COUNT(*),'No results',0 FROM analytics_events e WHERE ${eventFilters} AND e.created_at>=${startSql} AND e.name='search' AND e.value=0 GROUP BY e.label
         ) SELECT kind,label,count,detail,value FROM (SELECT *,ROW_NUMBER() OVER(PARTITION BY kind ORDER BY count DESC,label) AS rank FROM ranked) r WHERE rank<=12 ORDER BY count DESC`),
      prisma.$queryRaw<Array<{ label: string; count: unknown }>>(Prisma.sql`
        WITH events AS (SELECT * FROM analytics_events e WHERE ${eventFilters} AND e.created_at>=${startSql}),
        views AS (SELECT session_id,MIN(created_at) AS at FROM events WHERE name='view_item' AND path ~ '^/(product|products)/' GROUP BY session_id),
        carts AS (SELECT v.session_id,MIN(e.created_at) AS at FROM views v JOIN events e ON e.session_id=v.session_id AND e.created_at>=v.at AND e.name='add_to_cart' GROUP BY v.session_id),
        checkout AS (SELECT c.session_id,MIN(e.created_at) AS at FROM carts c JOIN events e ON e.session_id=c.session_id AND e.created_at>=c.at AND e.name='begin_checkout' GROUP BY c.session_id),
        redirect AS (SELECT c.session_id,MIN(e.created_at) AS at FROM checkout c JOIN events e ON e.session_id=c.session_id AND e.created_at>=c.at AND e.name='payment_redirect' GROUP BY c.session_id),
        bought AS (SELECT DISTINCT r.session_id FROM redirect r JOIN analytics_checkouts a ON a.session_id=r.session_id JOIN payment_attempts p ON p.merchant_order_id=a.merchant_order_id JOIN users u ON u.id=p.user_id WHERE ${live} AND ${paid} AND p.purpose='PRODUCT_ORDER' AND p.paid_at>=r.at AND p.paid_at<${endSql})
        SELECT 'Viewed an item' AS label,COUNT(*) AS count FROM views UNION ALL SELECT 'Added to cart',COUNT(*) FROM carts UNION ALL SELECT 'Opened checkout',COUNT(*) FROM checkout UNION ALL SELECT 'Reached payment',COUNT(*) FROM redirect UNION ALL SELECT 'Payment confirmed',COUNT(*) FROM bought`),
      prisma.$queryRaw<Array<{ first: Date | null; last: Date | null }>>(Prisma.sql`SELECT (SELECT started_at FROM analytics_collection WHERE id='main') AS first,MAX(created_at) AS last FROM analytics_events`),
      prisma.$queryRaw<Array<{ label: string; campaign: string | null; count: unknown; contacts: unknown; payments: unknown; value: unknown }>>(Prisma.sql`
        WITH visits AS (SELECT e.source,COALESCE(e.campaign,'') AS campaign,COUNT(DISTINCT e.session_id) AS visits,COUNT(*) FILTER(WHERE e.name='contact_click') AS contacts FROM analytics_events e WHERE ${eventFilters} AND e.created_at>=${startSql} GROUP BY 1,2),
        sales AS (SELECT a.source,COALESCE(a.campaign,'') AS campaign,COUNT(*) AS payments,SUM(p.amount_minor) AS value FROM analytics_checkouts a JOIN payment_attempts p ON p.merchant_order_id=a.merchant_order_id JOIN users u ON u.id=p.user_id WHERE ${live} AND ${paid} AND p.paid_at>=${startSql} AND p.paid_at<${endSql} AND (${filters.device}='all' OR a.device=${filters.device}) AND (${filters.source}='all' OR a.source=${filters.source}) GROUP BY 1,2),
        combined AS (SELECT COALESCE(v.source,s.source) AS label,COALESCE(v.campaign,s.campaign) AS campaign,COALESCE(v.visits,0) AS count,COALESCE(v.contacts,0) AS contacts,COALESCE(s.payments,0) AS payments,COALESCE(s.value,0) AS value FROM visits v FULL JOIN sales s ON s.source=v.source AND s.campaign=v.campaign),
        totals AS (SELECT label,'' AS campaign,SUM(count) AS count,SUM(contacts) AS contacts,SUM(payments) AS payments,SUM(value) AS value FROM combined GROUP BY label)
        (SELECT * FROM totals ORDER BY count DESC,label LIMIT 20) UNION ALL (SELECT * FROM combined WHERE campaign<>'' ORDER BY count DESC,label LIMIT 20)`),
    ]);
    for (const [key, label, definition] of [['visitors','Measured visitors','Distinct consented browser identifiers, not necessarily individual people. Identifiers expire after 90 days.'],['sessions','Measured visits','Consented browsing sessions. A session expires after 30 minutes without a page/session refresh.'],['views','Page views','Measured public-page visits, excluding private dashboards and sensitive URLs.']] as const) metric(key,label,number(summary.find(r=>r.period==='current')?.[key]),number(summary.find(r=>r.period==='previous')?.[key]),'count',definition);
    metric('returningVisitors','Returning measured visitors',number(summary.find(r=>r.period==='current')?.returning),number(summary.find(r=>r.period==='previous')?.returning),'count','Consented browser identifiers seen before this period within retained visitor history. Clearing cookies or changing devices can make someone appear new.');
    metric('newVisitors','New measured visitors',number(summary.find(r=>r.period==='current')?.visitors)-number(summary.find(r=>r.period==='current')?.returning),number(summary.find(r=>r.period==='previous')?.visitors)-number(summary.find(r=>r.period==='previous')?.returning),'count','Measured browser identifiers with no earlier activity in retained history. This is not a count of new accounts or first-ever visitors.');
    const enquiries=activity.find(r=>r.name==='contact_click');
    metric('enquiries','Contact clicks',number(enquiries?.current),number(enquiries?.previous),'count','WhatsApp, call, email, directions and message-link clicks. They indicate interest, not a confirmed conversation or sale.');
    popular=normalize(rankings.filter(r=>r.kind==='page_view').slice(0,12));
    searches=normalize(rankings.filter(r=>r.kind==='unmet').slice(0,12));
    searches.push(...normalize(rankings.filter(r=>r.kind==='booking_unavailable').map(r=>({...r,label:r.label==='no_dates'?'Booking pages with no available dates':'Booking dates with no available slots',detail:'Measured availability obstacles; this is not a search term.'}))));
    contacts=normalize(rankings.filter(r=>r.kind==='contact_click'));
    errors=normalize(rankings.filter(r=>r.kind==='checkout_error'));
    performance=normalize(rankings.filter(r=>r.kind==='web_vital'));
    funnel=normalize(journeys);
    const sourceMap=new Map<string,Row>();
    for(const r of sourceRows.filter(row=>!row.campaign)) { const item=sourceMap.get(r.label)??{label:r.label,count:0,value:0}; item.count+=number(r.count); item.value=(item.value??0)+number(r.value); sourceMap.set(r.label,item); }
    sources=[...sourceMap.values()].sort((a,b)=>b.count-a.count);
    campaigns=sourceRows.filter(r=>r.campaign).map(r=>({label:`${r.campaign} · ${r.label}`,count:number(r.count),value:number(r.value),detail:`${number(r.contacts)} contact clicks · ${number(r.payments)} confirmed payments`}));
    firstEvent=coverage[0]?.first?.toISOString()??null; lastEvent=coverage[0]?.last?.toISOString()??null;
  } catch (error) {
    console.error('[analytics] Visitor report unavailable',error instanceof Error ? error.name : 'unknown');
    trafficAvailable=false;
    for(const [key,label] of [['visitors','Measured visitors'],['sessions','Measured visits'],['views','Page views'],['enquiries','Contact clicks'],['returningVisitors','Returning measured visitors'],['newVisitors','New measured visitors']]) metric(key,label,null,null,'count','Visitor analytics is unavailable. This is not a zero count.');
  }
  const partialPeriod=!firstEvent||new Date(firstEvent)>previousStart;
  const visitorKeys = ['visitors','sessions','views','enquiries','returningVisitors','newVisitors'];
  for (const item of metrics) if (visitorKeys.includes(item.key)) {
    if (!firstEvent) item.value = null;
    if (partialPeriod) item.previous = null;
  }
  if (!firstEvent) funnel = [];

  const insights: AnalyticsReport['insights']=[];
  if(!firstEvent||partialPeriod) insights.push({title:'Visitor history is still building',detail:'Use the business records now. Visitor comparisons need a complete current and previous period before trends are dependable.',section:'health'});
  if(payment('current-attempts','failed')>0) insights.push({title:`${payment('current-attempts','failed')} payment attempts need a look`,detail:'Check provider failures and checkout errors before assuming shoppers lost interest. A failed attempt can later be retried successfully.',section:'journey'});
  if(searches.length) insights.push({title:'People are looking for things they cannot find',detail:`The most frequent measured search with no results is “${searches[0].label}”. Review availability and naming before deciding to recruit more vendors.`,section:'audience'});
  const unfinished=normalize(vendorRows).find(r=>r.label==='Stores still in setup')?.count??0;
  if(unfinished) insights.push({title:`${unfinished} new stores are still in setup`,detail:'Review their missing setup steps. Imported stores may be waiting for their owners to take over.',section:'vendors'});
  if(!insights.length) insights.push({title:'Start with the customer journey',detail:'Compare the same period, inspect the largest drop between steps, and check the sample size before making changes.',section:'journey'});
  return {filters,periodLabel,generatedAt:now.toISOString(),start:start.toISOString(),end:end.toISOString(),previousStart:previousStart.toISOString(),timezone:ANALYTICS_TIMEZONE,metrics,daily:normalize(daily),sources,campaigns,popular,searches,contacts,errors,performance,funnel,vendors:normalize(vendorRows),operations:normalize(ops),paymentTypes:normalize(paymentTypes),insights,health:{trafficAvailable,firstEvent,lastEvent,partialPeriod,legacyPayments:number(legacy[0]?.count),gaConfigured:!!process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,rexConfigured:!!process.env.ANTHROPIC_API_KEY,retentionDays:RETENTION_DAYS,notes:[
    'Date range applies to every report. Device and source filters apply only to visitor activity, the shopping journey and campaign attribution; business totals always include every eligible account.',
    'Business figures come from payment and operational records. Visitor figures include only people who allowed analytics; blockers, missing consent and multiple devices limit coverage.',
    'Campaign attribution uses the landing source of the checkout session. Unlinked purchases remain in business totals. Advertising spend is not connected, so return on advertising spend is unavailable.',
    'Discovery lists show the top 12 entries per measure; source and campaign lists show the top 20. Source totals are aggregated before ranking.',
    'Historical Google Analytics reports are not imported. The existing Google tag is optional; its account settings and delivery have not been verified here.',
    'Known administrator, courier and sandbox activity is excluded from payment totals. Unclassified legacy payments are shown separately. Older operational and ledger records may lack test markers.',
    'Vendor counts refer to accounts; store counts refer to separate stores created in the period. Published stores may be draft or active. These overlapping counts are not sequential steps and cannot establish which setup details are missing.',
    'Operational counts use their described dates or current status. They are not a historical snapshot of every status transition.',
    'Visitor activity and checkout attribution are retained for 180 days. Existing business records follow their own retention. No session recordings are collected by this feature.',
    'Visitor trends should not be treated as causal explanations. Small samples and incomplete coverage are explicitly reported; Rex must distinguish evidence from hypotheses.',
  ]}};
}
