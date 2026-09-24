// Real database concurrency checks, restricted to local development only.
const assert = require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), Module=require('node:module'), ts=require('typescript');
require('dotenv').config({path:'.env.local',quiet:true}); require('dotenv').config({path:'.env',quiet:true});
if (!['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL || '').hostname)) throw new Error('Quota checks require a loopback database.');
const {PrismaClient}=require('@prisma/client'); const prisma=new PrismaClient();
const oldLoad=Module._load; Module._load=function(request,parent,main){if(request==='server-only')return {};if(request==='@/lib/prisma')return {prisma};if(request.startsWith('@/'))request=path.join(process.cwd(),request.slice(2));return oldLoad.call(this,request,parent,main);};
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {reservePhotoAttempt,settlePhotoTrial,getPhotoAccess}=require('../lib/photo-studio/usage.ts');
const marker='quota-test-'+Date.now();
const now=new Date('2099-12-15T12:00:00Z');
const globalKey='photo-studio:test:month:2099-12';
let ownsFixture=false;
let ownsTotal=false;
const users=[], stores=[];
async function fixture(suffix, paid=true) {
 const user=await prisma.user.create({data:{email:marker+suffix+'@linkwe.test',role:'VENDOR',fullName:'Photo quota test'}}); users.push(user.id);
 const store=await prisma.store.create({data:{ownerId:user.id,name:'Photo quota test',slug:marker+suffix,categoryId:'test',region:'test',subscriptionPlan:paid?'GROWTH':'STARTER',subscriptionStatus:paid?'ACTIVE':'NONE'}}); stores.push(store.id);
 return store;
}
(async()=>{
  assert.equal(await prisma.rateLimit.count({where:{key:globalKey}}),0,'Reserved test period is already in use; aborting.');
  ownsFixture=true;
  const a=await fixture('a'),b=await fixture('b'),c=await fixture('c');
  const raced=await Promise.allSettled([reservePhotoAttempt(a.id,'a',true,1,10,now),reservePhotoAttempt(b.id,'b',true,1,10,now)]);
  assert.equal(raced.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(raced.filter(r=>r.status==='rejected'&&r.reason.status===429).length,1);
  assert.equal((await prisma.rateLimit.findUnique({where:{key:globalKey}})).count,1);
  console.log('PASS Simultaneous requests cannot exceed the global monthly budget');
  await reservePhotoAttempt(c.id,'c',true,10,1,now);
  await assert.rejects(()=>reservePhotoAttempt(c.id,'new',true,10,1,now), e=>e.status===429);
  assert.equal((await prisma.rateLimit.findUnique({where:{key:globalKey}})).count,2);
  console.log('PASS Store allowance enforced; rejected store request rolls back the global reservation');
  await assert.rejects(()=>reservePhotoAttempt(c.id,'c',true,10,10,now), e=>e.status===429);
  assert.equal((await prisma.rateLimit.findUnique({where:{key:globalKey}})).count,2);
  console.log('PASS Duplicate submission cannot reserve or spend again');
  await reservePhotoAttempt(c.id,'c',true,10,10,new Date(now.getTime()+121000));
  assert.equal((await prisma.rateLimit.findUnique({where:{key:globalKey}})).count,3);
  console.log('PASS A deliberate retry is allowed after the duplicate window');
  const starter=await fixture('starter',false);
  const trialRaces=await Promise.allSettled(Array.from({length:7},(_,i)=>reservePhotoAttempt(starter.id,'trial-'+i,true,100,100,now)));
  const accepted=trialRaces.filter(r=>r.status==='fulfilled');
  assert.equal(accepted.length,5); assert.equal(trialRaces.filter(r=>r.status==='rejected'&&r.reason.status===403).length,2);
  assert.equal((await getPhotoAccess(starter.id,true,now)).trialRemaining,0);
  await settlePhotoTrial(accepted[0].value,false); await settlePhotoTrial(accepted[0].value,false);
  assert.equal((await getPhotoAccess(starter.id,true,now)).trialRemaining,1,'failed edit refunded only once');
  const retry=await reservePhotoAttempt(starter.id,'trial-retry',true,100,100,now); await settlePhotoTrial(retry,true);
  for(const entry of accepted.slice(1))await settlePhotoTrial(entry.value,true);
  assert.equal((await getPhotoAccess(starter.id,true,new Date('2100-01-01T00:00:00Z'))).allowed,false,'five edits do not reset next month');
  await prisma.store.update({where:{id:starter.id},data:{subscriptionPlan:'PRO',subscriptionStatus:'ACTIVE'}});
  assert.equal(await reservePhotoAttempt(starter.id,'paid-edit',true,100,100,now),null);
  await prisma.store.update({where:{id:starter.id},data:{subscriptionPlan:'STARTER',subscriptionStatus:'NONE'}});
  assert.equal((await getPhotoAccess(starter.id,true,now)).allowed,false,'downgrading does not restart trial');
  await prisma.store.delete({where:{id:starter.id}});
  const recreated=await prisma.store.create({data:{ownerId:starter.ownerId,name:'Recreated test',slug:marker+'recreated',categoryId:'test',region:'test'}}); stores.push(recreated.id);
  assert.equal((await getPhotoAccess(recreated.id,true,now)).allowed,false,'recreating store does not reset vendor trial');
  assert.equal((await getPhotoAccess(recreated.id,false,now)).trialRemaining,5,'sandbox does not consume live trial');
  const orphan=await fixture('orphan',false);
  await reservePhotoAttempt(orphan.id,'crashed',true,100,100,now);
  assert.equal((await getPhotoAccess(orphan.id,true,new Date(now.getTime()+601000))).trialRemaining,5,'crashed processing recovers');
  console.log('PASS Seven concurrent Starter requests allow only five; failure refunds, expiry recovery, upgrade/downgrade, store recreation and sandbox separation work');
  const totalKey='photo-studio:test:total';
  assert.equal(await prisma.rateLimit.count({where:{key:totalKey}}),0,'Total-budget test counter must be unused.'); ownsTotal=true;
  await reservePhotoAttempt(c.id,'lifetime-budget',true,100,100,now,1);
  await assert.rejects(()=>reservePhotoAttempt(c.id,'next-month-budget',true,100,100,new Date('2100-01-01T00:00:00Z'),1),e=>e.status===429);
  console.log('PASS The launch budget cannot reset or spend again next month');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  if(ownsFixture) {
    if(ownsTotal)await prisma.rateLimit.deleteMany({where:{key:'photo-studio:test:total'}});
    await prisma.rateLimit.deleteMany({where:{OR:[{key:globalKey},...stores.flatMap(id=>[{key:{startsWith:'photo-studio:test:store:'+id+':'}},{key:{startsWith:'photo-studio:test:request:'+id+':'}}]),...users.map(id=>({key:{startsWith:'photo-studio:test:trial:'+id}}))]}});
    await prisma.store.deleteMany({where:{id:{in:stores}}}); await prisma.user.deleteMany({where:{id:{in:users}}});
  }
  await prisma.$disconnect();
});
