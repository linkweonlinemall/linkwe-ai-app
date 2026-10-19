// Synthetic schema reconciliation and mocked read-only transport. No live credentials or network.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
let requestToken=null;
const original=Module._load;
Module._load=function(name,parent,main){if(name==='server-only')return {};if(name==='next/headers')return {headers:async()=>new Headers(requestToken?{'x-vercel-oidc-token':requestToken}:{})};if(name==='@/lib/auth/session')return{getSession:async()=>null};if(name.startsWith('@/'))name=path.join(process.cwd(),name.slice(2));return original.call(this,name,parent,main);};
for(const extension of ['.ts','.tsx'])require.extensions[extension]=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
require.extensions['.css']=mod=>{mod.exports=new Proxy({},{get:(_,key)=>key==='__esModule'?false:String(key)});};
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const ExternalAnalytics=require('../app/(dashboard)/dashboard/admin/analytics/external-analytics.tsx').default;
globalThis.fetch=async()=>{throw Error('Live network is forbidden in Sheet tests.');};
const {normalizeSheetData,sheetDate}=require('../lib/analytics/sheet-normalize.ts');
const {SHEET_SCHEMA}=require('../lib/analytics/sheet-schema.ts');
const {createSheetReader,readExternalAnalytics,parseSheetIds}=require('../lib/analytics/sheet-reader.ts');
const {analyticsCsv}=require('../lib/analytics/export.ts');
const {analyticsRexSurface}=require('../lib/analytics/rex.ts');
const period={start:'2026-10-05T04:00:00.000Z',end:'2026-10-07T04:00:00.000Z',timezone:'America/Port_of_Spain'},readAt='2026-10-07T12:00:00.000Z',extractedAt='2026-10-07T10:00:00.000Z';
const config={workbook:'synthetic-workbook-identifier-only',audience:'//iam.googleapis.com/projects/123456/locations/global/workloadIdentityPools/test/providers/test',serviceAccount:'test@test-project.iam.gserviceaccount.com',sheetIds:Object.fromEntries(SHEET_SCHEMA.map((s,i)=>[s.id,i+1]))};
const website=(date,extra={})=>({metricDate:date,sourcePlatform:'GA4',property:'synthetic-property-123456',channel:'Organic Search',reportingTimezone:'America/Port_of_Spain',totalUsers:80,sessions:100,engagedSessions:50,pageViews:150,purchases:2,purchaseRevenue:15,currency:'TTD',extractedAt,...extra});
const ad=(date,extra={})=>({platform:'Meta Ads',adAccount:'12345678901234567890 | Fixture',campaign:'23456789012345678901 | Fixture',adSet:'34567890123456789012 | Fixture',ad:'45678901234567890123 | Fixture',periodStart:date,periodEnd:date,reportingTimezone:'America/Port_of_Spain',currency:'USD',spend:100,impressions:1000,reach:700,linkClicks:10,landingPageViews:5,attributionWindow:'7-day click / 1-day view',extractedAt,...extra});
const post=(id,extra={})=>({platform:'Instagram',account:'@fixture | 12345678901234567',postIdAndUrl:id+' | https://www.instagram.com/p/fixture',publishedAt:'2026-10-05T06:00:00.000Z',format:'Reel',periodStart:'2026-10-05T06:00:00.000Z',periodEnd:extractedAt,metricBasis:'Lifetime',reportingTimezone:'UTC',videoViews:100,likes:10,comments:2,shares:1,saves:3,extractedAt,...extra});
const account=(at,followers)=>({platform:'Instagram',account:'@fixture | 12345678901234567',periodStart:at,periodEnd:at,reportingTimezone:'UTC',followers,extractedAt});
const month=(start,end,value,extra={})=>({periodStart:start,periodEnd:end,sourcePlatform:'Google Business Profile',accountOrProfile:'Fixture profile',metric:'Profile views',value,unit:'views',changeVsPreviousMonth:.32,reportingTimezone:null,extractedAt:'2026-11-01T10:00:00.000Z',...extra});
function data(overrides={}){return Object.fromEntries(SHEET_SCHEMA.map(schema=>[schema.id,{valid:true,rows:overrides[schema.id]??[]}]))}
function source(result,id){return result.sources.find(s=>s.id===id)}
function metric(result,id,key,iso){return source(result,id).groups.find(g=>!iso||g.currency===iso)?.metrics.find(m=>m.key===key)?.value;}
function cell(value){return value==null?{}:{effectiveValue:typeof value==='number'?{numberValue:value}:{stringValue:value}};}
function workbook(rows,headersOnly=false){return {spreadsheetId:config.workbook,sheets:SHEET_SCHEMA.map(schema=>({properties:{sheetId:config.sheetIds[schema.id],title:schema.title,gridProperties:{rowCount:100,columnCount:schema.headers.length}},data:[{startRow:3,startColumn:0,rowData:[{values:schema.headers.map(cell)},...(headersOnly?[]:(rows[schema.id]??[]).map(row=>({values:schema.fields.map(field=>cell(row[field]))})))]}]}))};}
function transport(rows={}){
  const calls=[];let failed=false,change=()=>{};
  const fetcher=async(url,init)=>{calls.push({url,init});if(failed)return new Response('SENSITIVE RAW AUTH ERROR',{status:403});if(url==='https://sts.googleapis.com/v1/token')return Response.json({access_token:'synthetic-sts-token'});if(url.startsWith('https://iamcredentials.googleapis.com/'))return Response.json({accessToken:'synthetic-sheets-token'});
    assert.ok(url.startsWith('https://sheets.googleapis.com/v4/spreadsheets/'+config.workbook));assert.ok(!init.method||init.method==='GET');const headerOnly=!new URL(url).searchParams.getAll('ranges').some(r=>/5:/.test(r));const body=workbook(rows,headerOnly);change(body,headerOnly);return Response.json(body);
  };return{calls,fetcher,fail:()=>{failed=true},change:fn=>{change=fn}};
}
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
 await test('server-only tab configuration requires every exact source ID with no duplicates or extras',()=>{
   assert.deepEqual(parseSheetIds(JSON.stringify(config.sheetIds)),config.sheetIds);
   for(const raw of [undefined,'invalid','null','[]','{}',JSON.stringify({...config.sheetIds,website:-1}),JSON.stringify({...config.sheetIds,website:1.5}),JSON.stringify({...config.sheetIds,website:config.sheetIds.ads}),JSON.stringify({...config.sheetIds,extra:88}),JSON.stringify({...config.sheetIds,website:'1'})])assert.throws(()=>parseSheetIds(raw));
 });
 await test('typed calendar dates accept Sheets serials and reject formatted/invalid dates',()=>{assert.equal(sheetDate((Date.parse('2026-10-05')-Date.UTC(1899,11,30))/86400000),'2026-10-05');assert.throws(()=>sheetDate('10/05/2026'));assert.throws(()=>sheetDate('2026-02-30'));});
 await test('website sums observed additive metrics but never daily/channel unique users',()=>{
   const one=website('2026-10-05'),two=website('2026-10-06',{sessions:300,engagedSessions:240});const r=normalizeSheetData(data({website:[one,two,{...one}]}),period,readAt);
   assert.equal(metric(r,'website','sessions'),400);assert.equal(metric(r,'website','users'),null);assert.equal(metric(r,'website','engagementRate'),72.5);assert.equal(metric(r,'website','purchaseRevenue'),30);assert.equal(source(r,'website').groups[0].observedRows,2);
 });
 await test('missing day and null inputs remain incomplete; numeric zero remains observed zero',()=>{
   let r=normalizeSheetData(data({website:[website('2026-10-05',{sessions:0,engagedSessions:0})]}),period,readAt);assert.equal(metric(r,'website','sessions'),0);assert.equal(metric(r,'website','engagementRate'),null);assert.equal(source(r,'website').groups[0].coversRequestedDays,false);
   r=normalizeSheetData(data({website:[website('2026-10-05'),website('2026-10-06',{sessions:null})]}),period,readAt);assert.equal(metric(r,'website','sessions'),100);assert.equal(metric(r,'website','engagementRate'),null);
   const sessions=source(r,'website').groups[0].metrics.find(m=>m.key==='sessions');assert.equal(sessions.quality,'partial');assert.deepEqual(sessions.coverage,{observedRows:1,missingRows:1,totalRows:2});
 });
 await test('conflicting natural keys, numeric-looking strings and unsafe identifier cells fail closed',()=>{
   for(const rows of [[website('2026-10-05'),website('2026-10-05',{sessions:101})],[website('2026-10-05',{sessions:'1,000'})],[website('2026-10-05',{property:123456})]])assert.equal(source(normalizeSheetData(data({website:rows}),period,readAt),'website').status,'unavailable');
   assert.equal(source(normalizeSheetData(data({ads:[ad('2026-10-05',{ad:12345678901234567890})]}),period,readAt),'ads').status,'unavailable');
 });
 await test('ads reconcile ratios of sums while reach, conversions and ROAS stay unavailable',()=>{
   const r=normalizeSheetData(data({ads:[ad('2026-10-05'),ad('2026-10-06',{spend:200,impressions:3000,reach:900,linkClicks:90,landingPageViews:45})]}),period,readAt);
   for(const [key,value] of Object.entries({spend:300,impressions:4000,linkClicks:100,landingPageViews:50,ctr:2.5,cpc:3,cpm:75,costPerLandingPageView:6,reach:null,conversions:null,roas:null}))assert.equal(metric(r,'ads',key),value,key);
 });
 await test('currencies and attribution settings stay separate; missing days suppress derived rates',()=>{
   const r=normalizeSheetData(data({ads:[ad('2026-10-05'),ad('2026-10-05',{currency:'TTD',spend:80}),ad('2026-10-05',{attributionWindow:'1-day click',spend:20})]}),period,readAt);
   assert.equal(source(r,'ads').groups.length,3);assert.equal(metric(r,'ads','spend','TTD'),80);assert.ok(source(r,'ads').groups.every(g=>g.metrics.find(m=>m.key==='ctr').value===null));
 });
 await test('zero denominators never create infinity or invented rates',()=>{
   const r=normalizeSheetData(data({ads:[ad('2026-10-05',{spend:0,impressions:0,linkClicks:0,landingPageViews:0}),ad('2026-10-06',{spend:0,impressions:0,linkClicks:0,landingPageViews:0})]}),period,readAt);assert.equal(metric(r,'ads','spend'),0);for(const key of ['ctr','cpc','cpm','costPerLandingPageView'])assert.equal(metric(r,'ads',key),null);
 });
 await test('post cohorts keep latest lifetime snapshots and exclude feed views from reel plays',()=>{
   const older=post('11111111111111111',{likes:9,extractedAt:'2026-10-06T10:00:00.000Z',periodEnd:'2026-10-06T10:00:00.000Z'}),latest=post('11111111111111111'),feed=post('22222222222222222',{format:'Image',likes:20,videoViews:999});
   const r=normalizeSheetData(data({posts:[older,latest,feed]}),period,readAt);assert.equal(metric(r,'posts','posts'),2);assert.equal(metric(r,'posts','likes'),30);assert.equal(metric(r,'posts','reelPlays'),100);assert.equal(metric(r,'posts','impressions'),null);assert.equal(source(r,'posts').groups[0].basis,'lifetime');
 });
 await test('latest follower snapshot is selected rather than summed; growth is unavailable',()=>{
   const r=normalizeSheetData(data({accounts:[account('2026-10-05T10:00:00.000Z',50),account('2026-10-06T10:00:00.000Z',60)]}),period,readAt);assert.equal(metric(r,'accounts','followers'),60);assert.equal(metric(r,'accounts','growth'),null);assert.equal(source(r,'accounts').groups[0].basis,'snapshot');
 });
 await test('GBP only includes whole nonoverlapping months, keeps unknown timezone and rejects unique metric sums',()=>{
   const rows=[month('2026-09-01','2026-09-30',100),month('2026-10-01','2026-10-31',200)];const full={start:'2026-09-01T04:00:00.000Z',end:'2026-11-01T04:00:00.000Z',timezone:period.timezone};
   let r=normalizeSheetData(data({gbp:rows}),full,'2026-11-02T00:00:00.000Z');assert.equal(metric(r,'gbp','monthlyValue'),300);assert.equal(source(r,'gbp').groups[0].timezone,null);
   r=normalizeSheetData(data({gbp:rows}),{...full,start:'2026-09-15T04:00:00.000Z'},'2026-11-02T00:00:00.000Z');assert.equal(metric(r,'gbp','monthlyValue'),200);
   r=normalizeSheetData(data({gbp:[{...rows[0],metric:'Unique users'}]}),full,'2026-11-02T00:00:00.000Z');assert.equal(metric(r,'gbp','monthlyValue'),null);
 });
 await test('refresh success does not establish automation or fresh retained rows; raw issues are withheld',()=>{
   const r=normalizeSheetData(data({website:[website('2026-10-05')],refresh:[{destinationTab:'Website Daily',completedAt:'2026-10-07T11:00:00.000Z',status:'SUCCESS',issueOrNextStep:'PRIVATE ISSUE'},{destinationTab:'Website Daily',completedAt:'2026-10-07T11:30:00.000Z',status:'FAILED'}]}),period,readAt);const s=source(r,'website');assert.equal(s.refreshMode,'unverified');assert.equal(s.lastRefreshStatus,'failed');assert.equal(s.lastSuccessfulRefresh,'2026-10-07T11:00:00.000Z');assert.equal(s.extractedAt,extractedAt);assert.ok(!JSON.stringify(r).includes('PRIVATE ISSUE'));
 });
 await test('anonymous and non-admin callers cannot read configuration, cache or network',async()=>{
   await assert.rejects(()=>readExternalAnalytics(period),/Administrator/);let calls=0;const reader=createSheetReader({authorize:async()=>false,fetcher:async()=>{calls++;},now:()=>Date.parse(readAt),configuration:()=>{calls++;return config}});await assert.rejects(()=>reader(period),/Administrator/);assert.equal(calls,0);
 });
 await test('unconfigured authorized reader makes no network calls and exposes no metrics',async()=>{
   const reader=createSheetReader({authorize:async()=>true,fetcher:globalThis.fetch,now:()=>Date.parse(readAt),configuration:()=>null});const r=await reader(period);assert.equal(r.status,'not-connected');assert.ok(r.sources.every(s=>s.metrics===null&&s.groups.length===0));
 });
 await test('read-only transport validates actual headers/IDs and never requests Notes, Strategy or private source links',async()=>{
   process.env.VERCEL_OIDC_TOKEN='synthetic-oidc-token';const t=transport({website:[website('2026-10-05',{notes:'PRIVATE NOTES',sourceReportUrl:'https://mail.google.com/private',updatedBy:'person@example.com'})]});const reader=createSheetReader({authorize:async()=>true,fetcher:t.fetcher,now:()=>Date.parse(readAt),configuration:()=>config});
   const [a,b]=await Promise.all([reader(period),reader(period)]);assert.equal(t.calls.length,4);assert.deepEqual(a,b);assert.equal(metric(a,'website','sessions'),100);
   const tokenRequest=t.calls.find(c=>c.url.includes('generateAccessToken'));assert.deepEqual(JSON.parse(tokenRequest.init.body).scope,['https://www.googleapis.com/auth/spreadsheets.readonly']);
   for(const call of t.calls.filter(c=>c.url.includes('sheets.googleapis.com'))){assert.equal(call.init.redirect,'error');assert.equal(call.init.cache,'no-store');assert.ok(!call.url.includes('Strategy'));}
   for(const value of ['PRIVATE NOTES','mail.google.com','person@example.com','synthetic-oidc-token','synthetic-sheets-token','synthetic-property-123456'])assert.ok(!JSON.stringify(a).includes(value),value);
   await reader(period);assert.equal(t.calls.length,4,'cache hit does not reread');
 });
 await test('wrong headers, sheet IDs and oversize grids reject the affected source without fabricated totals',async()=>{
   for(const mutate of [body=>{body.sheets[0].data[0].rowData[0].values[6]=cell('Wrong sessions');},body=>{body.sheets[0].properties.sheetId=999;},body=>{body.sheets[0].properties.gridProperties.rowCount=10001;}]){const t=transport({website:[website('2026-10-05')]});t.change(mutate);const reader=createSheetReader({authorize:async()=>true,fetcher:t.fetcher,now:()=>Date.parse(readAt),configuration:()=>config});const r=await reader(period);assert.equal(source(r,'website').status,'unavailable');assert.equal(source(r,'website').groups.length,0);}
 });
 await test('formulas/errors in structured cells and row-count changes fail closed',async()=>{
   for(const mutate of [body=>{body.sheets[0].data[0].rowData[1].values[6].userEnteredValue={formulaValue:'=999'};},body=>{body.sheets[0].properties.gridProperties.rowCount=101;}]){const t=transport({website:[website('2026-10-05')]});t.change((body,header)=>{if(!header)mutate(body)});const reader=createSheetReader({authorize:async()=>true,fetcher:t.fetcher,now:()=>Date.parse(readAt),configuration:()=>config});assert.equal(source(await reader(period),'website').status,'unavailable');}
 });
 await test('failed refresh returns bounded labelled stale evidence then unavailable, without raw error leakage',async()=>{
   let now=Date.parse(readAt),authorized=true;const t=transport({website:[website('2026-10-05')]});const reader=createSheetReader({authorize:async()=>authorized,fetcher:t.fetcher,now:()=>now,configuration:()=>config});await reader(period);t.fail();now+=16*60000;let r=await reader(period);assert.equal(r.status,'stale');assert.equal(metric(r,'website','sessions'),100);assert.ok(!JSON.stringify(r).includes('SENSITIVE'));
   authorized=false;await assert.rejects(()=>reader(period),/Administrator/);authorized=true;now+=15*60000;r=await reader(period);assert.equal(r.status,'unavailable');assert.ok(r.sources.every(s=>s.groups.length===0));
 });
 await test('UI report, CSV and Rex use the same source snapshot and preserve currency/coverage',()=>{
   const external=normalizeSheetData(data({ads:[ad('2026-10-05')]}),period,readAt);const report={...period,generatedAt:readAt,filters:{days:7,device:'all',source:'all'},external,metrics:[],registrations:[],registrationDaily:[],daily:[],sources:[],campaigns:[],funnel:[],popular:[],searches:[],contacts:[],errors:[],performance:[],vendors:[],operations:[],paymentTypes:[],health:{notes:[],trafficAvailable:true}};
   const rex=analyticsRexSurface({},report,[]);assert.deepEqual(rex.state.externalSources,external.sources);assert.deepEqual(rex.state.report.external,external);const csv=analyticsCsv(report);assert.ok(csv.includes('USD'));assert.ok(csv.includes('observed-rows-only'));assert.ok(csv.includes('Daily unique reach is not additive'));assert.ok(csv.includes('45678901234567890123'));assert.ok(csv.includes('partial'));assert.ok(csv.includes('2026-10-06'));assert.ok(csv.includes('Rows with values'));
 });
 await test('partial source days are excluded and different source timezones stay separate',()=>{
   const rows=['2026-10-05','2026-10-06','2026-10-07'].map(day=>website(day));
   let r=normalizeSheetData(data({website:rows}),{...period,start:'2026-10-05T05:00:00.000Z',end:'2026-10-07T18:00:00.000Z'},'2026-10-08T00:00:00.000Z');assert.equal(metric(r,'website','sessions'),100);assert.equal(source(r,'website').groups[0].coveredPeriod.start,'2026-10-06');
   r=normalizeSheetData(data({website:[website('2026-10-05'),website('2026-10-06',{reportingTimezone:'UTC'})]}),period,readAt);assert.equal(source(r,'website').groups.length,2);
 });
 await test('social account label changes do not duplicate stable account IDs',()=>{
   const r=normalizeSheetData(data({posts:[post('11111111111111111'),post('11111111111111111',{account:'@renamed | 12345678901234567'})],accounts:[account('2026-10-05T10:00:00.000Z',50),{...account('2026-10-06T10:00:00.000Z',60),account:'@renamed | 12345678901234567'}]}),period,readAt);assert.equal(metric(r,'posts','posts'),1);assert.equal(source(r,'accounts').groups.length,1);assert.equal(metric(r,'accounts','followers'),60);
   const invalid=normalizeSheetData(data({posts:[post('11111111111111111',{periodEnd:'2026-10-04T10:00:00.000Z'})]}),period,readAt);assert.equal(source(invalid,'posts').status,'unavailable');
 });
 await test('runtime request OIDC token takes priority and transient reads retry once',async()=>{
   requestToken='synthetic-fresh-request-token';const t=transport({website:[website('2026-10-05')]});let attempts=0;const fetcher=async(url,init)=>{if(url.includes('sheets.googleapis.com')&&attempts++===0)return new Response('temporary',{status:429});return t.fetcher(url,init)};
   const reader=createSheetReader({authorize:async()=>true,fetcher,now:()=>Date.parse(readAt),configuration:()=>config});const r=await reader(period);assert.equal(JSON.parse(t.calls[0].init.body).subjectToken,requestToken);assert.equal(metric(r,'website','sessions'),100);assert.equal(attempts,3);requestToken=null;
 });
 await test('source panels render major-unit currency, stale state, gaps and the requested exact ad identity',()=>{
   const snapshot=normalizeSheetData(data({ads:[ad('2026-10-05')]}),period,readAt);snapshot.status='stale';source(snapshot,'ads').status='stale';
   const html=renderToStaticMarkup(React.createElement(ExternalAnalytics,{snapshot,sources:['ads']}));for(const value of ['USD 100','Stale','Requested reporting dates are missing','Oldest extraction','unverified','Unavailable','45678901234567890123','Partial subtotal','1 missing reporting date','7-day click / 1-day view'])assert.ok(html.includes(value),value);
 });
 await test('all blank values stay unavailable, observed zeros stay partial, and metric coverage is independent',()=>{
   const r=normalizeSheetData(data({website:[website('2026-10-05',{sessions:null,purchases:0}),website('2026-10-06',{sessions:null,purchases:null})]}),period,readAt),g=source(r,'website').groups[0];
   assert.equal(metric(r,'website','sessions'),null);assert.equal(g.metrics.find(m=>m.key==='sessions').quality,'unavailable');assert.equal(metric(r,'website','purchases'),0);assert.equal(g.metrics.find(m=>m.key==='purchases').quality,'partial');assert.equal(metric(r,'website','pageViews'),300);assert.equal(g.metrics.find(m=>m.key==='pageViews').quality,'observed');
   const html=renderToStaticMarkup(React.createElement(ExternalAnalytics,{snapshot:r,sources:['website']}));for(const text of ['Partial observations','Partial subtotal','1 blank','Not a complete period total.'])assert.ok(html.includes(text),text);
 });
 await test('partial sums still reject malformed counts and overflow instead of silently dropping bad values',()=>{
   for(const value of [-1,1.5,'100',Infinity,Number.MAX_SAFE_INTEGER]){const rows=[website('2026-10-05',{sessions:null}),website('2026-10-06',{sessions:value}),website('2026-10-06',{channel:'Direct',sessions:10})];assert.equal(source(normalizeSheetData(data({website:rows}),period,readAt),'website').status,'unavailable');}
 });
 await test('different ads cannot fill each other’s missing dates or manufacture complete derived rates',()=>{
   const r=normalizeSheetData(data({ads:[ad('2026-10-05'),ad('2026-10-06',{ad:'99999999999999999 | Other'})]}),period,readAt),groups=source(r,'ads').groups;
   assert.equal(groups.length,2);assert.ok(groups.every(g=>g.missingDates.length===1&&g.metrics.find(m=>m.key==='ctr').value===null));assert.equal(new Set(groups.map(g=>g.adIdentity.adId)).size,2);
 });
 await test('combined Meta log destinations match exact tabs, skip malformed rows and preserve partial run status',()=>{
   const refresh=[{destinationTab:'Organic Posts; Organic Accounts; Paid Ads',completedAt:'2026-10-07T10:00:00.000Z',status:'SUCCESS'},{destinationTab:'Paid Ads',completedAt:'broken',status:'SUCCESS'},{destinationTab:'Unrelated Paid Ads backup',completedAt:'2026-10-07T11:59:00.000Z',status:'FAILED'},{destinationTab:'Organic Posts;  Paid Ads ',completedAt:'2026-10-07T11:00:00.000Z',status:'PARTIAL'},{destinationTab:'Paid Ads',completedAt:'2026-10-08T11:00:00.000Z',status:'SUCCESS'}];
   const r=normalizeSheetData(data({refresh}),period,readAt);assert.equal(source(r,'ads').lastRefreshStatus,'partial');assert.equal(source(r,'posts').lastRefreshStatus,'partial');assert.equal(source(r,'accounts').lastRefreshStatus,'success');assert.equal(source(r,'website').lastRefreshStatus,'unknown');assert.equal(source(r,'ads').lastSuccessfulRefresh,'2026-10-07T10:00:00.000Z');
 });
 await test('conflicting run statuses at the same instant cannot manufacture successful freshness',()=>{
   const refresh=['SUCCESS','FAILED'].map(status=>({destinationTab:'Paid Ads',completedAt:extractedAt,status})),r=normalizeSheetData(data({refresh}),period,readAt);assert.equal(source(r,'ads').lastRefreshStatus,'failed');assert.equal(source(r,'ads').lastSuccessfulRefresh,null);
 });
 if(process.env.ANALYTICS_QUALITY_PREVIEW_DIR){
   const output=path.resolve(process.env.ANALYTICS_QUALITY_PREVIEW_DIR);if(!output.startsWith(path.resolve(process.cwd(),'..')+path.sep))throw Error('Preview artifacts must stay in the task workspace.');fs.mkdirSync(output,{recursive:true});
   const snapshot=normalizeSheetData(data({website:[website('2026-10-05'),website('2026-10-06',{sessions:null,purchases:null})],ads:[ad('2026-10-05')],refresh:[{destinationTab:'Organic Posts; Organic Accounts; Paid Ads',completedAt:extractedAt,status:'SUCCESS'}]}),period,readAt);
   const body=renderToStaticMarkup(React.createElement(ExternalAnalytics,{snapshot,sources:['website','ads']}));const css=fs.readFileSync('app/(dashboard)/dashboard/admin/analytics/analytics.module.css','utf8');
   fs.writeFileSync(path.join(output,'external-quality.html'),'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;padding:16px;font-family:Arial,sans-serif;background:#f5f7f2}main{max-width:1100px;margin:auto}'+css+'</style></head><body><main id="admin-main"><h1>Synthetic analytics quality review</h1><p>Local fixture only. No live business figures.</p>'+body+'</main></body></html>');
 }
 console.log(`${passed} Sheet adapter reconciliation/security checks passed (synthetic fixtures, no live reads)`);
})().catch(error=>{console.error(error);process.exitCode=1});
