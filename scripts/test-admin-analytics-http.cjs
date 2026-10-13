// Compiled page/action authorization with real DB-backed sessions; no browser or production access.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PrismaClient}=require('@prisma/client');
const database=new URL(process.env.DATABASE_URL||'');
if(database.hostname!=='127.0.0.1'||database.port!=='55440'||database.pathname!=='/linkwe_analytics_test')throw Error('Disposable analytics database only.');
if(process.env.AUTH_SECRET!=='local-analytics-review-only-not-a-production-secret')throw Error('Local analytics auth configuration required.');
const origin='http://127.0.0.1:3159',route=origin+'/dashboard/admin/analytics',db=new PrismaClient(),ids=[];
let passed=0;
async function test(name,run){await run();passed++;console.log('PASS '+name);}
(async()=>{
 const {SignJWT}=await import('jose');
 const token=async user=>`lw_session=${await new SignJWT({email:user.email,fullName:user.fullName,role:'ADMIN'}).setProtectedHeader({alg:'HS256'}).setSubject(user.id).setIssuedAt().setExpirationTime('10m').sign(new TextEncoder().encode(process.env.AUTH_SECRET))}`;
 const get=async(path,cookie)=>{const res=await fetch(origin+path,{redirect:'manual',headers:cookie?{Cookie:cookie}:{}});return{status:res.status,body:await res.text(),headers:res.headers};};
 const manifest=require('../.next/server/server-reference-manifest.json');
 const [action]=Object.entries(manifest.node).find(([,v])=>v.filename==='app/actions/admin-analytics.ts'&&v.exportedName==='getAdminAnalytics');
 const post=async(cookie,input={})=>{const res=await fetch(route,{method:'POST',redirect:'manual',headers:{'Content-Type':'text/plain;charset=UTF-8','Next-Action':action,Origin:origin,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify([input])});return{status:res.status,body:await res.text()};};
 const admin=await db.user.findUniqueOrThrow({where:{email:'analytics-preview@example.test'}}),cookie=await token(admin);
 await test('Active ADMIN token is accepted before checking forbidden roles',async()=>{const r=await post(cookie);assert.equal(r.status,200);assert.ok(r.body.includes('Accounts created'));});
 const reportId='/reporting/';
 await test('Anonymous pages and direct data actions expose neither aggregates nor private report navigation',async()=>{
  for(const section of ['overview','registrations','connections']){const r=await get(`/dashboard/admin/analytics?section=${section}`);assert.equal(r.status,307);assert.ok(r.headers.get('location').includes('/login'));assert.ok(!r.body.includes(reportId));assert.ok(!r.body.includes('Accounts created'));}
  const r=await post();assert.ok(r.status>=300);assert.ok(!r.body.includes('Accounts created'));assert.ok(!r.body.includes(reportId));
 });
 for(const [role,extra] of [['CUSTOMER',{}],['VENDOR',{}],['COURIER',{}],['ADMIN',{suspended:true}],['ADMIN',{isActive:false}]]){
  const id=`analytics-http-${randomUUID()}`;ids.push(id);const user=await db.user.create({data:{id,email:`${id}@example.test`,fullName:'Private HTTP fixture',role,...extra}});const cookie=await token(user);
  await test(`Current DB access rejects ${role}${extra.suspended?' suspended':extra.isActive===false?' inactive':''} despite an ADMIN token claim`,async()=>{
   const page=await get('/dashboard/admin/analytics?section=connections',cookie);
   // Next can flush HTTP 200 before an async server component redirects. Require the redirect and no private output.
   assert.ok(page.status>=300||page.body.includes('NEXT_REDIRECT'),`Expected server redirect, got ${page.status}`);assert.ok(!page.body.includes(reportId));assert.ok(!page.body.includes('Accounts created'));
   const action=await post(cookie);assert.ok(action.status>=300||!action.body.includes('"metrics"'));assert.ok(!action.body.includes('Accounts created'));assert.ok(!action.body.includes(reportId));
  });
 }
 await test('ADMIN gets rendered overview, setup definitions and an unconfigured private-link state without an embed or public cache',async()=>{
  const page=await get('/dashboard/admin/analytics',cookie);assert.equal(page.status,200);for(const phrase of ['Accounts created','Store setup saved','Check source health','Coverage details'])assert.ok(page.body.includes(phrase),phrase);assert.ok(/private|no-store/.test(page.headers.get('cache-control')||''));
  const setup=await get('/dashboard/admin/analytics?section=registrations&days=7',cookie);assert.equal(setup.status,200);assert.ok(setup.body.includes('Account creation by day'));assert.ok(setup.body.includes('not a timestamped completion'));
  const connections=await get('/dashboard/admin/analytics?section=connections',cookie);assert.equal(connections.status,200);assert.ok(!connections.body.includes(reportId));assert.ok(connections.body.includes('not configured in this environment'));assert.ok(connections.body.includes('Freshness unavailable here'));assert.ok(connections.body.includes('Not connected'));assert.ok(!connections.body.includes('<iframe'));
 });
 await test('Compiled admin action returns aggregates, rejects bad filters and withholds customer data',async()=>{
  const r=await post(cookie,{days:30});assert.equal(r.status,200);assert.ok(r.body.includes('Accounts created'));assert.ok(r.body.includes('Store setup saved'));assert.ok(!r.body.includes('analytics-local-customer-'));assert.ok(!r.body.includes('@example.test'));
  const invalid=await post(cookie,{days:999});assert.ok(!invalid.body.includes('"metrics"'));assert.ok(!invalid.body.includes('Accounts created'));
 });
 await test('Revoking ADMIN blocks the same already-issued signed token',async()=>{
  const id=`analytics-revoke-${randomUUID()}`;ids.push(id);const user=await db.user.create({data:{id,email:`${id}@example.test`,fullName:'Revocation fixture',role:'ADMIN'}});const issued=await token(user);
  assert.equal((await post(issued)).status,200);await db.user.update({where:{id},data:{role:'CUSTOMER'}});
  const denied=await post(issued);assert.ok(!denied.body.includes('Accounts created'));assert.ok(!denied.body.includes('"metrics"'));
 });
 console.log(`${passed} compiled admin analytics HTTP checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
 await db.rateLimit.deleteMany({where:{key:{in:ids.map(id=>`analytics-report:${id}`)}}});
 await db.user.deleteMany({where:{id:{in:ids}}});await db.$disconnect();
});
