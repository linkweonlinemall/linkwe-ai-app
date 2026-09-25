const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {couponDiscount,allocateDiscount,discountedUnits,originalCouponSubtotal}=require('../lib/coupons/pricing.ts');
assert.equal(couponDiscount(999,'PERCENT',15),150);assert.equal(couponDiscount(999,'FIXED',1000),999);assert.equal(couponDiscount(999,'PERCENT',100),999);
for(let i=1;i<400;i++){const totals=[i*19+3,i*2+1,i+12];for(const d of [0,1,7,Math.floor(totals[0]/3),totals.reduce((a,b)=>a+b,0)]){const a=allocateDiscount(totals,d);assert.equal(a.reduce((x,y)=>x+y,0),d);a.forEach((v,j)=>assert.ok(v>=0&&v<=totals[j]));}}
for(let qty=1;qty<50;qty++){const rows=discountedUnits(999,qty,123);assert.equal(rows.reduce((a,b)=>a+b.quantity,0),qty);assert.equal(rows.reduce((a,b)=>a+b.priceMinor*b.quantity,0),999*qty-123);assert.ok(rows.length<=2);}
assert.equal(originalCouponSubtotal({subtotalMinor:1234},500),1234);assert.throws(()=>couponDiscount(100,'PERCENT',101));
const {filterCreations,ticketDisplayStatus}=require('../lib/vendor/creation/model.ts');
const rows=[{id:'p',kind:'product',title:'Cocoa care',status:'Draft',archived:false,updatedAt:'2026-01-01',tips:[],price:10},{id:'s',kind:'service',title:'Care service',status:'Published',published:true,archived:false,updatedAt:'2026-01-02',tips:[],price:50},{id:'a',kind:'product',title:'Archived',archived:true,updatedAt:'2026-01-03',tips:[]}];
assert.equal(filterCreations(rows,'all','','all','recent').length,2);assert.equal(filterCreations(rows,'service','care','published','recent')[0].id,'s');assert.equal(filterCreations(rows,'all','','archived','recent')[0].id,'a');assert.equal(ticketDisplayStatus({eventStatus:'DRAFT',eventPublished:false,visible:true,sold:0,quantity:10,end:null,starts:null}),'Event draft');
console.log('PASS: exact-cent allocation, full discounts, grouped quantities, no discount stacking on retries, library filters and ticket status.');
const before=JSON.parse(fs.readFileSync('docs/creation-original-fields.json','utf8'));
const mapping={'services/new/page.tsx':'components/vendor/creation/ServiceCreateForm.tsx','events/new/page.tsx':'components/vendor/creation/EventCreateForm.tsx'};
for(const [file,fields] of Object.entries(before)){const source=fs.readFileSync(mapping[file]??'app/(dashboard)/dashboard/vendor/'+file,'utf8');for(const field of fields)assert.ok(source.includes(`name="${field}"`),`${file} lost ${field}`);}
console.log('PASS: every original named product/service/event/ticket editor field is retained.');
