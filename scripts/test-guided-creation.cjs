const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), Module=require('node:module'), ts=require('typescript');
require('dotenv').config({path:'.env.local',quiet:true});require('dotenv').config({path:'.env',quiet:true});
const db=new URL(process.env.DATABASE_URL||'');if(!['localhost','127.0.0.1','[::1]'].includes(db.hostname)||db.pathname!=='/linkwe_dev')throw Error('Only local linkwe_dev is permitted.');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const model=require('../lib/vendor/guided-creation/model.ts');
const examples=[
 [{receive:'physical',options:'none'},'simple'],[{receive:'physical',options:'personal'},'personal'],
 [{receive:'physical',options:'variants',axes:'both'},'variable'],[{receive:'physical',options:'both',axes:'colour'},'variable-personal'],
 [{receive:'digital',file:'ready'},'digital'],[{receive:'digital',file:'custom'},'QUOTE'],[{receive:'digital',file:'live'},'VIRTUAL'],
 [{receive:'service',service:'appointment',location:'person'},'BOOKABLE'],[{receive:'service',service:'appointment',location:'online'},'VIRTUAL'],
 [{receive:'service',service:'quote'},'QUOTE'],[{receive:'service',service:'subscription'},'SUBSCRIPTION'],[{receive:'service',service:'callout'},'ON_DEMAND'],
 [{receive:'service',service:'event',event:'new'},'event'],[{receive:'event',event:'existing'},'ticket'],
 [{receive:'mixed',mixed:'separate'},'review'],[{receive:'unsure',receiveHelp:'unsure'},'review'],
 [{receive:'mixed',mixed:'service',service:'quote'},'QUOTE'],[{receive:'physical',options:'unsure',optionsHelp:'personal'},'personal'],
];
for(const [answers,code] of examples)assert.equal(model.guideJourney(answers).result?.code,code,JSON.stringify(answers));
assert.equal(model.guideJourney({receive:'service',service:'appointment'}).pending.id,'location');
assert.deepEqual(model.changeAnswer({receive:'physical',options:'variants',axes:'size'},'receive','event'),{receive:'event'});
assert.deepEqual(model.cleanAnswers({receive:'digital',file:'ready',axes:'size',service:'subscription'}),{receive:'digital',file:'ready'});
for(const input of [null,[],{receive:'fake'},{storeId:'foreign'},JSON.parse('{"__proto__":"bad"}')])assert.throws(()=>model.cleanAnswers(input));
let leaves=0;const codes=new Set();
function walk(answers){const j=model.guideJourney(answers);assert.ok(j.questions.length<12);if(j.pending){for(const c of j.pending.choices)walk({...answers,[j.pending.id]:c.value});return;}assert.ok(j.result,'every branch ends with guidance');leaves++;codes.add(j.result.code);assert.equal(new Set(j.result.steps.map(s=>s.id)).size,j.result.steps.length);assert.deepEqual(model.cleanAnswers(answers),j.answers);const href=model.guideFormHref(j.result,'example');if(j.result.kind==='review')assert.equal(href,null);else{const u=new URL(href,'http://local');assert.equal(u.pathname,'/dashboard/vendor/creation/new');assert.equal(u.searchParams.get('type'),j.result.kind);assert.equal(u.searchParams.get('guide'),'example');}}
walk({});assert.ok(codes.size>=12);console.log(`PASS all ${leaves} question paths, ${codes.size} outcomes, uncertainty, abandoned branches and safe form destinations.`);

