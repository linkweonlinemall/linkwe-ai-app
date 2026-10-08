const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),crypto=require('node:crypto');
require('dotenv').config({path:'.env.local',quiet:true});require('dotenv').config({path:'.env',quiet:true});
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL||'').hostname))throw new Error('Analytics integration tests require a loopback database.');
process.env.NODE_ENV='test';
let actor=null;const jar=new Map();const cookies={get:key=>jar.has(key)?{value:jar.get(key)}:undefined,set:(key,value)=>jar.set(key,value),delete:key=>jar.delete(key)};const original=Module._load;
Module._load=function(request,parent,main){if(request==='server-only')return {};if(request==='next/headers')return{cookies:async()=>cookies};if(request==='@/lib/auth/session')return{getSession:async()=>actor};if(request.startsWith('@/'))request=path.join(process.cwd(),request.slice(2));return original.call(this,request,parent,main);};
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const model=require('../lib/analytics/model.ts');
const {buildAnalyticsReport}=require('../lib/analytics/report.ts');
const {getAdminAnalytics}=require('../app/actions/admin-analytics.ts');
const {prisma}=require('../lib/prisma.ts');
const id=crypto.randomUUID(),buyer=`analytics-buyer-${id}`,admin=`analytics-admin-${id}`,source='analytics-fixture';
const eventIds=[],attemptIds=[],merchantIds=[],rateKeys=[];let createdCollection=false;
const num=(r,k)=>r.metrics.find(m=>m.key===k).value;
let checks=0;
async function test(name,fn){await fn();checks++;console.log('PASS '+name);}
(async()=>{
 await test('Trinidad midnight and equal-duration comparisons',()=>{const p=model.analyticsPeriod(1,new Date('2026-10-08T02:00:00Z'));assert.equal(p.start.toISOString(),'2026-10-07T04:00:00.000Z');assert.equal(p.end-p.start,p.start-p.previousStart);});
 await test('Reject private paths, personal labels and forged purchases',()=>{assert.equal(model.safePath('/reset-password/secret?token=x'),null);assert.equal(model.safePath('/dashboard/admin'),null);assert.equal(model.safePath('/order-confirmation/private-order'),'/checkout/complete');assert.equal(model.safeLabel('person@example.com'),null);assert.equal(model.safeLabel('868 555 1234'),null);assert.equal(model.cleanEvent({id:crypto.randomUUID(),name:'purchase',path:'/shop'}),null);assert.equal(model.cleanEvent({id:crypto.randomUUID(),name:'search',path:'/search?q=secret',label:'drill',value:0}).path,'/search');});
 await test('Validate filters and prevent campaign URL escapes and CSV formulas',()=>{assert.throws(()=>model.parseFilters({days:999}));assert.throws(()=>model.campaignUrl('https://linkwe.test',{path:'//evil.com',source:'instagram',medium:'social',campaign:'sale'}));assert.throws(()=>model.campaignUrl('https://linkwe.test',{path:'/shop?email=private',source:'instagram',medium:'social',campaign:'sale'}));assert.ok(model.campaignUrl('https://linkwe.test',{path:'/shop',source:'Instagram',medium:'social',campaign:'Christmas sale'}).includes('utm_campaign=christmas_sale'));assert.equal(model.csvCell('=SUM(A1)'),`"'=SUM(A1)"`);});
 await test('Analytics action rejects guests and non-admins',async()=>{await assert.rejects(()=>getAdminAnalytics({}),/Administrator/);actor={role:'CUSTOMER',userId:buyer};await assert.rejects(()=>getAdminAnalytics({}),/Administrator/);actor=null;});
 const preCollection=await buildAnalyticsReport({days:30});if(!preCollection.health.firstEvent)assert.equal(num(preCollection,'visitors'),null);
 createdCollection=!(await prisma.analyticsCollection.findUnique({where:{id:'main'}}));await prisma.analyticsCollection.upsert({where:{id:'main'},update:{},create:{id:'main',startedAt:new Date(Date.now()-86400_000)}});
 const baseline=await buildAnalyticsReport({days:30,device:'all',source});
 await prisma.user.createMany({data:[{id:buyer,email:`${buyer}@example.test`,fullName:'Analytics test buyer',role:'CUSTOMER'},{id:admin,email:`${admin}@example.test`,fullName:'Analytics test admin',role:'ADMIN'}]});
 const now=Date.now(),at=new Date(now-3600_000),session=crypto.randomUUID(),visitor=crypto.randomUUID();
 async function payment(suffix,environment,roleId=buyer,status='SUCCEEDED',amount=12345){const attemptId=`${id}-${suffix}`,merchant=`analytics-${attemptId}`;attemptIds.push(attemptId);merchantIds.push(merchant);await prisma.paymentAttempt.create({data:{id:attemptId,merchantOrderId:merchant,purpose:'PRODUCT_ORDER',userId:roleId,targetId:attemptId,amountMinor:amount,environment,status,paidAt:at,createdAt:at}});return merchant;}
 const merchant=await payment('live','live');await payment('sandbox','sandbox');await payment('legacy',null);await payment('admin','live',admin);await payment('refund','live',buyer,'REFUNDED',1000);
 await prisma.analyticsCheckout.create({data:{merchantOrderId:merchant,visitorId:visitor,sessionId:session,source,medium:'test',device:'mobile',campaign:'fixture'}});
 async function event(name,offset,sessionId=session,extra={}){const eventId=crypto.randomUUID();eventIds.push(eventId);return prisma.analyticsEvent.create({data:{id:eventId,name,visitorId:visitor,sessionId,source,medium:'test',device:'mobile',campaign:'fixture',path:'/product/test',createdAt:new Date(at.getTime()-10000+offset),...extra}});}
 await event('view_item',0);await event('add_to_cart',1000);await event('begin_checkout',2000);await event('payment_redirect',3000);await event('search',3500,session,{label:'drill',value:0});
 const second=crypto.randomUUID();await event('begin_checkout',0,second);await event('add_to_cart',1000,second);await event('view_item',2000,second);
 const report=await buildAnalyticsReport({days:30,device:'mobile',source});
 await test('Money excludes sandbox, unknown environment and admin; refunds remain distinct',()=>{assert.equal(num(report,'collected')-num(baseline,'collected'),13345);assert.equal(num(report,'payments')-num(baseline,'payments'),2);assert.equal(num(report,'refunded')-num(baseline,'refunded'),1000);assert.equal(report.health.legacyPayments-baseline.health.legacyPayments,1);});
 await test('Shopping funnel enforces ordered steps and uses verified payments',()=>{assert.deepEqual(report.funnel.map(x=>x.count),[2,1,1,1,1]);assert.equal(report.searches.find(r=>r.label==='drill').count,1);assert.equal(report.campaigns.find(r=>r.label.startsWith('fixture')).value,12345);});
 const desktop=await buildAnalyticsReport({days:30,device:'desktop',source});
 await test('Device filter affects visitor reports but never changes business money',()=>{assert.equal(num(desktop,'visitors'),0);assert.equal(num(desktop,'collected'),num(report,'collected'));});
 await test('Duplicate event delivery is idempotent',async()=>{const row=await prisma.analyticsEvent.findUnique({where:{id:eventIds[0]}});const result=await prisma.analyticsEvent.createMany({data:[row],skipDuplicates:true});assert.equal(result.count,0);});
 process.env.ANALYTICS_ALLOW_LOCAL='true';
 const {POST}=require('../app/api/analytics/route.ts');const collection=require('../lib/analytics/collection.ts');
 const send=(body,origin='https://linkwe.test')=>POST(new Request('https://linkwe.test/api/analytics',{method:'POST',headers:{origin,'content-type':'application/json','user-agent':'Mobile test browser'},body:JSON.stringify(body)}));
 await test('Collection enforces origin, explicit consent, signed session and revocation',async()=>{
   actor=null;
   assert.equal((await send({action:'start'},'https://evil.test')).status,403);
   assert.deepEqual(await (await send({events:[]})).json(),{accepted:false});
   await send({action:'consent',accepted:true});await send({action:'start',source:'fixture',medium:'test'});
   const context=await collection.analyticsContext();assert.ok(context);assert.equal(context.device,'mobile');rateKeys.push(`analytics:${context.visitorId}`);
   const eventId=crypto.randomUUID();eventIds.push(eventId);
   assert.deepEqual(await (await send({events:[{id:eventId,name:'search',path:'/search?email=secret',label:'person@example.com',value:0,extra:'private'}]})).json(),{accepted:true});
   const saved=await prisma.analyticsEvent.findUnique({where:{id:eventId}});assert.equal(saved.path,'/search');assert.equal(saved.label,null);assert.equal(saved.source,'fixture');assert.ok(Math.abs(Date.now()-saved.createdAt.getTime())<10000);
   actor={role:'ADMIN',userId:admin};assert.deepEqual(await (await send({events:[]})).json(),{accepted:false});actor=null;
   await send({action:'consent',accepted:false});assert.equal(await collection.analyticsContext(),null);assert.deepEqual(await (await send({events:[]})).json(),{accepted:false});
 });
 await test('Export includes definitions and coverage alongside all report sections',()=>{const {analyticsCsv}=require('../lib/analytics/export.ts');const csv=analyticsCsv(report);assert.ok(csv.includes('Payments collected'));assert.ok(csv.includes('Business totals'));assert.ok(csv.includes('Visitor data available'));assert.ok(csv.includes('Vendors'));assert.ok(csv.includes('Currency')===false);});
 console.log(`${checks} analytics checks passed`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
 await prisma.rateLimit.deleteMany({where:{key:{in:rateKeys}}});
 if(createdCollection)await prisma.analyticsCollection.deleteMany({where:{id:'main'}});
 await prisma.analyticsEvent.deleteMany({where:{id:{in:eventIds}}});
 await prisma.analyticsCheckout.deleteMany({where:{merchantOrderId:{in:merchantIds}}});
 await prisma.paymentAttempt.deleteMany({where:{id:{in:attemptIds}}});
 await prisma.user.deleteMany({where:{id:{in:[buyer,admin]}}});
 await prisma.$disconnect();
});
