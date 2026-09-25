// Local integration checks. All writes roll back; external notifications are stubbed.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
require('dotenv').config({path:'.env.local',quiet:true});require('dotenv').config({path:'.env',quiet:true});
const db=new URL(process.env.DATABASE_URL||'');
if(!['localhost','127.0.0.1','[::1]'].includes(db.hostname)||db.pathname!=='/linkwe_dev')throw new Error('Only local linkwe_dev is permitted.');
const {PrismaClient}=require('@prisma/client');const real=new PrismaClient(),rollback=new Error('ROLLBACK');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
(async()=>{try{await real.$transaction(async tx=>{
 const vendor=await tx.user.findUniqueOrThrow({where:{email:'vendor-preview@linkwe.test'}});
 const customer=await tx.user.findUniqueOrThrow({where:{email:'customer-preview@linkwe.test'}});
 let session={userId:vendor.id,role:'VENDOR'};const notices=[];
 const old=Module._load;Module._load=function(request,parent,main){
  if(request==='server-only')return{};
  if(request==='@/lib/prisma')return{prisma:{...tx,$transaction:fn=>fn(tx)}};
  if(request==='@/lib/auth/session')return{getSession:async()=>session};
  if(request==='next/cache')return{revalidatePath:()=>{}};
  if(request==='next/navigation')return{redirect:url=>{throw new Error('REDIRECT:'+url);}};
  if(request==='@/lib/notifications/create')return{createNotification:async data=>{notices.push(data);}};
  if(request==='@/lib/wipay/subscriptions')return{beginWiPayManualSubscription:async()=>{throw new Error('Unexpected payment call');}};
  if(request==='@/lib/wipay/wapi')return{requestWiPayRefund:async()=>{throw new Error('Unexpected refund call');}};
  if(request==='@/lib/email/resend')return{BASE_URL:'http://localhost:3000'};
  if(request.startsWith('@/'))request=path.join(process.cwd(),request.slice(2));
  return old.call(this,request,parent,main);
 };
 try{
  const {getServiceDesk}=require('../lib/vendor/service-desk-query.ts');
  const {saveBookingPrivateNote}=require('../app/actions/vendor-service-desk.ts');
  const {recordServiceSubscriptionSession}=require('../app/actions/service-subscription.ts');
  const desk=await getServiceDesk();
  const ownedStore=await tx.store.findUniqueOrThrow({where:{ownerId:vendor.id}});
  assert.equal(desk.store.id,ownedStore.id);assert.ok(desk.records.some(r=>r.kind==='booking'));assert.ok(desk.records.some(r=>r.kind==='request'&&r.requestType==='QUOTE'));assert.ok(desk.records.some(r=>r.kind==='subscription'));
  assert.ok(desk.records.every(r=>typeof r.createdAt==='string'));JSON.stringify(desk);
  const ownBooking=desk.records.find(r=>r.kind==='booking');
  assert.equal((await saveBookingPrivateNote(ownBooking.id,'PRIVATE TEST NOTE')).ok,true);
  assert.equal((await tx.productBooking.findUniqueOrThrow({where:{id:ownBooking.id}})).vendorNotes,'PRIVATE TEST NOTE');assert.equal(notices.length,0,'saving private notes must not notify customers');
  const otherBooking=await tx.productBooking.findFirstOrThrow({where:{product:{storeId:{not:ownedStore.id}}}});
  assert.ok((await saveBookingPrivateNote(otherBooking.id,'No access')).error);
  assert.ok(!desk.records.some(r=>r.kind==='booking'&&r.id===otherBooking.id));
  const sub=desk.records.find(r=>r.kind==='subscription');
  await tx.customerServiceSubscription.update({where:{id:sub.id},data:{status:'ACTIVE',sessionsRemaining:1,currentPeriodEnd:new Date(Date.now()+86400000)}});
  const before=await tx.serviceSubscriptionSessionUsage.count({where:{subscriptionId:sub.id}});
  assert.equal((await recordServiceSubscriptionSession(sub.id)).ok,true);
  assert.equal((await tx.customerServiceSubscription.findUniqueOrThrow({where:{id:sub.id}})).sessionsRemaining,0);
  assert.equal(await tx.serviceSubscriptionSessionUsage.count({where:{subscriptionId:sub.id}}),before+1);
  assert.equal((await recordServiceSubscriptionSession(sub.id)).ok,false);
  for(const change of [{status:'PAUSED',sessionsRemaining:2},{status:'PAST_DUE',sessionsRemaining:2},{status:'ACTIVE',sessionsRemaining:2,currentPeriodEnd:new Date(Date.now()-1000)}]){
    await tx.customerServiceSubscription.update({where:{id:sub.id},data:change});assert.equal((await recordServiceSubscriptionSession(sub.id)).ok,false);
  }
  session={userId:customer.id,role:'VENDOR'};assert.equal((await recordServiceSubscriptionSession(sub.id)).ok,false);assert.ok((await saveBookingPrivateNote(ownBooking.id,'No access')).error);
  session={userId:vendor.id,role:'CUSTOMER'};await assert.rejects(getServiceDesk,/REDIRECT:\/dashboard/);assert.ok((await saveBookingPrivateNote(ownBooking.id,'Wrong role')).error);
  session=null;await assert.rejects(getServiceDesk,/REDIRECT:\/login/);assert.equal((await recordServiceSubscriptionSession(sub.id)).ok,false);
  assert.equal(notices.length,1,'only the successful session generated a stubbed notification');
  console.log('PASS: real owned-store queries, serialized records, private-note persistence and isolation, one-session deduction with usage history, depleted/paused/overdue/expired access guards and anonymous/wrong-role redirects.');
 }finally{Module._load=old;}
 throw rollback;
},{timeout:30000});}catch(error){if(error!==rollback)throw error;}finally{await real.$disconnect();}})().then(()=>console.log('All writes rolled back. No real payments, refunds, emails or notifications.')).catch(error=>{console.error(error);process.exitCode=1;});
