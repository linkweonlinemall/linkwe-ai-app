// Aggregate/authorization/markup checks on a disposable database only. No real accounts or browser.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript'), React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { randomUUID } = require('node:crypto');
process.env.LINKWE_ANALYTICS_PRIVATE_REPORT_URL = 'https://datastudio.google.com/reporting/synthetic-fixture';
const url = new URL(process.env.DATABASE_URL || '');
if (url.hostname !== '127.0.0.1' || url.port !== '55440' || url.pathname !== '/linkwe_analytics_test') throw Error('Use only the disposable analytics test database.');
let actor = null;
const originalLoad = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'server-only') return {};
  if (request === '@/lib/auth/session') return { getSession: async () => actor };
  if (request === 'next/navigation') return { redirect: destination => { throw Error(`REDIRECT:${destination}`); } };
  if (request === '@/components/admin/rex/StudioRexProvider') return { useStudioRex: () => false };
  if (request.startsWith('@/')) request = path.join(process.cwd(), request.slice(2));
  return originalLoad.call(this, request, parent, main);
};
for (const extension of ['.ts','.tsx']) require.extensions[extension] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX, esModuleInterop:true } }).outputText,file);
require.extensions['.css'] = mod => { mod.exports = new Proxy({}, { get:(_,key) => key === '__esModule' ? false : String(key) }); };
const { prisma } = require('../lib/prisma.ts');
const { buildAnalyticsReport } = require('../lib/analytics/report.ts');
const { getAdminAnalytics } = require('../app/actions/admin-analytics.ts');
const hub = require('../lib/analytics/hub.ts');
const { analyticsPeriod } = require('../lib/analytics/model.ts');
const { analyticsCsv } = require('../lib/analytics/export.ts');
const Page = require('../app/(dashboard)/dashboard/admin/analytics/page.tsx').default;
const panels = require('../app/(dashboard)/dashboard/admin/analytics/analytics-panels.tsx');
const { PRIVATE_ANALYTICS_REPORT, privateAnalyticsReport } = require('../lib/analytics/private-report.ts');
const prefix = `analytics-hub-${randomUUID()}`, users=[], stores=[], events=[];
let batch, collectionCreated=false, passed=0;
const metric = (r,key) => r.metrics.find(row=>row.key===key);
async function test(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
(async()=>{
  await test('Private report configuration rejects unsafe URLs and renders no link when absent',()=>{
    for(const value of [undefined,'not a URL','http://datastudio.google.com/reporting/example','https://evil.test/reporting/example','https://datastudio.google.com.evil.test/reporting/example','https://user:password@datastudio.google.com/reporting/example','https://datastudio.google.com:444/reporting/example','https://datastudio.google.com/other']) assert.equal(privateAnalyticsReport(value),null);
    assert.equal(privateAnalyticsReport('https://lookerstudio.google.com/reporting/synthetic-fixture').href,'https://lookerstudio.google.com/reporting/synthetic-fixture');
    const html=renderToStaticMarkup(React.createElement(panels.AnalyticsConnections,{report:null,privateReport:null}));
    assert.ok(html.includes('not configured in this environment'));assert.ok(!html.includes('href='));
  });
  await test('Page and action independently deny anonymous, vendor, customer and courier access', async()=>{
    for (const role of [null,'CUSTOMER','VENDOR','COURIER']) {
      actor = role ? { role, userId:'not-a-real-user' } : null;
      await assert.rejects(()=>Page({searchParams:Promise.resolve({section:'connections'})}),/REDIRECT:/);
      await assert.rejects(()=>getAdminAnalytics({}),/Administrator/);
    }
  });
  await test('Bookmark controls validate filters and prevent arbitrary section/redirect destinations',()=>{
    assert.deepEqual(hub.parseAnalyticsView({section:'registrations',days:'7',device:'mobile',source:'google'}),{section:'registrations',filters:{days:7,device:'mobile',source:'google'},invalidFilters:false});
    const invalid=hub.parseAnalyticsView({section:'https://evil.test',days:'999',source:'user@example.test'});
    assert.equal(invalid.section,'overview');assert.equal(invalid.invalidFilters,true);assert.equal(invalid.filters.days,30);
    const link=hub.analyticsViewHref('connections',{days:30,device:'all',source:'all'});
    assert.ok(link.startsWith('/dashboard/admin/analytics?'));assert.ok(link.includes('section=connections'));
  });
  const baseline=await buildAnalyticsReport({days:30});
  const start=analyticsPeriod(30).start, current=new Date(Date.now()-60_000), previous=new Date(start.getTime()-60_000);
  async function user(role,key,createdAt=current,extra={}) {
    const id=`${prefix}-${key}`;users.push(id);
    return prisma.user.create({data:{id,email:`${id}@example.test`,fullName:`Private fixture ${key}`,role,createdAt,...extra}});
  }
  const customer=await user('CUSTOMER','customer');
  await user('CUSTOMER','suspended',current,{suspended:true});
  const draft=await user('VENDOR','draft'), complete=await user('VENDOR','complete'), imported=await user('VENDOR','imported'), old=await user('VENDOR','old',previous);
  const admin=await user('ADMIN','admin');await user('COURIER','courier');
  async function store(owner,key,step,createdAt=current) {
    const id=`${prefix}-${key}`;stores.push(id);
    return prisma.store.create({data:{id,ownerId:owner.id,name:`Private store ${key}`,slug:id,region:'port_of_spain',categoryId:'clothing_apparel',onboardingStep:step,status:'DRAFT',createdAt}});
  }
  await store(draft,'draft-store',1);await store(complete,'complete-store',3);await store(imported,'imported-store',0);await store(old,'old-store',3,previous);
  batch=await prisma.importBatch.create({data:{actorId:admin.id,kind:'vendors',filename:'fixture.csv',sheet:'test',headers:[],mapping:{},rows:{create:{number:1,raw:{},values:{},errors:[],createdUserId:imported.id}}}});
  const report=await buildAnalyticsReport({days:30});
  await test('Real account counts include imported accounts and exclude staff; previous periods use account creation date',()=>{
    assert.equal(metric(report,'signups').value-metric(baseline,'signups').value,5);
    assert.equal(metric(report,'signups').previous-metric(baseline,'signups').previous,1);
    assert.equal(report.registrations.find(r=>r.label==='Customer accounts created').count-baseline.registrations.find(r=>r.label==='Customer accounts created').count,2);
    assert.equal(report.vendors.find(r=>r.label==='Imported vendors').count-baseline.vendors.find(r=>r.label==='Imported vendors').count,1);
    assert.equal(report.registrationDaily.reduce((n,r)=>n+r.count,0)-baseline.registrationDaily.reduce((n,r)=>n+r.count,0),5);
  });
  await test('Store setup is a current cohort state, excludes older stores, and does not require live/approved status',()=>{
    assert.equal(metric(report,'storesCreated').value-metric(baseline,'storesCreated').value,3);
    assert.equal(metric(report,'setupSaved').value-metric(baseline,'setupSaved').value,1);
    assert.equal(metric(report,'setupSaved').previous,null);
    assert.match(metric(report,'setupSaved').definition,/not the date setup was completed/);
    assert.equal(report.registrations.find(r=>r.label==='Store setup not yet saved').count-baseline.registrations.find(r=>r.label==='Store setup not yet saved').count,2);
  });
  await test('Visitor source/device filters cannot fabricate signup attribution or change signup/store totals',async()=>{
    const filtered=await buildAnalyticsReport({days:30,device:'tablet',source:'unconnected-social-fixture'});
    for(const key of ['signups','storesCreated','setupSaved'])assert.equal(metric(filtered,key).value,metric(report,key).value);
    assert.deepEqual(filtered.registrations,report.registrations);
  });
  collectionCreated=!(await prisma.analyticsCollection.findUnique({where:{id:'main'}}));
  await prisma.analyticsCollection.upsert({where:{id:'main'},update:{},create:{id:'main',startedAt:current}});
  const eventId=randomUUID();events.push(eventId);
  await prisma.analyticsEvent.create({data:{id:eventId,name:'search',visitorId:randomUUID(),sessionId:randomUUID(),source:'privacy-fixture',medium:'test',device:'mobile',path:'/search',label:'Private Customer Name',value:0,createdAt:current}});
  const privacy=await buildAnalyticsReport({days:30,source:'privacy-fixture'});
  await test('Responses and CSV withhold free-text searches and contain no customer profile fields',()=>{
    assert.equal(privacy.searches.find(r=>r.label==='Searches with no results').count,1);
    for(const output of [JSON.stringify(privacy),analyticsCsv(privacy)]) {
      for(const secret of ['Private Customer Name',customer.email,customer.fullName,customer.id])assert.ok(!output.includes(secret));
    }
  });
  await test('Unconnected external sources have no fake freshness or metrics, independently of GA tag configuration',()=>{
    const sources=hub.analyticsConnections({...report,health:{...report.health,gaConfigured:true}});
    for(const id of ['website','gbp','meta']) {const source=sources.find(s=>s.id===id);assert.equal(source.connected,false);assert.equal(source.updatedAt,null);assert.equal(source.value,undefined);}
    assert.equal(hub.analyticsConnections(null)[0].status,'Not loaded');
    assert.equal(hub.snapshotIsOld(report,Date.parse(report.generatedAt)+16*60_000),true);
    assert.equal(hub.snapshotIsOld(report,Date.parse(report.generatedAt)+60_000),false);
  });
  await test('Admin page renders the loaded summary, bookmarked drilldowns and explicit source limitations',async()=>{
    actor={role:'ADMIN',userId:admin.id};
    const overview=renderToStaticMarkup(await Page({searchParams:Promise.resolve({})}));
    for(const text of ['Accounts created','Store setup saved','Check source health','Coverage details','Vendor activation','Social &amp; ads'])assert.ok(overview.includes(text),text);
    assert.equal((overview.match(/aria-label="Analytics areas"/g)||[]).length,1);
    assert.ok(!overview.includes('Payments through the period'),'overview avoids duplicate financial panels');
    const social=renderToStaticMarkup(await Page({searchParams:Promise.resolve({section:'social'})}));
    assert.ok(social.includes('Performance data unavailable here'));assert.ok(social.includes('Never sum daily unique reach'));
    const registration=renderToStaticMarkup(await Page({searchParams:Promise.resolve({section:'registrations'})}));assert.ok(registration.includes('Account creation by day'));assert.ok(registration.includes('not a timestamped completion'));
    const connections=renderToStaticMarkup(await Page({searchParams:Promise.resolve({section:'connections'})}));
    for(const text of ['WebsiteDaily','GBPmonthly','Not connected','Freshness unavailable here','Google account that has access'])assert.ok(connections.includes(text),text);
    assert.ok(connections.includes('rel="noopener noreferrer"'));assert.ok(connections.includes('referrerPolicy="no-referrer"'));assert.ok(!connections.includes('<iframe'));
  });
  await test('Empty report connections remain navigable without presenting missing business data as zero',()=>{
    const html=renderToStaticMarkup(React.createElement(panels.AnalyticsConnections,{report:null,privateReport:PRIVATE_ANALYTICS_REPORT}));
    assert.ok(html.includes('Not loaded'));assert.ok(html.includes('Freshness unavailable here'));assert.ok(!html.includes('<iframe'));
  });
  await test('Missing visitor table leaves business records intact and visitor metrics unavailable',async()=>{
    await prisma.$executeRawUnsafe('ALTER TABLE analytics_events RENAME TO analytics_events_hub_test_backup');
    try {const unavailable=await buildAnalyticsReport({days:30});assert.equal(unavailable.health.trafficAvailable,false);assert.equal(metric(unavailable,'visitors').value,null);assert.equal(metric(unavailable,'signups').value,metric(report,'signups').value);}
    finally {await prisma.$executeRawUnsafe('ALTER TABLE analytics_events_hub_test_backup RENAME TO analytics_events');}
  });
  console.log(`${passed} admin analytics hub checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  await prisma.analyticsEvent.deleteMany({where:{id:{in:events}}});
  if(collectionCreated)await prisma.analyticsCollection.deleteMany({where:{id:'main'}});
  if(batch)await prisma.importBatch.delete({where:{id:batch.id}});
  await prisma.rateLimit.deleteMany({where:{key:{in:users.map(id=>`analytics-report:${id}`)}}});
  await prisma.store.deleteMany({where:{id:{in:stores}}});
  await prisma.user.deleteMany({where:{id:{in:users}}});
  await prisma.$disconnect();
});
