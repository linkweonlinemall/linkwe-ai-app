const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const old=Module._load;let session={userId:'owner',role:'VENDOR'},writes=[],cancels=[];
const bookings=[{id:'own',owner:'owner',isService:true,vendorNotes:'Private preparation'},{id:'other',owner:'other',isService:true}];
const owned=w=>bookings.find(r=>r.id===w.id&&r.owner===w.product.store.ownerId&&r.isService===w.product.isService);
Module._load=function(r,p,m){
if(r==='@/lib/prisma')return{prisma:{productBooking:{updateMany:async({where,data})=>{const row=owned(where);if(!row)return{count:0};writes.push(data);Object.assign(row,data);return{count:1};},findFirst:async({where})=>owned(where)??null}}};
if(r==='@/lib/auth/session')return{getSession:async()=>session};
if(r==='next/cache')return{revalidatePath:()=>{}};
if(r==='@/lib/finance/cancel-booking')return{cancelBookingCore:async(...args)=>{cancels.push(args);return{ok:true,refundedTTD:0};}};
if(r.startsWith('@/'))r=path.join(process.cwd(),r.slice(2));return old.call(this,r,p,m);};
(async()=>{
const d=require('../lib/vendor/service-desk.ts'),now=Date.parse('2026-10-01T15:00:00Z');
const base={id:'id',createdAt:'2026-09-20T12:00:00Z',service:{id:'service',name:'Portrait session'},customer:{fullName:'Alex',email:'test@example.invalid'}};
const b={...base,kind:'booking',status:'PENDING',bookingDate:'2026-10-02T16:00:00Z',startTime:'10:00',endTime:'11:00'},r={...base,kind:'request',status:'PENDING',requestType:'QUOTE'},s={...base,kind:'subscription',status:'ACTIVE',sessionsRemaining:3,currentPeriodEnd:'2026-10-25T12:00:00Z',interval:'monthly',priceMinor:120000};
assert.equal(d.bookingTime(b),Date.parse('2026-10-02T14:00:00Z'));assert.equal(d.bookingDay(b),'2026-10-02');assert.notEqual(d.deskKey(b),d.deskKey(r));
assert.equal(d.needsAttention(b,now),true);assert.equal(d.needsAttention({...r,status:'REFUND_PENDING'},now),true);assert.equal(d.isWaiting({...r,status:'ACCEPTED'},now),true);assert.equal(d.isWaiting({...r,status:'CONFIRMED',vendorCompletedAt:'2026-10-01T12:00:00Z'},now),true);
for(const change of [{status:'PAUSED'},{status:'PAST_DUE'},{status:'CANCELED'},{sessionsRemaining:0},{sessionsRemaining:null},{currentPeriodEnd:null},{currentPeriodEnd:'2026-09-01T12:00:00Z'}])assert.equal(d.canRecordSession({...s,...change},now),false);
assert.equal(d.canRecordSession({...s,cancelAtPeriodEnd:true},now),true);assert.equal(d.matchesQueue({...s,sessionsRemaining:0},'active',now),true);assert.equal(d.matchesQueue({...s,status:'PAUSED'},'active',now),false);assert.equal(d.monthlyRecurringMinor([s,{...s,status:'CANCELED'}],now),120000);
const opts={kind:'all',queue:'all',query:'Alex portrait',service:'',sort:'priority',now};assert.equal(d.filterDesk([b,r,s],opts).length,3);assert.equal(d.filterDesk([b,r,s],{...opts,query:'quote'}).length,1);assert.equal(d.filterDesk([s,b],{...opts,queue:'attention'})[0].kind,'booking');
const a=require('../app/actions/vendor-service-desk.ts');assert.equal((await a.saveBookingPrivateNote('own',' Team only ')).ok,true);assert.ok((await a.saveBookingPrivateNote('other','Wrong owner')).error);assert.ok((await a.saveBookingPrivateNote('own','x'.repeat(4001))).error);
assert.ok((await a.cancelServiceDeskBooking('other','Reason')).error);assert.ok((await a.cancelServiceDeskBooking('own','')).error);assert.equal((await a.cancelServiceDeskBooking('own','Schedule conflict')).ok,true);assert.deepEqual(cancels,[['own','VENDOR','Schedule conflict']]);assert.equal(bookings[0].vendorNotes,'Team only');
for(const value of [null,{userId:'owner',role:'CUSTOMER'},{userId:'other',role:'VENDOR'}]){session=value;assert.ok((await a.saveBookingPrivateNote('own','No access')).error);assert.ok((await a.cancelServiceDeskBooking('own','No access')).error);}assert.equal(writes.length,1);assert.equal(cancels.length,1);
console.log('PASS: unified search and quotes, Trinidad calendar, queue states, session eligibility, recurring revenue, owner isolation, validation, and private-note separation from refunds. No database writes or external messages.');
})().catch(e=>{console.error(e);process.exitCode=1;});