const {PrismaClient}=require('@prisma/client'),real=new PrismaClient(),rollback=new Error('ROLLBACK');
(async()=>{try{await real.$transaction(async tx=>{
 const vendor=await tx.user.findUniqueOrThrow({where:{email:'vendor-preview@linkwe.test'}}),store=await tx.store.findUniqueOrThrow({where:{ownerId:vendor.id}}),other=await tx.store.findFirstOrThrow({where:{id:{not:store.id}}});
 let session={userId:vendor.id,role:'VENDOR'};
 const original=Module._load;Module._load=function(request,parent,main){
  if(request==='@/lib/auth/session')return{getSession:async()=>session};
  if(request==='@/lib/prisma')return{prisma:{...tx,$transaction:fn=>fn(tx)}};
  if(request==='server-only')return{};
  if(/anthropic|openai|ai-usage/.test(request))throw Error('Guide must not access AI');
  if(request.startsWith('@/'))request=path.join(process.cwd(),request.slice(2));
  return original.call(this,request,parent,main);
 };
 try{
  const api=require('../app/actions/guided-creation.ts');
  const listingsBefore=await tx.product.count({where:{storeId:store.id}}),eventsBefore=await tx.event.count({where:{storeId:store.id}});
  for(const plan of ['STARTER','SERVICES','GROWTH','PRO']){await tx.store.update({where:{id:store.id},data:{subscriptionPlan:plan}});assert.ok((await api.startCreationGuide(`Guide on ${plan}`)).id);}
  console.log('PASS free access on every plan, including Starter and Services; no AI provider or usage dependencies.');
  let draft=await api.startCreationGuide('Shirts for the guide test');
  draft=await api.saveCreationGuide({...draft,answers:{receive:'physical'},checked:[]});
  assert.equal((await api.getCreationGuide(draft.id)).answers.receive,'physical');
  assert.equal(model.guideJourney(draft.answers).pending.id,'options');
  const stale=draft;
  draft=await api.saveCreationGuide({...draft,answers:{receive:'physical',options:'variants',axes:'both'},checked:[]});
  await assert.rejects(()=>api.saveCreationGuide({...stale,title:'Stale overwrite'}),/another tab/);
  draft=await api.saveCreationGuide({...draft,checked:['type','options']});assert.deepEqual(draft.checked,['type','options']);
  draft=await api.saveCreationGuide({...draft,answers:{receive:'physical',options:'none'},checked:['type']});assert.deepEqual(draft.checked,[]);
  await assert.rejects(()=>api.saveCreationGuide({...draft,checked:['file']}),/checklist/);
  const fresh=await api.getCreationGuide(draft.id);assert.equal(fresh.version,draft.version);
  await tx.guidedCreationPlan.update({where:{id:draft.id},data:{guideVersion:0,checked:['type']}});assert.deepEqual((await api.getCreationGuide(draft.id)).checked,[]);
  session={userId:other.ownerId,role:'VENDOR'};
  await assert.rejects(()=>api.getCreationGuide(draft.id),/not found/);
  await assert.rejects(()=>api.saveCreationGuide({...draft,title:'Wrong owner'}),/not found/);
  await assert.rejects(()=>api.listCreationGuides(draft.id),/Reload/);
  assert.ok(!(await api.listCreationGuides()).plans.some(p=>p.id===draft.id));
  session={userId:vendor.id,role:'CUSTOMER'};await assert.rejects(()=>api.startCreationGuide('Blocked'),/vendor/);
  session=null;await assert.rejects(()=>api.listCreationGuides(),/vendor/);
  session={userId:vendor.id,role:'VENDOR'};
  await assert.rejects(()=>api.startCreationGuide('x'.repeat(101)),/100/);
  await assert.rejects(()=>api.saveCreationGuide({...draft,answers:{receive:'physical',unknown:'bad'}}),/supported/);
  console.log('PASS save/resume, checked steps, stale edits, checklist resets, guide upgrades and owner/role isolation.');
  for(let i=0;i<23;i++)await api.startCreationGuide('Pagination '+i);
  const first=await api.listCreationGuides();assert.equal(first.plans.length,20);assert.ok(first.nextCursor);
  const second=await api.listCreationGuides(first.nextCursor);assert.ok(second.plans.length>=8);assert.ok(second.plans.every(p=>!first.plans.some(q=>p.id===q.id)));
  assert.equal(await tx.product.count({where:{storeId:store.id}}),listingsBefore);assert.equal(await tx.event.count({where:{storeId:store.id}}),eventsBefore);
  console.log('PASS unlimited saved guides with pagination; no listings or events created or published.');
 }finally{Module._load=original;}
 throw rollback;
},{timeout:30000});}catch(e){if(e!==rollback)throw e;}finally{await real.$disconnect();}})().then(()=>console.log('All test database changes rolled back.')).catch(e=>{console.error(e);process.exitCode=1;});
