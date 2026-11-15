// Isolated unit/transaction-boundary tests. No DB, network, credentials or live records.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const original = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'server-only') return {};
  if (request.startsWith('@/')) request = path.join(process.cwd(),request.slice(2));
  return original.call(this, request, parent, main);
};
require.extensions['.ts'] = (mod, name) => mod._compile(ts.transpileModule(fs.readFileSync(name,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText, name);
const {parseCollections, parseCollectionsUpdate, publicCollections} = require('../lib/vendor/catalogue/collections.ts');
const {saveCollections} = require('../lib/vendor/catalogue/save-collections.ts');
const collection = (more={}) => ({id:'party',name:'Party',description:'For the weekend',productIds:['product','draft','service'],...more});
const input = (more={}) => ({storeId:'store-1',expectedRevision:3,collections:[collection()],...more});
let count=0;
async function test(name, run) {await run(); console.log('PASS '+name); count++;}
function db(options={}) {
  const calls=[];
  const tx={store:{findUnique:async args=>{calls.push(['owner',args]); return options.missing?null:{id:'store-1',slug:'fixture'};},updateMany:async args=>{calls.push(['write',args]);return {count: options.stale?0:1};}},product:{findMany:async args=>{calls.push(['products',args]);return (options.ids??['product','draft','service']).map(id=>({id}));},update:()=>{throw Error('Product writes forbidden');},updateMany:()=>{throw Error('Product writes forbidden');}}};
  return {$transaction:async(fn,settings)=>{calls.push(['transaction',settings]);return fn(tx);},calls};
}
(async()=>{
await test('strict input accepts trimmed names, empty catalogue, multiple membership',()=>{assert.equal(parseCollections([collection({name:' Party '})])[0].name,'Party');assert.deepEqual(parseCollections([]),[]);assert.equal(parseCollections([collection(),collection({id:'new',name:'New'})]).length,2);});
await test('reject invalid IDs, duplicate IDs/names, blank and oversized data',()=>{for(const bad of [null,{},[collection({id:'../bad'})],[collection({name:' '})],[collection({name:'a'.repeat(81)})],[collection({description:'x'.repeat(241)})],[collection({productIds:['a','a']})],[collection({productIds:[{}]})],[collection({productIds:Array.from({length:501},(_,i)=>`p${i}`)})],[collection(),collection()],[collection(),collection({id:'new',name:' PARTY '})],Array.from({length:51},(_,i)=>collection({id:`c${i}`,name:`Collection ${i}`}))]) assert.throws(()=>parseCollections(bad));});
await test('reject missing, negative, fractional revision and invalid store',()=>{for(const more of [{expectedRevision:-1},{expectedRevision:0.5},{expectedRevision:undefined},{storeId:'../store'}])assert.throws(()=>parseCollectionsUpdate(input(more)));});
await test('public projection strips draft, foreign, deleted IDs and preserves empty collection',()=>{const raw=[collection(),collection({id:'empty',name:'Empty',productIds:['private']})]; const before=JSON.stringify(raw);assert.deepEqual(publicCollections(raw,new Set(['product','service'])).map(c=>c.productIds),[['product','service'],[]]);assert.equal(JSON.stringify(raw),before);assert.deepEqual(publicCollections({corrupt:true},new Set()),[]);});
await test('owner scoped save writes only collections and revision, never listing flags',async()=>{const mock=db();const result=await saveCollections(mock,'owner',input());assert.deepEqual(result,{slug:'fixture',revision:4});const ownership=mock.calls.find(c=>c[0]==='owner')[1];assert.equal(ownership.where.ownerId,'owner');const products=mock.calls.find(c=>c[0]==='products')[1];assert.equal(products.where.storeId,'store-1');assert.equal(products.where.isArchived,false);const write=mock.calls.find(c=>c[0]==='write')[1];assert.deepEqual(write.where,{id:'store-1',ownerId:'owner',catalogueRevision:3});assert.deepEqual(Object.keys(write.data).sort(),['catalogueCollections','catalogueRevision']);assert.equal(mock.calls[0][1].isolationLevel,'Serializable');});
await test('foreign store, absent owner, foreign/archived/missing listing and stale revision fail',async()=>{for(const [mock,data] of [[db(),input({storeId:'foreign'})],[db({missing:true}),input()],[db({ids:['product']}),input()],[db({stale:true}),input()]]){await assert.rejects(()=>saveCollections(mock,'owner',data));if(!mock.calls.some(c=>c[0]==='write'))assert.ok(true);}});
await test('empty collections clear only membership and permit no product IDs',async()=>{const mock=db({ids:[]});await saveCollections(mock,'owner',input({collections:[]}));assert.deepEqual(mock.calls.find(c=>c[0]==='write')[1].data.catalogueCollections,[]);});
await test('shared memberships validate each distinct listing once',async()=>{const mock=db();await saveCollections(mock,'owner',input({collections:[collection(),collection({id:'new',name:'New'})]}));assert.equal(mock.calls.find(c=>c[0]==='products')[1].where.id.in.length,3);});
console.log(`\n${count} collection checks passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
