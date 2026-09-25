// Exercises real local queries inside a transaction that always rolls back.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
require('dotenv').config({path:'.env.local',quiet:true});require('dotenv').config({path:'.env',quiet:true});
const db=new URL(process.env.DATABASE_URL||'');
if(!['localhost','127.0.0.1','[::1]'].includes(db.hostname)||db.pathname!=='/linkwe_dev')throw new Error('Only local linkwe_dev is permitted.');
const {PrismaClient}=require('@prisma/client');const real=new PrismaClient();
const rollback=new Error('TEST_ROLLBACK');
(async()=>{
const vendor=await real.user.findUnique({where:{email:'vendor-preview@linkwe.test'}});
if(!vendor)throw new Error('Run local preview fixtures first.');
let session={userId:vendor.id,role:'VENDOR'};
try{await real.$transaction(async tx=>{
 const old=Module._load;
 Module._load=function(request,parent,main){
  if(request==='@/lib/prisma')return {prisma:{...tx,$transaction:callback=>callback(tx)}};
  if(request==='@/lib/auth/session')return {getSession:async()=>session};
  if(request==='@/lib/fulfillment/admin-alerts')return {alertOperations:async()=>{}};
  if(request==='@/lib/fulfillment/order-status')return {recalculateMainOrderStatus:async()=>{}};
  if(request==='next/cache')return {revalidatePath:()=>{}};
  if(request==='next/navigation')return {redirect:url=>{const e=new Error('TEST_REDIRECT');e.url=url;throw e;},unstable_rethrow:e=>{if(e.message==='TEST_REDIRECT')throw e;}};
  if(request.startsWith('@/'))request=path.join(process.cwd(),request.slice(2));
  return old.call(this,request,parent,main);
 };
 require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
 try{
 const actions=require('../app/actions/fulfillment.ts');const {submitOrderHandover}=require('../app/actions/vendor-order-workflow.ts');
 const form=(id,method='pickup',confirm=true)=>{const data=new FormData();data.set('splitOrderId',id);data.set('method',method);if(confirm)data.set('confirmed','yes');return data;};
 const physical='orders-preview-split-001',digital='orders-preview-split-002',unpaid='orders-preview-split-012',dropoff='orders-preview-split-011';
 const before=await tx.splitOrder.findUniqueOrThrow({where:{id:physical}});
 assert.ok((await submitOrderHandover({error:''},form(physical,'pickup',false))).error);
 assert.equal((await tx.splitOrder.findUniqueOrThrow({where:{id:physical}})).status,before.status);
 await assert.rejects(()=>actions.chooseCourierPickup(form(unpaid)),/not available/);
 await assert.rejects(()=>actions.startPreparing(form(unpaid)),e=>e.message==='TEST_REDIRECT');
 session={...session,userId:'another-vendor'};
 await assert.rejects(()=>actions.chooseCourierPickup(form(physical)),/not available/);
 await assert.rejects(()=>actions.markDigitalFulfilled(form(digital)),/not available/);
 session={...session,userId:vendor.id};
 await assert.rejects(()=>actions.markDigitalFulfilled(form(physical)),/Physical orders/);
 await assert.rejects(()=>actions.chooseCourierPickup(form(digital)),/Digital orders/);
 console.log('PASS: confirmation required, unpaid orders blocked, other vendors blocked, physical/digital handover cannot be mixed.');
 await assert.rejects(()=>submitOrderHandover({error:''},form(physical)),e=>e.message==='TEST_REDIRECT'&&e.url.endsWith(physical));
 const collected=await tx.splitOrder.findUniqueOrThrow({where:{id:physical}});
 assert.equal(collected.status,'AWAITING_COURIER_PICKUP');
 assert.equal(collected.vendorInboundMethod,'PICKUP_REQUESTED');
 assert.equal(await tx.shipment.count({where:{splitOrderId:physical}}),1);
 assert.equal((await tx.shipment.findFirst({where:{splitOrderId:physical}})).pickupFeeMinor,4000);
 await assert.rejects(()=>actions.chooseCourierPickup(form(physical)),/not available/);
 assert.equal(await tx.shipment.count({where:{splitOrderId:physical}}),1);
 await assert.rejects(()=>actions.chooseVendorDropoff(form(dropoff,'dropoff')),e=>e.message==='TEST_REDIRECT');
 assert.equal((await tx.splitOrder.findUniqueOrThrow({where:{id:dropoff}})).status,'VENDOR_PREPARING');
 assert.equal(await tx.shipment.count({where:{splitOrderId:dropoff}}),0);
 await actions.markDigitalFulfilled(form(digital,'digital'));
 assert.equal((await tx.splitOrder.findUniqueOrThrow({where:{id:digital}})).status,'DELIVERED');
 console.log('PASS: paid collection creates one TTD 40 shipment; duplicate submission blocked; free drop-off and digital fulfilment succeed; redirects preserved.');
 }finally{Module._load=old;}
 throw rollback;
},{timeout:30000});}catch(e){if(e!==rollback)throw e;}
console.log('PASS: all changes rolled back; no payment APIs, customer messages or notifications sent.');
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>real.$disconnect());
